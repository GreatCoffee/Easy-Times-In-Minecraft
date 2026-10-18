package io.github.etim.etim.mob;

import javax.annotation.Nullable;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.Tags;
import io.github.etim.etim.playerstate.ETIMBedSafety;
import net.minecraft.block.Block;
import net.minecraft.block.BlockFalling;
import net.minecraft.block.BlockMelon;
import net.minecraft.block.BlockPumpkin;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemTool;
import net.minecraft.nbt.NBTBase;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.capabilities.CapabilityInject;
import net.minecraftforge.common.capabilities.CapabilityManager;
import net.minecraftforge.common.capabilities.ICapabilitySerializable;

/**
 * AI-02 — the R196 zombie dig mechanism (mobs-ai verdict 裁 3/4 + 补裁
 * C-9a/C-9b): capability-carried dig state on {@link EntityZombie} plus the
 * verbatim state machine of R196 {@code EntityAnimalWatcher}
 * (EntityAnimalWatcher.java:1-352 — the digger base R196 hangs on the mob
 * class hierarchy; the ETIM host is zombies only, 裁 3, matching the
 * sensor's {@code instanceof EntityZombie} judgement face :1396-1399).
 *
 * <p>Registered mapping notes (verdict裁 4 + 补裁): {@code isFrenzied} is
 * NOT deleted — 补裁 C-9a maps it to the blood-moon night seam ({@code
 * EntityMob.isFrenzied = isBloodMoon(true)}, EntityMob.java:275). Earth
 * Elemental / Bone Lord / Cudgel / Scythe / BlockUnderminable faces are
 * MITE-only and gone. {@code EntityZombie.isDiggingEnabled} (:404-411,
 * C-9a fourth consumer) transposes with {@code is_smart} as the constant
 * false — a blood-moon frenzy short-circuits the tool gate, bare-hand
 * zombies dig on a blood moon,平日 requires a held ItemTool.</p>
 *
 * <p>[SleepLog] rows (verdict §7): {@code bed-dig mob=zombie x,y,z=<block>
 * progress=<p> tick=<t>} on the destroy-progress edge, plus the shipped
 * {@code bed-wake reason=digging} / {@code bed-refuse reason=mobsDigging}
 * faces wired by the callers.</p>
 */
public final class ETIMDigging {

    /** Storage key of the capability on zombie entities. */
    public static final ResourceLocation CAPABILITY_KEY =
            new ResourceLocation(Tags.MOD_ID, "digging");

    @CapabilityInject(IState.class)
    public static Capability<IState> CAPABILITY = null;

    /** Registers the capability storage (call from mod preInit, once). */
    public static void register() {
        CapabilityManager.INSTANCE.register(IState.class, new Capability.IStorage<IState>() {
            @Override
            public NBTBase writeNBT(Capability<IState> capability, IState instance, EnumFacing side) {
                NBTTagCompound tag = new NBTTagCompound();
                tag.setBoolean("is_destroying_block", instance.isDestroyingBlock());
                tag.setInteger("destroy_block_x", instance.getDestroyBlockX());
                tag.setInteger("destroy_block_y", instance.getDestroyBlockY());
                tag.setInteger("destroy_block_z", instance.getDestroyBlockZ());
                tag.setInteger("destroy_block_progress", instance.getDestroyBlockProgress());
                tag.setInteger("destroy_block_cooloff", instance.getDestroyBlockCooloff());
                tag.setInteger("destroy_pause_ticks", instance.getDestroyPauseTicks());
                return tag;
            }

            @Override
            public void readNBT(Capability<IState> capability, IState instance, EnumFacing side, NBTBase nbt) {
                NBTTagCompound tag = (NBTTagCompound) nbt;
                instance.setDestroyingBlock(tag.getBoolean("is_destroying_block"));
                instance.setDestroyBlockX(tag.getInteger("destroy_block_x"));
                instance.setDestroyBlockY(tag.getInteger("destroy_block_y"));
                instance.setDestroyBlockZ(tag.getInteger("destroy_block_z"));
                instance.setDestroyBlockProgress(tag.getInteger("destroy_block_progress"));
                instance.setDestroyBlockCooloff(tag.getInteger("destroy_block_cooloff"));
                instance.setDestroyPauseTicks(tag.getInteger("destroy_pause_ticks"));
            }
        }, State::new);
    }

