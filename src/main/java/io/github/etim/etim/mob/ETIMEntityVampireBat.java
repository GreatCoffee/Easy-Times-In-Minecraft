package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.passive.EntityBat;
import net.minecraft.entity.passive.EntityOcelot;
import net.minecraft.entity.passive.EntityVillager;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.DamageSource;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

/**
 * B-55 census D :60/:114/:237 — the R196 vampire bat
 * ({@code EntityVampireBat.java:3-92}), a direct {@code EntityBat} child that
 * only adds hunting: a 32-block prey refresh every 20 ticks, the
 * collision-timed biting pass, and the {@code feed_cooldown} state machine.
 *
 * <p>R196 semantics carried 1:1:</p>
 * <ul>
 *   <li>attributes: {@code maxHealth = 3.0 × scale} (from {@code EntityBat}),
 *       {@code attackDamage = 1.0 × scale};</li>
 *   <li>target refresh uses {@code ticksExistedWithOffset} (entity id low
 *       bits) so a pack never refreshes on the same tick; aiming keeps the
 *       {@code attack_waver} jitter refreshed every 20 ticks;</li>
 *   <li>bite fires from the collision pass, requires the target to be the
 *       current attack target and the half-width AABB to intersect; the
 *       health the target lost is healed back ({@code vampiric_gain}), an
 *       ocelot with no target retaliates, and a non-giant bat that is at
 *       full health starts the 1200-tick {@code feed_cooldown};</li>
 *   <li>while {@code feed_cooldown} runs, only non-creative players are
 *       prey, and a target that stops qualifying is dropped.</li>
 * </ul>
 */
public class ETIMEntityVampireBat extends EntityBat implements ETIMBatFamily {

    /** R196 EntityVampireBat.java:4. */
    private int attackCooldown;
    /** R196 EntityVampireBat.java:5; NBT short {@code feed_cooldown}. */
    private int feedCooldown;

    private float waverX;
    private float waverY;
    private float waverZ;

    /** B-55 probe cache: last target id written to the debug row. */
    private int etimLoggedTargetId = -2;

    public ETIMEntityVampireBat(World world) {
        super(world);
        this.experienceValue = 5;
    }

    /** R196 EntityBat.getScaleFactor :42 — the giant child doubles it. */
    @Override
    public int etimExperienceValue() {
        return this.experienceValue;
    }

    protected float etimScaleFactor() {
        return 1.0F;
    }

