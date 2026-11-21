package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMNaturalDefense;

import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.EnumCreatureAttribute;
import net.minecraft.entity.IEntityLivingData;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.EntityAIHurtByTarget;
import net.minecraft.entity.ai.EntityAILookIdle;
import net.minecraft.entity.ai.EntityAIMoveTowardsRestriction;
import net.minecraft.entity.ai.EntityAINearestAttackableTarget;
import net.minecraft.entity.ai.EntityAISwimming;
import net.minecraft.entity.ai.EntityAIWanderAvoidWater;
import net.minecraft.entity.ai.EntityAIWatchClosest;
import net.minecraft.entity.monster.EntityMob;
import net.minecraft.entity.passive.EntityVillager;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.network.datasync.DataParameter;
import net.minecraft.network.datasync.DataSerializers;
import net.minecraft.network.datasync.EntityDataManager;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumHand;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.DifficultyInstance;
import net.minecraft.world.World;

import java.util.Locale;

/**
 * B-62 — R196 {@code EntityEarthElemental.java} (381 lines).
 *
 * <p>Material/heat carrier: ten visual types (stone/obsidian/netherrack/end
 * stone/clay × normal/magma), a server-only {@code heat} 0..1000 rail that
 * turns the body into magma at 100 (lava/fire brand, magma bite), cools in
 * water/rain/cold and quenches on snowballs. Natural defense 4.0F rides the
 * AD-6 channel ({@link ETIMNaturalDefense}); the R196 immunity table
 * (explosion / fall / iron-golem melee / effective tool only) is enforced in
 * {@link #attackEntityFrom}.</p>
 *
 * <p>Task rows (R196 ctor): 0 swim, 1 break-door, 2 melee(Player),
 * 3 melee(Villager), 4 move-towards-restriction, 6 wander, 7 watch/look;
 * targets 1 hurt-by, 2 nearest player, 2 nearest villager. 1.12 merges the
 * two collide rows into one {@link net.minecraft.entity.ai.EntityAIAttackMelee}
 * (same reading as C-B59-10).</p>
 */
public class ETIMEntityEarthElemental extends EntityMob implements ETIMNaturalDefense {

    // R196 type table (:5-20). Magma is the normal value | 1 (R196 | 256).
    public static final int STONE_NORMAL = 0;
    public static final int STONE_MAGMA = 1;
    public static final int OBSIDIAN_NORMAL = 2;
    public static final int OBSIDIAN_MAGMA = 3;
    public static final int NETHERRACK_NORMAL = 4;
    public static final int NETHERRACK_MAGMA = 5;
    public static final int END_STONE_NORMAL = 6;
    public static final int END_STONE_MAGMA = 7;
    public static final int CLAY_NORMAL = 8;
    public static final int CLAY_HARDENED = 9;

    private static final DataParameter<Byte> TYPE =
            EntityDataManager.createKey(ETIMEntityEarthElemental.class, DataSerializers.BYTE);

    /** R196 :13 — server-only heat rail. */
    protected int heat;
    /** R196 :15 — rain fizz cadence. */
    private int ticksUntilNextFizzSound;

    public ETIMEntityEarthElemental(World world) {
        super(world);
        this.experienceValue = 15; // R196 getExperienceValue() = super * 3 (base 5)
        this.tasks.addTask(0, new EntityAISwimming(this));
        this.tasks.addTask(1, new ETIMEntityAIBreakDoor(this)); // R196 navigator.setBreakDoors(true) + :95-103
        this.tasks.addTask(2, new net.minecraft.entity.ai.EntityAIAttackMelee(this, 1.0D, true));
        this.tasks.addTask(4, new EntityAIMoveTowardsRestriction(this, 1.0D));
        this.tasks.addTask(6, new EntityAIWanderAvoidWater(this, 1.0D));
        this.tasks.addTask(7, new EntityAIWatchClosest(this, EntityPlayer.class, 8.0F));
        this.tasks.addTask(7, new EntityAILookIdle(this));
        this.targetTasks.addTask(1, new EntityAIHurtByTarget(this, true));
        this.targetTasks.addTask(2,
                new EntityAINearestAttackableTarget<>(this, EntityPlayer.class, 0, true, false, null));
        this.targetTasks.addTask(2,
                new EntityAINearestAttackableTarget<>(this, EntityVillager.class, 0, false, false, null));
    }