    @Nullable
    public static IState get(EntityLivingBase e) {
        return CAPABILITY != null && e.hasCapability(CAPABILITY, null)
                ? e.getCapability(CAPABILITY, null) : null;
    }

    /**
     * The R196 digger state (EntityAnimalWatcher.java:4-10). NBT keys are the
     * R196 :325-330 set; dormant state = cooloff 40 / progress -1 (the
     * onUpdate reset face :314-315).
     */
    public interface IState {
        boolean isDestroyingBlock();

        void setDestroyingBlock(boolean value);

        int getDestroyBlockX();

        void setDestroyBlockX(int value);

        int getDestroyBlockY();

        void setDestroyBlockY(int value);

        int getDestroyBlockZ();

        void setDestroyBlockZ(int value);

        int getDestroyBlockProgress();

        void setDestroyBlockProgress(int value);

        int getDestroyBlockCooloff();

        void setDestroyBlockCooloff(int value);

        int getDestroyPauseTicks();

        void setDestroyPauseTicks(int value);
    }

    /** The capability implementation instance. */
    public static final class State implements IState {
        boolean destroyingBlock;
        int destroyBlockX;
        int destroyBlockY;
        int destroyBlockZ;
        int destroyBlockProgress = -1;
        int destroyBlockCooloff = 40;
        int destroyPauseTicks;

        @Override
        public boolean isDestroyingBlock() {
            return this.destroyingBlock;
        }

        @Override
        public void setDestroyingBlock(boolean value) {
            this.destroyingBlock = value;
        }

        @Override
        public int getDestroyBlockX() {
            return this.destroyBlockX;
        }

        @Override
        public void setDestroyBlockX(int value) {
            this.destroyBlockX = value;
        }

        @Override
        public int getDestroyBlockY() {
            return this.destroyBlockY;
        }

        @Override
        public void setDestroyBlockY(int value) {
            this.destroyBlockY = value;
        }

        @Override
        public int getDestroyBlockZ() {
            return this.destroyBlockZ;
        }

        @Override
        public void setDestroyBlockZ(int value) {
            this.destroyBlockZ = value;
        }

        @Override
        public int getDestroyBlockProgress() {
            return this.destroyBlockProgress;
        }

        @Override
        public void setDestroyBlockProgress(int value) {
            this.destroyBlockProgress = value;
        }

        @Override
        public int getDestroyBlockCooloff() {
            return this.destroyBlockCooloff;
        }

        @Override
        public void setDestroyBlockCooloff(int value) {
            this.destroyBlockCooloff = value;
        }

        @Override
        public int getDestroyPauseTicks() {
            return this.destroyPauseTicks;
        }

        @Override
        public void setDestroyPauseTicks(int value) {
            this.destroyPauseTicks = value;
        }
    }

    /** Capability provider attached by ETIMDiggingEvents (livestock precedent). */
    public static final class Provider implements ICapabilitySerializable<NBTBase> {
        private final State state = new State();

        @Override
        public boolean hasCapability(Capability<?> capability, EnumFacing facing) {
            return capability == CAPABILITY;
        }

        @SuppressWarnings("unchecked")
        @Override
        public <T> T getCapability(Capability<T> capability, EnumFacing facing) {
            return capability == CAPABILITY ? (T) state : null;
        }

        @Override
        public NBTBase serializeNBT() {
            NBTTagCompound tag = new NBTTagCompound();
            tag.setBoolean("is_destroying_block", state.destroyingBlock);
            tag.setInteger("destroy_block_x", state.destroyBlockX);
            tag.setInteger("destroy_block_y", state.destroyBlockY);
            tag.setInteger("destroy_block_z", state.destroyBlockZ);
            tag.setInteger("destroy_block_progress", state.destroyBlockProgress);
            tag.setInteger("destroy_block_cooloff", state.destroyBlockCooloff);
            tag.setInteger("destroy_pause_ticks", state.destroyPauseTicks);
            return tag;
        }

