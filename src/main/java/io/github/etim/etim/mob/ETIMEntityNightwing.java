package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.EnumCreatureAttribute;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.entity.passive.EntityBat;
import net.minecraft.entity.passive.EntityVillager;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.DamageSource;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

/**
 * B-55 census D :66/:113/:236 — the R196 nightwing
 * ({@code EntityNightwing.java:3-80}).
 *
 * <p>Three judged faces beyond the vampire bat chassis:</p>
 * <ul>
 *   <li><b>Immunity</b> ({@code isImmuneTo} :18): only silver weapons, magic
 *       and sunlight hurt it; everything else is voided. The silver bit is
 *       read through {@link ETIMDamageAspects} — the ETIM metal gear whose
 *       metal is silver, matching R196's {@code Material.silver}.</li>
 *   <li><b>Sunlight</b> (:44-55): in daylight under open sky it takes 1000
 *       sunlight damage; otherwise every 40 ticks it heals
 *       {@code (0.4 - brightness) × 10}.</li>
 *   <li><b>Vision dimming</b> (:63-76): a bite that negatively affects a
 *       player adds {@code amountAfterResistance(1.25F, 4)} to the player's
 *       vision dimming (R196 default PlayerResistance -,4 → 1.25 flat).</li>
 * </ul>
 */
public class ETIMEntityNightwing extends EntityBat implements ETIMBatFamily {

    /** R196 EntityNightwing.java:4. */
    private int attackCooldown;

    private float waverX;
    private float waverY;
    private float waverZ;

    public ETIMEntityNightwing(World world) {
        super(world);
        this.experienceValue = 10;
    }

    @Override
    public int etimExperienceValue() {
        return this.experienceValue;
    }

    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(3.0D);
        this.getAttributeMap().registerAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(1.0D);
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(32.0D);
    }

    private int ticksExistedWithOffset() {
        return this.ticksExisted + (this.getEntityId() & 15);
    }

    @Override
    public void onLivingUpdate() {
        if (!this.world.isRemote) {
            if (this.isDead || this.getHealth() <= 0.0F) {
                super.onLivingUpdate();
                return;
            }
            if (this.isInSunlight()) {
                this.attackEntityFrom(ETIMDamageAspects.SUNLIGHT, 1000.0F);
            } else if (this.ticksExisted % 40 == 0) {
                int heal = (int) ((0.4F - this.getBrightness()) * 10.0F);
                if (heal > 0) {
                    this.heal((float) heal);
                }
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[BatMobLog] nightwing sun=false brightness={} heal={} entity={}",
                            this.getBrightness(), Math.max(heal, 0), this);
                }
            }
        }
        super.onLivingUpdate();
        if (this.world.isRemote) {
            return;
        }
        if (this.attackCooldown > 0) {
            --this.attackCooldown;
        }
        if (this.ticksExistedWithOffset() % 20 == 0) {
            this.setAttackTarget(ETIMMobPrey.findNearest(this.world, this, 32.0D, this::preysUpon));
        }
    }

    /** R196 EntityNightwing.preysUpon :52-54 — constant list (no feed gate). */
    private boolean preysUpon(EntityLivingBase candidate) {
        return candidate instanceof EntityPlayer && !((EntityPlayer) candidate).capabilities.isCreativeMode
                || candidate instanceof EntityAnimal
                || candidate instanceof EntityVillager;
    }

    /** R196 {@code isInSunlight}: daylight with an unobstructed sky. */
    private boolean isInSunlight() {
        return this.world.isDaytime() && this.world.canSeeSky(new net.minecraft.util.math.BlockPos(this));
    }

    /** R196 isImmuneTo :18 — silver / magic / sunlight pass, nothing else. */
    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        if (this.world.isRemote) {
            return super.attackEntityFrom(source, amount);
        }
        String aspect = ETIMDamageAspects.describe(source);
        if (!"sunlight".equals(aspect) && !"silver".equals(aspect) && !"magic".equals(aspect)) {
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[BatMobLog] nightwing immune aspect={} source={} entity={}",
                        aspect, source.getDamageType(), this);
            }
            return false;
        }
        boolean hurt = super.attackEntityFrom(source, amount);
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[BatMobLog] nightwing hurt aspect={} amount={} hurt={} entity={}",
                    aspect, amount, hurt, this);
        }
        return hurt;
    }

    /** R196 getCanSpawnHere :21-24 — never in the open under daylight. */
    @Override
    public boolean getCanSpawnHere() {
        if (this.isInSunlight()) {
            return false;
        }
        return super.getCanSpawnHere();
    }

    @Override
    protected void updateAITasks() {
        EntityLivingBase target = this.getAttackTarget();
        if (target == null || this.getIsBatHanging()) {
            super.updateAITasks();
            return;
        }
        super.updateAITasks();
        Vec3d eyes = new Vec3d(target.posX, target.posY + (double) target.getEyeHeight(), target.posZ);
        double dx;
        double dy;
        double dz;
        if (eyes.y + (double) this.waverY >= 0.5D) {
            dx = eyes.x + (double) this.waverX - this.posX;
            dy = eyes.y + (double) this.waverY - this.posY;
            dz = eyes.z + (double) this.waverZ - this.posZ;
        } else {
            dx = eyes.x - this.posX;
            dy = eyes.y - this.posY;
            dz = eyes.z - this.posZ;
        }
        if (this.ticksExistedWithOffset() % 20 == 0) {
            this.waverX = this.rand.nextFloat() - 0.5F;
            this.waverY = this.rand.nextFloat() - 0.5F;
            this.waverZ = this.rand.nextFloat() - 0.5F;
        }
        this.motionX += (Math.signum(dx) * 0.5D - this.motionX) * 0.1D;
        this.motionY += (Math.signum(dy) * 0.7D - this.motionY) * 0.1D;
        this.motionZ += (Math.signum(dz) * 0.5D - this.motionZ) * 0.1D;
        float yaw = (float) (Math.atan2(this.motionZ, this.motionX) * 180.0D / Math.PI) - 90.0F;
        this.rotationYaw += MathHelper.wrapDegrees(yaw - this.rotationYaw);
        this.moveForward = 0.5F;
    }

    @Override
    protected void collideWithNearbyEntities() {
        EntityLivingBase target = this.getAttackTarget();
        if (target == null || this.world.isRemote || this.attackCooldown > 0) {
            return;
        }
        if (target.isDead || target.getHealth() <= 0.0F) {
            return;
        }
        if (!this.getEntityBoundingBox().contract(0.25D, 0.0D, 0.25D)
                .intersects(target.getEntityBoundingBox())) {
            return;
        }
        boolean hurt = target.attackEntityFrom(DamageSource.causeMobDamage(this),
                (float) this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue());
        this.attackCooldown = 20;
        if (!hurt) {
            return;
        }
        if (target instanceof EntityPlayer) {
            // R196 :68 — amountAfterResistance(1.25F, 4) with PlayerResistance -4.
            ETIMVisionDimming.add((EntityPlayer) target, 1.25F);
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[BatMobLog] bite cls={} target={} hurt={} entity={}",
                    this.getClass().getSimpleName(), target.getName(), hurt, this);
        }
    }

    @Override
    public int getMaxSpawnedInChunk() {
        return 8;
    }

    @Override
    public EnumCreatureAttribute getCreatureAttribute() {
        return EnumCreatureAttribute.UNDEAD;
    }
}
