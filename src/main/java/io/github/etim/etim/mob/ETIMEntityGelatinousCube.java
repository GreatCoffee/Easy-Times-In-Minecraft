package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.network.datasync.DataParameter;
import net.minecraft.network.datasync.DataSerializers;
import net.minecraft.network.datasync.EntityDataManager;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EntityDamageSource;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * B-57 — the R196 {@code EntityGelatinousCube} dissolve protocol
 * (EntityGelatinousCube.java:1-486), re-expressed for 1.12.
 *
 * <p>Faces judged here: the {@code dissolving_blocks_info} table (64 slots,
 * six fields each: block id, dimension, x, y, z, progress), the twenty-tick
 * dissolve tick (progress += size, destroy at the block's period), the
 * out-of-range {@code extended_dissolving_blocks_info} list with its 16-block
 * prune, instant dissolves on collided blocks, block/item feeding counters,
 * the item-eaten branch (bucket handling, {@code getDamageTypeVsItems}), and
 * the acidic contact pass over the blocks below.</p>
 */
public abstract class ETIMEntityGelatinousCube extends ETIMEntityCubic {

    private static final DataParameter<Boolean> FEEDING =
            EntityDataManager.createKey(ETIMEntityGelatinousCube.class, DataSerializers.BOOLEAN);

    /** R196 {@code DISSOLVING_BLOCK_FIELDS}. */
    private static final int DISSOLVING_BLOCK_FIELDS = 6;
    /** R196 {@code MAX_NUM_DISSOLVING_BLOCKS}. */
    private static final int MAX_NUM_DISSOLVING_BLOCKS = 64;
    /** R196 prune radius squared for the extended list. */
    private static final double EXTENDED_PRUNE_DISTANCE_SQ = 256.0D;

    private final List<DissolveEntry> occupiedEntries = new ArrayList<DissolveEntry>();
    private final List<DissolveEntry> extendedEntries = new ArrayList<DissolveEntry>();

    private int blockFeedingCountdown;
    private int itemFeedingCountdown;
    private int ticksUntilNextFizzSound;

    public ETIMEntityGelatinousCube(World worldIn) {
        super(worldIn);
    }

    @Override
    protected void entityInit() {
        super.entityInit();
        this.dataManager.register(FEEDING, Boolean.FALSE);
    }

    /** R196 {@code getDissolvePeriod} family selector. */
    protected abstract ETIMBlockDissolve.Kind getDissolveKind();

    /** R196 {@code getDamageTypeVsItems()}. */
    protected String getDamageTypeVsItems() {
        return "etim.gel";
    }

    public boolean isFeeding() {
        return this.dataManager.get(FEEDING);
    }

    private void setIsFeeding(boolean feeding) {
        this.dataManager.set(FEEDING, feeding);
    }

    private int getBlockFeedingCountdown() {
        return this.blockFeedingCountdown;
    }

    /** Probe accessor (B-57 W-window): feeding counters and table depth. */
    public int etimBlockFeedCounter() {
        return this.blockFeedingCountdown;
    }

    public int etimItemFeedCounter() {
        return this.itemFeedingCountdown;
    }

    public int etimDissolvingEntryCount() {
        return this.occupiedEntries.size() + this.extendedEntries.size();
    }

    public int etimDissolveSlotProgress() {
        return this.occupiedEntries.isEmpty() ? 0 : this.occupiedEntries.get(0).progress;
    }

    public int etimDissolveSlotPeriod() {
        return this.occupiedEntries.isEmpty() ? 0 : this.occupiedEntries.get(0).period;
    }

    private void setBlockFeedingCountdown(int value) {
        this.blockFeedingCountdown = MathHelper.clamp(value, 0, 20);
        this.setIsFeeding(this.blockFeedingCountdown > 0 || this.itemFeedingCountdown > 0);
    }

    private int getItemFeedingCountdown() {
        return this.itemFeedingCountdown;
    }

    private void setItemFeedingCountdown(int value) {
        this.itemFeedingCountdown = MathHelper.clamp(value, 0, 20);
        this.setIsFeeding(this.blockFeedingCountdown > 0 || this.itemFeedingCountdown > 0);
    }

    /** R196 {@code getDissolvePeriod(block,x,y,z)} in progress units (ticks / 20). */
    private int dissolvePeriod(IBlockState state) {
        int ticks = ETIMBlockDissolve.period(state, this.getDissolveKind());
        return ticks >= 0 ? ticks / 20 : -1;
    }

    protected boolean dissolvesBlockInstantly(IBlockState state) {
        return ETIMBlockDissolve.period(state, this.getDissolveKind()) == ETIMBlockDissolve.INSTANT;
    }

    /** R196 {@code getBlocksOccupiedWithStandardExpansion()}. */
    private List<BlockPos> getBlocksOccupied() {
        AxisAlignedBB box = this.getEntityBoundingBox().grow(0.01D, 0.01D, 0.01D);
        List<BlockPos> out = new ArrayList<BlockPos>();
        for (int x = MathHelper.floor(box.minX); x <= MathHelper.floor(box.maxX); x++) {
            for (int y = MathHelper.floor(box.minY); y <= MathHelper.floor(box.maxY); y++) {
                for (int z = MathHelper.floor(box.minZ); z <= MathHelper.floor(box.maxZ); z++) {
                    BlockPos pos = new BlockPos(x, y, z);
                    IBlockState occupied = this.world.getBlockState(pos);
                    if (!occupied.getMaterial().isLiquid() && !occupied.getBlock().isAir(occupied, this.world, pos)
                            && ETIMBlockDissolve.intersects(this.world, pos, box)) {
                        out.add(pos);
                    }
                }
            }
        }
        return out;
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (this.world.isRemote) {
            this.clientFizz();
            return;
        }
        this.fizz();
        if (ETIMConfig.mobDebugLog && this.ticksExisted % 40 == 0) {
            List<BlockPos> occ = this.getBlocksOccupied();
            AxisAlignedBB bb = this.getEntityBoundingBox();
            BlockPos below = new BlockPos(this.posX, this.posY - 0.5D, this.posZ);
            IBlockState st = this.world.getBlockState(below);
            ETIM.LOGGER.info("[GelLog] scan n={} first={} hp={}/{} size={} kind={} blockCd={} itemCd={} entity={} bb=({},{},{})-({},{},{}) below={} mat={} bounds={}",
                    occ.size(), occ.isEmpty() ? "none" : occ.get(0), this.getHealth(), this.getMaxHealth(),
                    this.getCubicSize(), this.getDissolveKind(), this.blockFeedingCountdown,
                    this.itemFeedingCountdown, this.getEntityId(),
                    bb.minX, bb.minY, bb.minZ, bb.maxX, bb.maxY, bb.maxZ,
                    below, st.getMaterial(), st.getBoundingBox(this.world, below));
        }
        this.tickDissolvingBlocks();
        if (this.isAcidic()) {
            this.tickAcidContact();
        }
    }

    /** R196 {@code updateEntityActionState} dissolve probe (:122-147). */
    private void tickAcidContact() {
        for (BlockPos pos : this.getBlocksOccupied()) {
            IBlockState state = this.world.getBlockState(pos);
            int period = this.dissolvePeriod(state);
            if (period == 0) {
                if (state.getMaterial().blocksMovement()) {
                    this.world.destroyBlock(pos, false);
                    ETIMBlockDissolve.steam(this.world, pos, true);
                    this.log("instant", pos, state.getBlock());
                } else {
                    this.onCollidedWithBlock(pos);
                }
                continue;
            }
            if (period > 0) {
                if (this.blockFeedingCountdown <= 0) {
                    this.setBlockFeedingCountdown(20);
                }
                this.onCollidedWithBlock(pos);
                break;
            }
            this.onCollidedWithBlock(pos);
        }
    }

    /** R196 {@code onCollidedWithBlock} (:150-170). */
    private void onCollidedWithBlock(BlockPos pos) {
        if (this.world.isRemote) {
            return;
        }
        IBlockState state = this.world.getBlockState(pos);
        Block block = state.getBlock();
        if (block == Blocks.TORCH || block == Blocks.FIRE) {
            this.world.setBlockToAir(pos);
            this.setFire(1);
            this.log("torch", pos, block);
            return;
        }
        if (this.dissolvesBlockInstantly(state)) {
            this.world.setBlockToAir(pos);
            this.log("instant", pos, block);
        }
    }

    /** R196 twenty-tick pass (:333-420). */
    private void tickDissolvingBlocks() {
        this.blockFeedingCountdown--;
        this.itemFeedingCountdown--;
        if (this.blockFeedingCountdown > 0 || this.itemFeedingCountdown > 0) {
            if (this.blockFeedingCountdown <= 0) {
                this.setBlockFeedingCountdown(0);
            }
            return;
        }
        this.setBlockFeedingCountdown(0);

        boolean clearCounter = true;
        List<BlockPos> occupied = this.getBlocksOccupied();
        if (ETIMConfig.mobDebugLog && !occupied.isEmpty() && this.ticksExisted % 20 == 0) {
            ETIM.LOGGER.info("[GelLog] occupy n={} first={} size={} kind={} entity={}",
                    occupied.size(), occupied.get(0), this.getCubicSize(), this.getDissolveKind(), this.getEntityId());
        }
        this.pruneEntries(occupied);

        for (BlockPos pos : occupied) {
            IBlockState state = this.world.getBlockState(pos);
            int period = this.dissolvePeriod(state);
            DissolveEntry entry = this.findEntry(pos);
            if (period < 1) {
                if (entry != null) {
                    this.removeEntry(entry);
                }
                continue;
            }
            if (entry == null) {
                entry = new DissolveEntry(this.world.provider.getDimension(), pos, period, state);
                DissolveEntry extended = this.takeExtended(pos);
                if (extended != null) {
                    entry.progress = extended.progress;
                }
                if (this.occupiedEntries.size() < MAX_NUM_DISSOLVING_BLOCKS) {
                    this.occupiedEntries.add(entry);
                } else {
                    this.extendedEntries.add(entry);
                }
            }
            entry.period = period;
            entry.progress += this.getCubicSize();
            if (entry.progress >= entry.period) {
                this.world.destroyBlock(pos, false);
                ETIMBlockDissolve.steam(this.world, pos, true);
                this.removeEntry(entry);
                this.log("melt", pos, state.getBlock());
            } else {
                ETIMBlockDissolve.steam(this.world, pos, false);
                clearCounter = false;
            }
        }
        this.setBlockFeedingCountdown(clearCounter ? 0 : 20);
    }

    private void pruneEntries(List<BlockPos> occupied) {
        Iterator<DissolveEntry> it = this.occupiedEntries.iterator();
        while (it.hasNext()) {
            DissolveEntry entry = it.next();
            if (entry.dimension != this.world.provider.getDimension()) {
                it.remove();
                continue;
            }
            if (!occupied.contains(entry.pos)) {
                it.remove();
                this.extendedEntries.add(entry);
                continue;
            }
            if (entry.blockState != null && this.world.getBlockState(entry.pos).getBlock() != entry.blockState.getBlock()) {
                it.remove();
            }
        }
        Iterator<DissolveEntry> ext = this.extendedEntries.iterator();
        while (ext.hasNext()) {
            DissolveEntry entry = ext.next();
            if (entry.dimension != this.world.provider.getDimension()
                    || entry.pos.distanceSq(this.getPosition()) >= EXTENDED_PRUNE_DISTANCE_SQ
                    || (entry.blockState != null && this.world.getBlockState(entry.pos).getBlock() != entry.blockState.getBlock())) {
                ext.remove();
            }
        }
    }

    private DissolveEntry findEntry(BlockPos pos) {
        for (DissolveEntry entry : this.occupiedEntries) {
            if (entry.pos.equals(pos)) {
                return entry;
            }
        }
        for (DissolveEntry entry : this.extendedEntries) {
            if (entry.pos.equals(pos)) {
                this.extendedEntries.remove(entry);
                this.occupiedEntries.add(entry);
                return entry;
            }
        }
        return null;
    }

    private void removeEntry(DissolveEntry entry) {
        this.occupiedEntries.remove(entry);
        this.extendedEntries.remove(entry);
    }

    private DissolveEntry takeExtended(BlockPos pos) {
        for (DissolveEntry entry : this.extendedEntries) {
            if (entry.pos.equals(pos)) {
                this.extendedEntries.remove(entry);
                return entry;
            }
        }
        return null;
    }

    /** R196 item eating (:384-419). */
    private void eatItems() {
        List<EntityItem> items = this.world.getEntitiesWithinAABB(EntityItem.class, this.getEntityBoundingBox());
        if (ETIMConfig.mobDebugLog && !items.isEmpty()) {
            ETIM.LOGGER.info("[GelLog] itemscan n={} entity={}", items.size(), this.getEntityId());
        }
        for (EntityItem item : items) {
            item.setPickupDelay(60);
            ItemStack stack = item.getItem();
            if (this.isAcidic() && !stack.isEmpty() && stack.getItem() == Items.LAVA_BUCKET) {
                this.attackEntityFrom(DamageSource.LAVA, 5.0F);
                item.setItem(new ItemStack(Blocks.STONE));
                this.log("bucket", item.getPosition(), Blocks.STONE);
                continue;
            }
            if (this.isAcidic() && !stack.isEmpty() && stack.getItem() == Items.WATER_BUCKET) {
                item.setItem(new ItemStack(Items.BUCKET));
                this.log("bucket", item.getPosition(), Blocks.AIR);
                continue;
            }
            item.attackEntityFrom(new EntityDamageSource(this.getDamageTypeVsItems(), this), 1.0F);
            if (item.isDead) {
                this.log("itemkill", item.getPosition(), Blocks.AIR);
            } else {
                item.setAgeToCreativeDespawnTime();
                this.setItemFeedingCountdown(20);
                this.log("item", item.getPosition(), Blocks.AIR);
            }
        }
    }

    /** R196 {@code }岩浆 contact (:306-318) and the fizz sound. */
    private void fizz() {
        if (this.ticksUntilNextFizzSound-- > 0) {
            return;
        }
        this.ticksUntilNextFizzSound = this.rand.nextInt(7) + 2;
        if (this.isInLava()) {
            this.world.playSound(null, this.posX, this.posY, this.posZ, SoundEvents.BLOCK_LAVA_EXTINGUISH,
                    SoundCategory.HOSTILE, 0.2F, 2.6F + (this.rand.nextFloat() - this.rand.nextFloat()) * 0.8F);
        }
    }

    private void clientFizz() {
        if (this.isFeeding() && this.world.rand.nextInt(4) == 0) {
            this.world.spawnParticle(net.minecraft.util.EnumParticleTypes.SMOKE_NORMAL,
                    this.posX + (this.rand.nextDouble() - 0.5D) * (double) this.width,
                    this.posY + this.rand.nextDouble() * (double) this.height,
                    this.posZ + (this.rand.nextDouble() - 0.5D) * (double) this.width,
                    0.0D, 0.0D, 0.0D);
        }
    }

    /** R196 melee hit on the player: the held item takes the dissolve damage. */
    @Override
    public boolean attackEntityAsMob(Entity target) {
        boolean hit = super.attackEntityAsMob(target);
        if (hit && target instanceof EntityPlayer) {
            EntityPlayer player = (EntityPlayer) target;
            ItemStack held = player.getHeldItemMainhand();
            if (!held.isEmpty()) {
                player.inventory.decrStackSize(player.inventory.currentItem, 1);
                this.log("melee-item", player.getPosition(), Blocks.AIR);
                this.world.playSound(null, this.posX, this.posY, this.posZ, SoundEvents.BLOCK_LAVA_EXTINGUISH,
                        SoundCategory.HOSTILE, 0.5F, 1.0F);
            }
            if (this.slowsPlayerOnContact()) {
                player.getEntityData().setBoolean("etim$collidedGelatinousCube", true);
            }
        }
        return hit;
    }

    /** R196 {@code slowsPlayerOnContact()} — blob only. */
    protected boolean slowsPlayerOnContact() {
        return false;
    }

    /** R196 isImmuneTo plus the arrow branch (:439-450). */
    @Override
    public void onDeath(DamageSource cause) {
        super.onDeath(cause);
        ETIM.LOGGER.info("[GelLog] death cause={} cls={} size={} pos=({},{},{}) entity={}",
                cause.getDamageType(), this.getClass().getSimpleName(), this.getCubicSize(),
                this.posX, this.posY, this.posZ, this.getEntityId());
    }

    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        if (this.isImmuneToSource(source)) {
            if (this.isAcidic()
                    && source.getImmediateSource() instanceof net.minecraft.entity.projectile.EntityArrow) {
                this.world.playSound(null, this.posX, this.posY, this.posZ, SoundEvents.BLOCK_LAVA_EXTINGUISH,
                        SoundCategory.HOSTILE, 0.4F, 1.4F);
            }
            return false;
        }
        return super.attackEntityFrom(source, amount);
    }

    protected boolean isImmuneToSource(DamageSource source) {
        return false;
    }


    @Override
    protected net.minecraft.util.ResourceLocation getLootTable() {
        // B-58 (W4): 1.12 skips dropFewItems entirely when a loot table is set
        // (EntityLivingBase.dropLoot). R196 EntityGelatinousCube.java:452-455 drops
        // the sphere from dropFewItems, so null is the faithful face here — same
        // precedent as ETIMEntityLongdead.java:134-136 (B-13).
        return null;
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound compound) {
        super.writeEntityToNBT(compound);
        int[] flat = new int[(this.occupiedEntries.size() + this.extendedEntries.size()) * DISSOLVING_BLOCK_FIELDS];
        int i = 0;
        for (DissolveEntry entry : this.occupiedEntries) {
            i = entry.write(flat, i);
        }
        for (DissolveEntry entry : this.extendedEntries) {
            i = entry.write(flat, i);
        }
        compound.setIntArray("dissolving_blocks_info", flat);
        compound.setInteger("extended_dissolving_blocks_info", this.extendedEntries.size());
        compound.setInteger("block_feeding_countdown", this.blockFeedingCountdown);
        compound.setInteger("item_feeding_countdown", this.itemFeedingCountdown);
    }

    @Override
    public void readEntityFromNBT(NBTTagCompound compound) {
        super.readEntityFromNBT(compound);
        int[] flat = compound.getIntArray("dissolving_blocks_info");
        this.occupiedEntries.clear();
        this.extendedEntries.clear();
        for (int i = 0; i + DISSOLVING_BLOCK_FIELDS <= flat.length; i += DISSOLVING_BLOCK_FIELDS) {
            DissolveEntry entry = DissolveEntry.read(flat, i);
            if (entry != null) {
                this.occupiedEntries.add(entry);
            }
        }
        this.setBlockFeedingCountdown(compound.getInteger("block_feeding_countdown"));
        this.setItemFeedingCountdown(compound.getInteger("item_feeding_countdown"));
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[GelLog] nbtread entries={} progress={} blockCd={} entity={}",
                    this.occupiedEntries.size(), this.etimDissolveSlotProgress(), this.blockFeedingCountdown, this.getEntityId());
        }
    }

    /** R196 gels sit inside the blocks they dissolve; 1.12 suffocation must not apply. */
    @Override
    public boolean isEntityInsideOpaqueBlock() {
        return false;
    }

    @Override
    public void onUpdate() {
        super.onUpdate();
        if (!this.world.isRemote) {
            this.eatItems();
        }
    }

    private void log(String phase, BlockPos pos, Block block) {
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[GelLog] {} at ({},{},{}) block={} size={} kind={} entity={}",
                    phase, pos.getX(), pos.getY(), pos.getZ(), block.getRegistryName(),
                    this.getCubicSize(), this.getDissolveKind(), this.getEntityId());
        }
    }

    private static final class DissolveEntry {
        int dimension;
        BlockPos pos;
        IBlockState blockState;
        int progress;
        int period;

        DissolveEntry(int dimension, BlockPos pos, int period, IBlockState state) {
            this.dimension = dimension;
            this.pos = pos;
            this.period = period;
            this.blockState = state;
        }

        int write(int[] flat, int i) {
            flat[i] = 0;
            flat[i + 1] = this.dimension;
            flat[i + 2] = this.pos.getX();
            flat[i + 3] = this.pos.getY();
            flat[i + 4] = this.pos.getZ();
            flat[i + 5] = this.progress;
            return i + DISSOLVING_BLOCK_FIELDS;
        }

        static DissolveEntry read(int[] flat, int i) {
            int dim = flat[i + 1];
            BlockPos pos = new BlockPos(flat[i + 2], flat[i + 3], flat[i + 4]);
            DissolveEntry entry = new DissolveEntry(dim, pos, 0, net.minecraft.init.Blocks.AIR.getDefaultState());
            entry.progress = flat[i + 5];
            return entry;
        }
    }
}