        @Override
        public void deserializeNBT(NBTBase nbt) {
            NBTTagCompound tag = (NBTTagCompound) nbt;
            state.destroyingBlock = tag.getBoolean("is_destroying_block");
            state.destroyBlockX = tag.getInteger("destroy_block_x");
            state.destroyBlockY = tag.getInteger("destroy_block_y");
            state.destroyBlockZ = tag.getInteger("destroy_block_z");
            state.destroyBlockProgress = tag.getInteger("destroy_block_progress");
            state.destroyBlockCooloff = tag.getInteger("destroy_block_cooloff");
            state.destroyPauseTicks = tag.getInteger("destroy_pause_ticks");
        }
    }

    /**
     * R196 EntityMob.isFrenzied parity (EntityMob.java:275 {@code
     * isBloodMoon(true)}) mapped by 补裁 C-9a to the moon-backend seam:
     * blood phase AND night (phase respects moonStateOverride, judge face).
     */
    public static boolean isFrenzied(EntityLiving digger) {
        if (digger.world.isRemote) {
            return false;
        }
        WorldServer w = (WorldServer) digger.world;
        return ETIMMoonState.phase(w) == ETIMMoonState.Phase.BLOOD && ETIMMoonState.isNight(w);
    }

    /**
     * R196 EntityZombie.isDiggingEnabled (:404-411) with {@code is_smart} as
     * the constant false (B 级登记): {@code !is_smart && !isFrenzied ? held
     * instanceof ItemTool : true} — a frenzied (blood-moon) zombie digs
     * bare-handed;平日 requires a held ItemTool.
     */
    public static boolean isDiggingEnabled(EntityZombie digger) {
        if (isHoldingItemThatPreventsDigging(digger)) { // R196 EntityZombie:404-411 最外项（狂化+持剑不可挖）
            return false;
        }
        if (isFrenzied(digger)) {
            return true;
        }
        ItemStack held = digger.getHeldItemMainhand();
        return held != null && held.getItem() instanceof ItemTool;
    }

    /**
     * R196 isHoldingItemThatPreventsDigging (:17-19): sword/cudgel/scythe —
     * ETIM maps to ItemSword (MITE-only items do not exist).
     */
    public static boolean isHoldingItemThatPreventsDigging(EntityLiving digger) {
        ItemStack held = digger.getHeldItemMainhand();
        return held != null && held.getItem() instanceof ItemSword;
    }

    /** R196 hasDownwardsDiggingTool (:139-141): ItemShovel → 1.12 ItemSpade. */
    private static boolean hasDownwardsDiggingTool(EntityZombie digger) {
        ItemStack held = digger.getHeldItemMainhand();
        return held != null && held.getItem() instanceof net.minecraft.item.ItemSpade;
    }

    /** R196 getFootBlockPosY (EntityLivingBase.java:2372 {@code floor(posY + 1.0E-4F)}). */
    private static int footBlockPosY(EntityLivingBase e) {
        return MathHelper.floor(e.posY + 1.0E-4F);
    }

    /** R196 getBlockPosX/Y/Z (Entity.java:2638-2648) — the block-coordinate claim face. */
    private static int blockPosX(Entity e) {
        return MathHelper.floor(e.posX);
    }

    private static int blockPosY(Entity e) {
        return MathHelper.floor(e.posY);
    }

    private static int blockPosZ(Entity e) {
        return MathHelper.floor(e.posZ);
    }