    @Override
    protected void entityInit() {
        super.entityInit();
        this.dataManager.register(TYPE, (byte) STONE_NORMAL);
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(20.0D); // :40-47
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.2D);
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(12.0D);
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(30.0D);
    }

    // ==================== type / magma rail ====================

    public int getType() {
        return this.dataManager.get(TYPE) & 0xFF;
    }

    public void setType(int type) {
        this.dataManager.set(TYPE, (byte) (type & 0xFF));
    }

    /** R196 isMagma(); the clay golem overrides to false. */
    public boolean isMagma() {
        return !this.world.isRemote ? this.heat >= 100 : isMagmaType(this.getType());
    }

    protected static boolean isMagmaType(int type) {
        return type != CLAY_HARDENED && (type & 1) == 1;
    }

    /** R196 isClay() = getClass() == EntityClayGolem.class. */
    public boolean isClay() {
        return this instanceof ETIMEntityClayGolem;
    }

    public boolean isNormalClay() {
        return this.isClay() && (!this.world.isRemote ? this.heat < 100 : this.getType() == CLAY_NORMAL);
    }

    public boolean isHardenedClay() {
        return this.isClay() && (!this.world.isRemote ? this.heat >= 100 : this.getType() == CLAY_HARDENED);
    }

    /** R196 setTypeForBlock (:64-79). */
    public void setTypeForBlock(IBlockState below, boolean heated) {
        Block block = below.getBlock();
        if (block == Blocks.END_STONE) {
            this.setType(END_STONE_NORMAL);
        } else if (block == Blocks.NETHERRACK) {
            this.setType(NETHERRACK_NORMAL);
        } else if (block == Blocks.OBSIDIAN) {
            this.setType(OBSIDIAN_NORMAL);
        } else {
            this.setType(STONE_NORMAL);
        }
        if (heated) {
            this.convertToMagma();
        }
    }

    /** R196 convertToMagma (:81-96). */
    public void convertToMagma() {
        if (this.world.isRemote) {
            return;
        }
        int before = this.getType();
        this.heat = 1000;
        if (this.isClay()) {
            this.setType(CLAY_HARDENED);
        } else {
            this.setType(before | 1);
        }
        this.world.spawnParticle(EnumParticleTypes.SMOKE_LARGE,
                this.posX, this.posY + this.height * 0.5D, this.posZ, 0.0D, 0.05D, 0.0D);
        this.logState("magma", before, this.getType(), "heat");
    }

    /** R196 convertToNormal (:98-115). */
    public void convertToNormal(boolean steam) {
        if (this.world.isRemote) {
            return;
        }
        int before = this.getType();
        if (this.isClay()) {
            // R196 logs an error here: clay golems never hold a magma type.
            this.setType(CLAY_NORMAL);
            this.heat = 0;
            return;
        }
        this.heat = 0;
        this.setType(before & ~1);
        if (steam) {
            this.world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL,
                    this.posX, this.posY + this.height * 0.5D, this.posZ, 0.0D, 0.08D, 0.0D);
            this.world.spawnParticle(EnumParticleTypes.CLOUD,
                    this.posX, this.posY + this.height * 0.5D, this.posZ, 0.0D, 0.08D, 0.0D);
        }
        this.logState("normal", before, this.getType(), steam ? "quench" : "cool");
    }

    private void logState(String to, int from, int now, String cause) {
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[ElementalLog] magma kind={} from={} to={} heat={} cause={} entity={} [server]",
                    this.kind(), from, now, this.heat, cause, this.getEntityId());
        }
    }

    @Override
    public void onStruckByLightning(net.minecraft.entity.effect.EntityLightningBolt lightning) {
        super.onStruckByLightning(lightning);
        this.convertToMagma(); // R196 :117-120
    }

    // ==================== tick ====================

    @Override
    public void onLivingUpdate() {
        if (!this.world.isRemote) {
            this.tickHeat();
        } else if (this.isMagma() && this.world.isRainingAt(this.getPosition())) {
            for (int i = 0; i < 2; i++) {
                this.world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL,
                        this.posX + (this.rand.nextDouble() - 0.5D) * this.width,
                        this.posY + this.rand.nextDouble() * this.height,
                        this.posZ + (this.rand.nextDouble() - 0.5D) * this.width,
                        0.0D, 0.05D, 0.0D);
            }
        }
        super.onLivingUpdate();
        if (!this.world.isRemote && this.ticksExisted == 1 && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[ElementalLog] spawn kind={} type={} heat={} hp={} max={} attack={} speed={} follow={} xp={} entity={} [server]",
                    this.kind(), this.getType(), this.heat,
                    this.getHealth(), this.getMaxHealth(),
                    this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue(),
                    this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).getAttributeValue(),
                    this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).getAttributeValue(),
                    this.experienceValue, this.getEntityId());
        }
    }

    /** R196 onLivingUpdate heat rail (:122-160). */
    private void tickHeat() {
        BlockPos pos = this.getPosition();
        if (this.isInWater()) {
            if (isMagmaType(this.getType())) {
                this.convertToNormal(true);
            }
            this.heat = 0;
            return;
        }
        if (this.isInLava() || (this.isClay() && this.isBurning())) {
            if (this.heat < 1000 && ++this.heat == 100) {
                this.convertToMagma();
            }
            return;
        }
        if (this.heat > 0) {
            int cooling = 1;
            if (this.world.isRainingAt(pos)) {
                cooling++;
            }
            if (this.world.getBiome(pos).getTemperature(pos) <= 0.15F) {
                cooling++; // R196 world.isFreezing + foot/below material freezing (C-B62-4)
            }
            int before = this.heat;
            this.heat = Math.max(0, this.heat - cooling);
            if (isMagmaType(this.getType()) && this.heat < 100) {
                this.convertToNormal(this.world.isRainingAt(pos));
            }
            if (ETIMConfig.mobDebugLog && this.ticksExisted % 20 == 0) {
                ETIM.LOGGER.info("[ElementalLog] cool heat={} before={} cooling={} in_water={} rain={} kind={} entity={} [server]",
                        this.heat, before, cooling, false, this.world.isRainingAt(pos), this.kind(), this.getEntityId());
            }
        }
        if (isMagmaType(this.getType()) && this.world.isRainingAt(pos)) {
            if (--this.ticksUntilNextFizzSound <= 0) {
                this.playSound(SoundEvents.BLOCK_FIRE_EXTINGUISH, 0.7F,
                        1.6F + (this.rand.nextFloat() - this.rand.nextFloat()) * 0.4F);
                this.ticksUntilNextFizzSound = this.rand.nextInt(7) + 2;
            }
        }
    }

    // ==================== immunity / defense ====================

    /** R196 isImmuneTo (:50-60). */
    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        boolean allowed;
        if (this.isNormalClay()) {
            allowed = true; // R196 super.isImmuneTo (EntityLivingBase) = false → damage lands
        } else if (source == DamageSource.FALL) {
            allowed = true;
        } else if (source.getTrueSource() instanceof net.minecraft.entity.monster.EntityIronGolem
                && source.getImmediateSource() == source.getTrueSource()) {
            allowed = true;
        } else if (this.heldToolEffectiveOnOwnBlock(source)) {
            allowed = true;
        } else {
            allowed = source.isExplosion();
        }
        if (!allowed) {
            if (ETIMConfig.mobDebugLog && !this.world.isRemote) {
                ETIM.LOGGER.info("[ElementalLog] immune kind={} source={} entity={} [server]",
                        this.kind(), source.getDamageType(), this.getEntityId());
            }
            return false;
        }
        return super.attackEntityFrom(source, amount);
    }

    private boolean heldToolEffectiveOnOwnBlock(DamageSource source) {
        if (!(source.getImmediateSource() instanceof EntityLivingBase)) {
            return false;
        }
        ItemStack held = ((EntityLivingBase) source.getImmediateSource()).getHeldItemMainhand();
        if (held.isEmpty()) {
            return false;
        }
        for (String toolClass : held.getItem().getToolClasses(held)) {
            if (this.getMaterialBlock().isToolEffective(toolClass, this.getMaterialBlock().getDefaultState())) {
                return true;
            }
        }
        return false;
    }

    /** AD-6 natural defense (R196 :44-48): 4.0F unless the source bypasses mundane armor. */
    @Override
    public float etimNaturalDefense(DamageSource source) {
        if (source == null || source.isUnblockable() || source.isFireDamage()) {
            return 0.0F;
        }
        return 4.0F;
    }

    // ==================== attacks / drops ====================

    @Override
    public boolean attackEntityAsMob(Entity target) {
        this.swingArm(EnumHand.MAIN_HAND); // R196 swingArm()
        boolean hit = super.attackEntityAsMob(target);
        if (hit && !this.world.isRemote && this.isMagma() && target instanceof EntityLivingBase
                && this.rand.nextFloat() < 0.4F) { // R196 :330-340
            int seconds = 1 + this.rand.nextInt(8);
            target.setFire(seconds);
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[ElementalLog] bite kind={} target={} fire={} entity={} [server]",
                        this.kind(), target.getName(), seconds, this.getEntityId());
            }
        }
        return hit;
    }

    /** R196 getBlock() = the material block of the current type. */
    public Block getMaterialBlock() {
        switch (this.getType()) {
            case OBSIDIAN_NORMAL:
            case OBSIDIAN_MAGMA:
                return Blocks.OBSIDIAN;
            case NETHERRACK_NORMAL:
            case NETHERRACK_MAGMA:
                return Blocks.NETHERRACK;
            case END_STONE_NORMAL:
            case END_STONE_MAGMA:
                return Blocks.END_STONE;
            case CLAY_NORMAL:
            case CLAY_HARDENED:
                return Blocks.CLAY;
            default:
                return Blocks.STONE;
        }
    }

    /** R196 getBlockHarvestLevel() = getBlock().getMinHarvestLevel(0). */
    public int etimBlockHarvestLevel() {
        return ETIMDigging.minHarvestLevelOf(this.getMaterialBlock().getDefaultState());
    }

    @Override
    protected void dropFewItems(boolean wasRecentlyHit, int looting) {
        Block block = this.getMaterialBlock();
        Item item = block == Blocks.STONE ? Item.getItemFromBlock(Blocks.COBBLESTONE) : Item.getItemFromBlock(block); // R196 :352-360
        if (item != null) {
            this.dropItem(item, 1);
        }
        if (ETIMConfig.mobDebugLog && !this.world.isRemote) {
            ETIM.LOGGER.info("[ElementalLog] drop kind={} type={} block={} entity={} [server]",
                    this.kind(), this.getType(), block.getRegistryName(), this.getEntityId());
        }
    }

    @Override
    public int getMaxSpawnedInChunk() {
        return 1; // R196
    }

    // ==================== spawn ====================

    /** R196 isValidLightLevel() = isInNether() || super. */
    @Override
    protected boolean isValidLightLevel() {
        return this.world.provider.getDimension() == -1 || super.isValidLightLevel();
    }

    /** R196 isValidBlock() — stone / obsidian / netherrack / end stone (clay golem narrows it). */
    protected boolean isValidMaterialBlock(Block block) {
        return block == Blocks.STONE || block == Blocks.OBSIDIAN
                || block == Blocks.NETHERRACK || block == Blocks.END_STONE;
    }

    @Override
    public boolean getCanSpawnHere() {
        IBlockState below = this.world.getBlockState(this.getPosition().down());
        return this.isValidMaterialBlock(below.getBlock()) && super.getCanSpawnHere(); // R196 :90-96
    }

    @Override
    public IEntityLivingData onInitialSpawn(DifficultyInstance difficulty, IEntityLivingData livingdata) {
        IEntityLivingData data = super.onInitialSpawn(difficulty, livingdata);
        IBlockState below = this.world.getBlockState(this.getPosition().down());
        boolean feetLava = this.world.getBlockState(this.getPosition()).getMaterial() == net.minecraft.block.material.Material.LAVA;
        this.setTypeForBlock(below, feetLava || (this.isClay() && this.isBurning())); // R196 onSpawnWithEgg
        this.setHealth(this.getMaxHealth());
        return data;
    }

    // ==================== misc ====================

    @Override
    protected SoundEvent getHurtSound(DamageSource source) {
        return SoundEvents.ENTITY_IRONGOLEM_HURT; // R196 "mob.irongolem.hit"
    }

    @Override
    protected SoundEvent getDeathSound() {
        return SoundEvents.ENTITY_IRONGOLEM_DEATH;
    }

    @Override
    protected void playStepSound(BlockPos pos, Block blockIn) {
        this.playSound(SoundEvents.ENTITY_IRONGOLEM_STEP, 0.25F, 1.0F); // R196 :375-380
    }

    @Override
    public int getBrightnessForRender() {
        int packed = super.getBrightnessForRender();
        if (isMagmaType(this.getType())) { // R196 :170-180
            int block = Math.max(packed % 65536, 80);
            int sky = Math.max(packed / 65536, 80);
            return block + sky * 65536;
        }
        return packed;
    }

    @Override
    public boolean isPushedByWater() {
        return false;
    }

    @Override
    public boolean canBreatheUnderwater() {
        return true; // R196 breathesAir = false
    }

    @Override
    public EnumCreatureAttribute getCreatureAttribute() {
        return EnumCreatureAttribute.UNDEFINED;
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound compound) {
        super.writeEntityToNBT(compound);
        compound.setShort("type", (short) this.getType()); // R196 :330
        compound.setShort("heat", (short) this.heat);
    }

    @Override
    public void readEntityFromNBT(NBTTagCompound compound) {
        super.readEntityFromNBT(compound);
        if (compound.hasKey("type", 99)) {
            this.setType(compound.getShort("type"));
        }
        this.heat = compound.getShort("heat");
    }

    protected String kind() {
        return "earth";
    }

    /** B-59 harness probe parity. */
    public int etimExperienceProbe(EntityPlayer player) {
        return this.getExperiencePoints(player);
    }

    /** B-62 probe/command face: the server heat rail. */
    public int etimHeat() {
        return this.heat;
    }

    /** R196 isHarmedByPepsin() = false (isEntityBiologicallyAlive false) — B-62 C-10. */
    public boolean etimBiologicallyAlive() {
        return false;
    }

    static String fmt(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }
}