    protected boolean isGiant() {
        return false;
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH)
                .setBaseValue(3.0D * (double) this.etimScaleFactor());
        // EntityBat is not an EntityMob — ATTACK_DAMAGE is not registered yet.
        this.getAttributeMap().registerAttribute(SharedMonsterAttributes.ATTACK_DAMAGE)
                .setBaseValue(1.0D * (double) this.etimScaleFactor());
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(32.0D);
    }

    /** R196 {@code getTicksExistedWithOffset}: id low bits break pack alignment. */
    protected final int ticksExistedWithOffset() {
        return this.ticksExisted + (this.getEntityId() & 15);
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (this.world.isRemote) {
            return;
        }
        if (this.attackCooldown > 0) {
            --this.attackCooldown;
        }
        if (this.feedCooldown > 0) {
            if (this.getHealth() < this.getMaxHealth()) {
                this.feedCooldown = 0;
            } else if (--this.feedCooldown > 0) {
                EntityLivingBase target = this.getAttackTarget();
                if (target != null && !this.preysUpon(target)) {
                    this.setAttackTarget(null);
                }
            }
        }
        if (this.ticksExistedWithOffset() % 20 == 0) {
            this.setAttackTarget(this.findPrey());
            EntityLivingBase target = this.getAttackTarget();
            int targetId = target == null ? -1 : target.getEntityId();
            if (targetId != this.etimLoggedTargetId) {
                this.etimLoggedTargetId = targetId;
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[BatMobLog] vampire target cls={} target={} dist={} entity={}",
                            this.getClass().getSimpleName(),
                            target == null ? "null" : target.getClass().getSimpleName(),
                            target == null ? -1.0D : Math.sqrt(this.getDistanceSq(target)),
                            this);
                }
            } else if (target != null && ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[BatMobLog] chase cls={} target={} dist={} hanging={} cd={} motion=({},{},{}) entity={}",
                        this.getClass().getSimpleName(), target.getClass().getSimpleName(),
                        String.format("%.2f", Math.sqrt(this.getDistanceSq(target))),
                        this.getIsBatHanging(), this.attackCooldown,
                        String.format("%.3f", this.motionX), String.format("%.3f", this.motionY),
                        String.format("%.3f", this.motionZ), this);
            }
        }
    }

    private EntityLivingBase findPrey() {
        EntityLivingBase best = ETIMMobPrey.findNearest(this.world, this, 32.0D, this::preysUpon);
        if (best == null && ETIMConfig.mobDebugLog) {
            net.minecraft.util.math.AxisAlignedBB box = this.getEntityBoundingBox().grow(32.0D, 32.0D, 32.0D);
            java.util.List<EntityLivingBase> around = this.world.getEntitiesWithinAABB(EntityLivingBase.class, box);
            int raw = this.world.getEntitiesWithinAABB(net.minecraft.entity.Entity.class, box, null).size();
            StringBuilder sb = new StringBuilder();
            for (EntityLivingBase candidate : around) {
                if (candidate == this) {
                    continue;
                }
                sb.append(candidate.getClass().getSimpleName()).append(':')
                        .append(this.preysUpon(candidate)).append('/')
                        .append(this.getEntitySenses().canSee(candidate)).append(' ');
            }
            ETIM.LOGGER.info("[BatMobLog] prey-scan around={} raw={} box=({},{},{})-({},{},{}) dim={} list={} self=({},{},{}) players={} entity={}",
                    around.size(), raw,
                    String.format("%.2f", box.minX), String.format("%.2f", box.minY), String.format("%.2f", box.minZ),
                    String.format("%.2f", box.maxX), String.format("%.2f", box.maxY), String.format("%.2f", box.maxZ),
                    this.world.provider.getDimension(),
                    sb.toString().trim(),
                    String.format("%.2f", this.posX), String.format("%.2f", this.posY), String.format("%.2f", this.posZ),
                    this.world.playerEntities.stream()
                            .map(p -> p.getName() + "@" + String.format("%.1f,%.1f,%.1f", p.posX, p.posY, p.posZ)
                                    + ":d" + p.world.provider.getDimension() + ":dead" + p.isDead + ":hp" + p.getHealth())
                            .collect(java.util.stream.Collectors.joining(";")),
                    this);
        }
        return best;
    }

    /** R196 EntityVampireBat.preysUpon :41-47. */
    protected boolean preysUpon(EntityLivingBase candidate) {
        boolean player = candidate instanceof EntityPlayer && !((EntityPlayer) candidate).capabilities.isCreativeMode;
        if (this.feedCooldown > 0) {
            return player;
        }
        return player || candidate instanceof net.minecraft.entity.passive.EntityAnimal
                || candidate instanceof EntityVillager;
    }

    /**
     * R196 EntityBat.updateAITasks :245-281 — with a target, the flight vector
     * aims at the target's eyes plus the jitter; without one the vanilla
     * wander/hang body runs untouched.
     */
    @Override
    protected void updateAITasks() {
        EntityLivingBase target = this.getAttackTarget();
        if (target == null || this.getIsBatHanging()) {
            super.updateAITasks();
            return;
        }
        super.updateAITasks();
        double dx;
        double dy;
        double dz;
        Vec3d eyes = new Vec3d(target.posX, target.posY + (double) target.getEyeHeight(), target.posZ);
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
        this.rotationYaw += net.minecraft.util.math.MathHelper.wrapDegrees(yaw - this.rotationYaw);
        this.moveForward = 0.5F;
    }

    /**
     * 1.12 carrier for R196 {@code collideWithEntity}: the vanilla
     * {@code EntityBat} overrides {@code collideWithNearbyEntities} to an empty
     * body, and 1.12's collision pass calls back into the other entity, so the
     * bat-side hook is this empty override.
     */
    @Override
    protected void collideWithNearbyEntities() {
        EntityLivingBase target = this.getAttackTarget();
        if (target == null || this.world.isRemote) {
            return;
        }
        if (this.attackCooldown > 0) {
            return;
        }
        if (target.isDead || target.getHealth() <= 0.0F) {
            return;
        }
        if (!this.getEntityBoundingBox().grow(-0.125D, 0.0D, -0.125D)
                .intersects(target.getEntityBoundingBox())) {
            return;
        }
        float before = target.getHealth();
        boolean hurt = target.attackEntityFrom(DamageSource.causeMobDamage(this),
                (float) this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue());
        this.attackCooldown = 20;
        if (!hurt) {
            return;
        }
        float lost = before - target.getHealth();
        if (lost > 0.0F) {
            this.heal(lost);
            if (target instanceof EntityOcelot) {
                EntityOcelot ocelot = (EntityOcelot) target;
                if (ocelot.getHealth() > 0.0F && ocelot.getAttackTarget() == null) {
                    ocelot.setAttackTarget(this);
                }
            }
            if (!this.isGiant() && this.getHealth() >= this.getMaxHealth()) {
                this.feedCooldown = 1200;
            }
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[BatMobLog] bite cls={} target={} dealt={} healed={} feed_cd={} entity={}",
                    this.getClass().getSimpleName(), target.getName(), lost, lost,
                    this.feedCooldown, this);
        }
    }

    @Override
    public int getMaxSpawnedInChunk() {
        return 8;
    }

    @Override
    public void readEntityFromNBT(NBTTagCompound compound) {
        super.readEntityFromNBT(compound);
        this.feedCooldown = compound.getShort("feed_cooldown");
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound compound) {
        super.writeEntityToNBT(compound);
        if (this.feedCooldown > 0) {
            compound.setShort("feed_cooldown", (short) this.feedCooldown);
        }
    }
}