    /**
     * R196 canDestroyBlock (:160-229). v1 list-only blacklist (B 级登记:
     * the {@code requiresTool} harvest gate is deferred to v1.5 with the
     * physical-reach line face); the cactus term transposes verbatim
     * ({@code block == cactus && (invuln || undead)} membership — undead
     * mobs cannot chew cacti).
     */
    public static boolean canDestroyBlock(EntityZombie digger, IState s,
            int x, int y, int z, boolean checkClipping) {
        if (isHoldingItemThatPreventsDigging(digger)) { // :161-162
            return false;
        }
        int footY = footBlockPosY(digger);
        if (y < footY && !hasDownwardsDiggingTool(digger)) { // :165-167
            return false;
        }
        if (y > footY + 1) { // :170-171
            return false;
        }
        World world = digger.world;
        // :175-176 — the destroy-center distance² gate
        // (getCenterPosYForBlockDestroying :122).
        double dx = digger.posX - (x + 0.5F);
        double dy = digger.posY + digger.height * 0.5F - (y + 0.5F);
        double dz = digger.posZ - (z + 0.5F);
        if (dx * dx + dy * dy + dz * dz > 3.25D) {
            return false;
        }
        if (checkClipping && reachRayBlocked(world, digger, x, y, z)) { // :179-186 → rayTraceBlocks 变体（C 级）
            return false;
        }
        IBlockState state = world.getBlockState(new BlockPos(x, y, z));
        Block block = state.getBlock();
        if (block == Blocks.AIR || state.getMaterial().isLiquid()) { // :189-196
            return false;
        }
        ItemStack held = digger.getHeldItemMainhand();
        boolean hasEffectiveTool = heldToolEffective(held, state); // R196 :207/:210 反门 → vanilla isToolEffective face
        boolean blacklisted = hasEffectiveTool
                || block == Blocks.SAND || block == Blocks.DIRT || block == Blocks.GRASS
                || block == Blocks.GRAVEL || block == Blocks.SNOW_LAYER || block == Blocks.FARMLAND
                || block == Blocks.CLAY || block == Blocks.LEAVES || block == Blocks.WOOL
                || (block == Blocks.CACTUS && (digger.isEntityInvulnerable(DamageSource.GENERIC) || digger.isEntityUndead()))
                || block == Blocks.SPONGE || block instanceof BlockPumpkin || block instanceof BlockMelon
                || block == Blocks.MYCELIUM || block == Blocks.HAY_BLOCK || block == Blocks.GLASS_PANE;
        return !blacklisted && !isBlockClaimedByAnother(digger, x, y, z); // :208-228
    }

    /**
     * R196 getStrVsBlock(block, metadata) > 0 face → the vanilla
     * tool-class-effective scan (ItemTool has no per-block speed in 1.12).
     */
    public static boolean heldToolEffective(@Nullable ItemStack held, IBlockState state) {
        if (held == null || !(held.getItem() instanceof ItemTool)) {
            return false;
        }
        for (String toolClass : held.getItem().getToolClasses(held)) {
            if (state.getBlock().isToolEffective(toolClass, state)) {
                return true;
            }
        }
        return false;
    }

    /**
     * R196 isBlockClaimedByAnother (:144-158): another digger-family mob
     * within ±4 already destroying the same block (the ETIM family = zombies,
     * 裁 3).
     */
    private static boolean isBlockClaimedByAnother(EntityZombie digger, int x, int y, int z) {
        AxisAlignedBB bb = new AxisAlignedBB(
                digger.posX - 4.0D, digger.posY - 4.0D, digger.posZ - 4.0D,
                digger.posX + 4.0D, digger.posY + 4.0D, digger.posZ + 4.0D);
        for (Entity entity : digger.world.getEntitiesWithinAABBExcludingEntity(digger, bb)) {
            if (entity instanceof EntityZombie) {
                IState other = get((EntityZombie) entity);
                if (other != null && other.isDestroyingBlock()
                        && other.getDestroyBlockX() == x && other.getDestroyBlockY() == y && other.getDestroyBlockZ() == z) {
                    return true; // :151-153
                }
            }
        }
        return false;
    }

    /**
     * R196 setBlockToDig (:231-250) — the state write-in face both the dig
     * AI and the attack-melee dig branch read.
     */
    public static boolean setBlockToDig(EntityZombie digger, IState s,
            int x, int y, int z, boolean checkClipping) {
        if (!canDestroyBlock(digger, s, x, y, z, checkClipping)) { // :232-234
            return false;
        }
        s.setDestroyingBlock(true); // :236
        if (x == s.getDestroyBlockX() && y == s.getDestroyBlockY() && z == s.getDestroyBlockZ()) {
            return true; // :237-239 same-block reuse
        }
        IBlockState state = digger.world.getBlockState(new BlockPos(x, y, z));
        if (y == footBlockPosY(digger) + 1 && state.getBlock() == Blocks.CACTUS
                && canDestroyBlock(digger, s, x, y - 1, z, checkClipping)) {
            y--; // :241-243 cactus foot-face drop
        }
        s.setDestroyBlockProgress(-1); // :245
        s.setDestroyBlockX(x);
        s.setDestroyBlockY(y);
        s.setDestroyBlockZ(z);
        return true;
    }

    /** R196 cancelBlockDestruction (:252-259). */
    public static void cancelBlockDestruction(EntityZombie digger, IState s) {
        if (s.isDestroyingBlock()) {
            digger.world.sendBlockBreakProgress(digger.getEntityId(),
                    new BlockPos(s.getDestroyBlockX(), s.getDestroyBlockY(), s.getDestroyBlockZ()), -1); // :254 → destroy-stage clear
            s.setDestroyingBlock(false);
            s.setDestroyBlockProgress(-1);
            s.setDestroyBlockCooloff(40);
        }
    }

    /**
     * R196 getCooloffForBlock (:261-301): {@code 300.0F * blockHardness}
     * (:267), frenzy halves it (:268-270), a held ItemTool divides by
     * {@code 1 + strVsBlock * 0.5} (:288-298); an air block keeps the 40
     * default. Shared by the dig task.
     */
    public static int sharedCooloffForBlock(EntityZombie digger, IState s) {
        BlockPos pos = new BlockPos(s.getDestroyBlockX(), s.getDestroyBlockY(), s.getDestroyBlockZ());
        IBlockState state = digger.world.getBlockState(pos);
        Block block = state.getBlock();
        if (block == Blocks.AIR) {
            return 40; // :263-265
        }
        int cooloff = (int) (300.0F * state.getBlockHardness(digger.world, pos)); // :267
        if (isFrenzied(digger)) {
            cooloff /= 2; // :268-270
        }
        ItemStack held = digger.getHeldItemMainhand();
        if (held != null && held.getItem() instanceof ItemTool) {
            float str = heldToolEffective(held, state) ? ((ItemTool) held.getItem()).getDestroySpeed(held, state) : 0.0F;
            if (str > 0.0F) {
                cooloff = (int) (cooloff / (1.0F + str * 0.5F)); // :288-298
            }
        }
        return cooloff;
    }

    /**
     * R196 partiallyDestroyBlock (:31-119): one strike — the 10-tick destroy
     * progress, the break face (entity-harvested drop + air), the continue
     * scan (falling above / y-walk), the destroy-stage packet and the break
     * sound. Registered C 级 skips: the cactus hand-damage branch (its guard
     * method is MITE-only and unarchived), the nearby attack-task
     * suppression write (an EntityAIAttackOnCollide field face the 1.12
     * task storage does not expose; falling physics run vanilla-native per
     * 裁 4), and the {@code BlockUnderminable.tryToFall} ride-along (the
     * 1.12 falling chain covers the face, 补裁注册).
     */
    public static void partiallyDestroyBlock(EntityZombie digger, IState s) {
        int x = s.getDestroyBlockX();
        int y = s.getDestroyBlockY();
        int z = s.getDestroyBlockZ();
        if (!canDestroyBlock(digger, s, x, y, z, true)) { // :35-36
            cancelBlockDestruction(digger, s);
            return;
        }
        ((io.github.etim.etim.mixins.EntityLivingBaseAccessor) digger).etim$setIdleTime(-400); // :38 refreshDespawnCounter(-400)
        World world = digger.world;
        BlockPos pos = new BlockPos(x, y, z);
        IBlockState state = world.getBlockState(pos);
        Block block = state.getBlock();
        s.setDestroyBlockProgress(s.getDestroyBlockProgress() + 1);
        // [SleepLog] bed-dig — the destroy-progress edge row (AI-02 verdict §7:
        // one per strike; progress reads 1..9 while digging, 10 on the break
        // strike before the -1 reset). Covers both the dig-task strikes and
        // the attack-melee dig branch (both funnel through this strike).
        ETIM.LOGGER.info("[SleepLog] bed-dig mob=" + digger.getClass().getSimpleName()
                + " x,y,z=" + x + "," + y + "," + z
                + " progress=" + s.getDestroyBlockProgress()
                + " tick=" + world.getWorldInfo().getWorldTotalTime());
        if (s.getDestroyBlockProgress() < 10) { // :45-46
            s.setDestroyingBlock(true);
        } else {
            s.setDestroyBlockProgress(-1); // :48
            if (state.getMaterial() == Material.GLASS) { // :49-51 — glass drops with the aux face below, no extra
                world.playEvent(2001, pos, Block.getStateId(state));
            }
            block.dropBlockAsItem(world, pos, state, 0); // :53-54 entity-harvested drop (BlockBreakInfo → fortune-0 face)
            world.setBlockToAir(pos); // :55
            ItemStack held = digger.getHeldItemMainhand();
            if (held != null) { // :73-76
                held.getItem().onBlockDestroyed(held, world, state, pos, digger);
            }
            s.setDestroyingBlock(false); // :78
            // :79-98 — the continue scan: dig the block above when it can
            // fall or stands on the just-opened face.
            BlockPos above = new BlockPos(x, y + 1, z);
            IBlockState aboveState = world.getBlockState(above);
            Block blockAbove = aboveState.getBlock();
            if (blockAbove instanceof BlockFalling) { // :80-82
                s.setDestroyingBlock(true);
                s.setDestroyPauseTicks(10);
            } else if (!blockWillFall(blockAbove)) { // :83 (1.12 states are never null; air above = keep walking)
                if (y == footBlockPosY(digger) && canDestroyBlock(digger, s, x, y + 1, z, true)) {
                    s.setDestroyBlockY(y + 1); // :84-85
                } else {
                    s.setDestroyBlockY(y - 1); // :87
                }
                s.setDestroyingBlock(true);
                s.setDestroyPauseTicks(10);
            } else if (y == footBlockPosY(digger) + 1
                    && !ETIMBedSafety.isAirOrPassableBlock(world, blockPosX(digger), blockPosY(digger) + 2, blockPosZ(digger), false)
                    && canDestroyBlock(digger, s, x, y - 1, z, true)) { // :92-94
                s.setDestroyingBlock(true);
                s.setDestroyPauseTicks(10);
                s.setDestroyBlockY(y - 1);
            }
        }
        // :105 — the destroy-stage packet (vanilla sendBlockBreakProgress face).
        world.sendBlockBreakProgress(digger.getEntityId(), new BlockPos(x, y, z), s.getDestroyBlockProgress());
        if (state.getMaterial() == Material.GLASS) { // :106-115 — glass面只出声效（2001 仅 break 拍 :49-51 一次）
            net.minecraft.block.SoundType sound = state.getBlock().getSoundType(state, world, pos, digger);
            world.playSound((EntityPlayer) null, x + 0.5F, y + 0.5F, z + 0.5F, sound.getPlaceSound(),
                    SoundCategory.BLOCKS, sound.getVolume() + 2.0F, sound.getPitch());
        } else {
            world.playEvent(2001, pos, Block.getStateId(state)); // :116 (R196 formula blockID + meta<<12 → state-id face)
        }
    }

    /** R196 blockWillFall (:26-29): falling/cactus/torch/thin-snow blocks. */
    private static boolean blockWillFall(Block block) {
        return block instanceof BlockFalling || block == Blocks.CACTUS
                || block instanceof net.minecraft.block.BlockTorch || block == Blocks.SNOW_LAYER;
    }

    /**
     * R196 :179-186 double-reach clipping — ray from the destroy eye and the
     * leg face; blocked when a ray hits anything but the target block
     * (rayTraceBlocks 变体, C 级).
     */
    private static boolean reachRayBlocked(World world, EntityZombie digger, int x, int y, int z) {
        Vec3d center = new Vec3d(x + 0.5F, y + 0.5F, z + 0.5F);
        Vec3d eye = new Vec3d(digger.posX, digger.posY + digger.height * 0.75F, digger.posZ); // getEyePosForBlockDestroying → getPrimaryPointOfAttack（非玩家 0.75）
        Vec3d leg = new Vec3d(digger.posX, digger.posY + digger.height * 0.25F, digger.posZ); // getAttackerLegPosForBlockDestroying
        return rayHitsOther(world, eye, center, x, y, z) && rayHitsOther(world, leg, center, x, y, z);
    }

    /**
     * R196 :180-185 — one reach ray; the ray may hit the target block
     * itself, or an entity, and still allow the dig.
     */
    private static boolean rayHitsOther(World world, Vec3d from, Vec3d to, int tx, int ty, int tz) {
        RayTraceResult hit = world.rayTraceBlocks(from, to, false, true, false);
        if (hit == null || hit.typeOfHit == RayTraceResult.Type.MISS) {
            return false;
        }
        BlockPos pos = hit.getBlockPos();
        return pos.getX() != tx || pos.getY() != ty || pos.getZ() != tz;
    }

    /** R196 isHostileEntityDiggingNearBed (EntityPlayer.java:1386-1405) — the three-gate sensor face. */
    public static boolean isHostileEntityDiggingNearBed(World world, BlockPos bed) {
        AxisAlignedBB aabb = new AxisAlignedBB(
                bed.getX() - 8.0D, bed.getY() - 5.0D, bed.getZ() - 8.0D,
                bed.getX() + 8.0D, bed.getY() + 5.0D, bed.getZ() + 8.0D); // :1387-1390
        for (EntityLiving entity : world.getEntitiesWithinAABB(EntityLiving.class, aabb)) {
            if (entity instanceof EntityZombie) {
                IState s = get(entity);
                if (s != null && s.isDestroyingBlock()) { // :1396-1399
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * R196 EntityAnimalWatcher.onUpdate face (:303-319), zombie-hosted: keep
     * facing the block and re-admit the destruction while digging; reset the
     * dormant markers otherwise.
     */
    public static void tickDigger(EntityZombie digger) {
        if (digger.world.isRemote || !io.github.etim.etim.ETIMConfig.zombieDigAI) {
            return;
        }
        IState s = get(digger);
        if (s == null) {
            return;
        }
        if (s.isDestroyingBlock()) {
            if (s.getDestroyPauseTicks() == 0) {
                digger.getLookHelper().setLookPosition(
                        s.getDestroyBlockX() + 0.5F, s.getDestroyBlockY() + 0.5F, s.getDestroyBlockZ() + 0.5F,
                        10.0F, digger.getVerticalFaceSpeed()); // :307-308
                if (!canDestroyBlock(digger, s, s.getDestroyBlockX(), s.getDestroyBlockY(), s.getDestroyBlockZ(), true)) {
                    cancelBlockDestruction(digger, s); // :309-311
                }
            }
        } else {
            s.setDestroyBlockCooloff(40); // :314
            s.setDestroyBlockProgress(-1); // :315
        }
    }

    /** R196 onDeath face (:348-351) — wired by ETIMDiggingEvents. */
    public static void onDiggerDeath(EntityZombie digger) {
        IState s = get(digger);
        if (s != null) {
            cancelBlockDestruction(digger, s);
        }
    }
}
