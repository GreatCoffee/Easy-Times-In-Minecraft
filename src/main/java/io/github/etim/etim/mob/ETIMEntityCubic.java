package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.EntityAIAttackMelee;
import net.minecraft.entity.ai.EntityAIHurtByTarget;
import net.minecraft.entity.ai.EntityAILookIdle;
import net.minecraft.entity.ai.EntityAINearestAttackableTarget;
import net.minecraft.entity.ai.EntityAISwimming;
import net.minecraft.entity.ai.EntityAIWanderAvoidWater;
import net.minecraft.entity.ai.EntityAIWatchClosest;
import net.minecraft.entity.ai.EntityMoveHelper;
import net.minecraft.entity.monster.EntityMob;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.init.SoundEvents;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.network.datasync.DataParameter;
import net.minecraft.network.datasync.DataSerializers;
import net.minecraft.network.datasync.EntityDataManager;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.world.EnumDifficulty;
import net.minecraft.world.World;

/**
 * B-57 — the R196 {@code EntityCubic} base (EntityCubic.java:5-553), carried on
 * the 1.12 {@link EntityMob} chassis.
 *
 * <p>R196 extends {@code EntityLiving implements IMob} and owns its own size,
 * health, jump, split and contact-damage faces. The 1.12 {@code EntityMob} gives
 * the same IMob surface plus the attribute map (ATTACK_DAMAGE is registered
 * there), so this class ports the R196 body on top of it instead of touching
 * vanilla {@code EntitySlime} — the slime chassis resets health/drops/light
 * gates on every size change (see playground/audit/gelatinous-立项摸底.md D-1).</p>
 *
 * <p>Judged faces: size byte 1/2/4, width = height = 0.5*size, max health =
 * size*size, jump delay 10 when chasing else 40 + rand(81), split into
 * {@code 2 + rand(3)} half-size children on death unless burning, XP =
 * size * (multiplier + acidic), size-1 drop = slimeball, contact damage at
 * every size, peaceful despawn.</p>
 */
public abstract class ETIMEntityCubic extends EntityMob {

    private static final DataParameter<Byte> SIZE =
            EntityDataManager.createKey(ETIMEntityCubic.class, DataSerializers.BYTE);

    public float squishAmount;
    public float squishFactor;
    public float prevSquishFactor;

    private int jumpDelay;

    public ETIMEntityCubic(World worldIn) {
        super(worldIn);
        this.moveHelper = new ETIMCubicMoveHelper(this);
        this.setCubicSize(1 << this.rand.nextInt(3));
    }

    @Override
    protected void entityInit() {
        super.entityInit();
        this.dataManager.register(SIZE, (byte) 1);
    }

    @Override
    protected void initEntityAI() {
        this.tasks.addTask(1, new EntityAISwimming(this));
        this.tasks.addTask(4, new EntityAIAttackMelee(this, 1.0D, false));
        this.tasks.addTask(5, new EntityAIWanderAvoidWater(this, 0.8D));
        this.tasks.addTask(6, new EntityAIWatchClosest(this, EntityPlayer.class, 8.0F));
        this.tasks.addTask(6, new EntityAILookIdle(this));
        this.targetTasks.addTask(1, new EntityAIHurtByTarget(this, false));
        this.targetTasks.addTask(2, new EntityAINearestAttackableTarget<EntityPlayer>(this, EntityPlayer.class, true));
    }

    public int getCubicSize() {
        return this.dataManager.get(SIZE);
    }

    /** R196 {@code EntityCubic.setSize(int)} (:35-41). */
    public void setCubicSize(int size) {
        int clamped = Math.max(1, size);
        this.dataManager.set(SIZE, (byte) clamped);
        this.updateSize();
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(clamped * clamped);
        this.setHealth(this.getMaxHealth());
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE)
                .setBaseValue(this.getAttackStrengthMultiplier() * clamped);
        this.experienceValue = this.getExperienceValueForSize(clamped);
    }

    private void updateSize() {
        int size = this.getCubicSize();
        this.setSize(0.5F * size, 0.5F * size);
    }

    /** Probe accessor (B-57 W-window). */
    public int etimExperienceValue() {
        return this.experienceValue;
    }

    /** R196 {@code getAttackStrength = size * multiplier}. */
    protected abstract int getAttackStrengthMultiplier();

    /** R196 {@code isAcidic()} — ooze/pudding only. */
    protected abstract boolean isAcidic();

    /** R196 {@code EntityCubic.createInstance()}. */
    protected abstract ETIMEntityCubic createCubicInstance();

    /** R196 {@code getSquishParticle()}. */
    protected abstract EnumParticleTypes getSquishParticle();

    protected int getExperienceValueForSize(int size) {
        return size * (this.getAttackStrengthMultiplier() + (this.isAcidic() ? 1 : 0));
    }

    /** R196 {@code EntityCubic.getJumpDelay(Entity)} (:117-119). */
    public int getJumpDelay(net.minecraft.entity.EntityLivingBase target) {
        return target == null ? this.rand.nextInt(81) + 40 : 10;
    }

    @Override
    public void onLivingUpdate() {
        this.squishFactor += (this.squishAmount - this.squishFactor) * 0.5F;
        this.prevSquishFactor = this.squishFactor;
        super.onLivingUpdate();
        if (this.onGround && !this.isJumping) {
            this.squishAmount -= 0.5F;
        }
        this.squishAmount *= 0.6F;
    }

    @Override
    public void onUpdate() {
        if (!this.world.isRemote && this.world.getDifficulty() == EnumDifficulty.PEACEFUL && this.getCubicSize() > 0) {
            this.setDead();
        }
        this.prevSquishFactor = this.squishFactor;
        super.onUpdate();
    }

    @Override
    public void setDead() {
        if (!this.world.isRemote && !this.isBurning() && this.getCubicSize() > 1 && this.getHealth() <= 0.0F) {
            int children = 2 + this.rand.nextInt(3);
            int childSize = this.getCubicSize() / 2;
            for (int i = 0; i < children; i++) {
                ETIMEntityCubic child = this.createCubicInstance();
                child.setCubicSize(childSize);
                child.setLocationAndAngles(
                        this.posX + (this.rand.nextDouble() - 0.5D) * (double) this.width,
                        this.posY + 0.1D,
                        this.posZ + (this.rand.nextDouble() - 0.5D) * (double) this.width,
                        this.rand.nextFloat() * 360.0F, 0.0F);
                this.world.spawnEntity(child);
            }
        }
        super.setDead();
    }

    @Override
    protected void dropFewItems(boolean wasRecentlyHit, int lootingModifier) {
        // R196 getDropItemId(): only the size-1 cube carries a slimeball.
        if (this.getCubicSize() == 1) {
            this.dropItem(Items.SLIME_BALL, 1);
        }
    }

    /** R196 {@code getSoundVolume = 0.2 * size} (inherited shape). */
    @Override
    protected float getSoundVolume() {
        return 0.2F * (float) this.getCubicSize();
    }

    /** R196 {@code onCollideWithPlayer} + {@code getReachSquared}. */
    @Override
    public void onCollideWithPlayer(EntityPlayer player) {
        if (this.canEntityBeSeen(player) && this.getDistanceSq(player) < this.getReachSquared()) {
            this.attackEntityAsMob(player);
        }
    }

    private double getReachSquared() {
        int size = this.getCubicSize();
        if (size == 1) {
            return 1.1D * 1.1D;
        }
        if (size == 2) {
            return 0.9D * 0.9D;
        }
        return 0.7D * 0.7D;
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound compound) {
        super.writeEntityToNBT(compound);
        compound.setInteger("Size", this.getCubicSize() - 1);
    }

    @Override
    public void readEntityFromNBT(NBTTagCompound compound) {
        super.readEntityFromNBT(compound);
        this.setCubicSize(compound.getInteger("Size") + 1);
    }

    @Override
    public void jump() {
        this.motionY = 0.42D;
        if (this.isSprinting()) {
            float yaw = this.rotationYaw * 0.017453292F;
            this.motionX -= (double) (this.rand.nextFloat() * 0.2F) * (double) Math.sin(yaw);
            this.motionZ += (double) (this.rand.nextFloat() * 0.2F) * (double) Math.cos(yaw);
        }
        int size = this.getCubicSize();
        for (int i = 0; i < size * 8; i++) {
            float dx = (this.rand.nextFloat() - 0.5F) * this.width;
            float dz = (this.rand.nextFloat() - 0.5F) * this.width;
            this.world.spawnParticle(this.getSquishParticle(),
                    this.posX + (double) dx, this.getEntityBoundingBox().minY, this.posZ + (double) dz,
                    0.0D, 0.0D, 0.0D);
        }
        this.squishAmount = -0.5F;
    }

    protected net.minecraft.util.SoundEvent getJumpSound() {
        return this.getCubicSize() > 1 ? SoundEvents.ENTITY_SLIME_JUMP : SoundEvents.ENTITY_SMALL_SLIME_JUMP;
    }

    /**
     * R196 {@code EntityCubic}'s hop movement, mirrored from the 1.12
     * {@code EntitySlime.SlimeMoveHelper}: face the yaw, then jump on the delay.
     */
    protected static class ETIMCubicMoveHelper extends EntityMoveHelper {

        private final ETIMEntityCubic cubic;
        private float yRot;
        private int jumpDelay;
        private boolean aggressive;

        public ETIMCubicMoveHelper(ETIMEntityCubic cubic) {
            super(cubic);
            this.cubic = cubic;
            this.yRot = 180.0F * cubic.rotationYaw / (float) Math.PI;
        }

        public void setDirection(float yaw, boolean aggressive) {
            this.yRot = yaw;
            this.aggressive = aggressive;
        }

        public void setMoveSpeed(double speedIn) {
            this.speed = speedIn;
            this.action = EntityMoveHelper.Action.MOVE_TO;
        }

        @Override
        public void onUpdateMoveHelper() {
            this.entity.rotationYaw = this.limitAngle(this.entity.rotationYaw, this.yRot, 90.0F);
            this.entity.rotationYawHead = this.entity.rotationYaw;
            this.entity.renderYawOffset = this.entity.rotationYaw;
            if (this.action != EntityMoveHelper.Action.MOVE_TO) {
                this.entity.setMoveForward(0.0F);
                return;
            }
            this.action = EntityMoveHelper.Action.WAIT;
            if (this.entity.onGround) {
                this.entity.setAIMoveSpeed((float) (this.speed
                        * this.entity.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).getAttributeValue()));
                if (this.jumpDelay-- <= 0) {
                    net.minecraft.entity.EntityLivingBase target = this.cubic.getAttackTarget();
                    this.jumpDelay = this.cubic.getJumpDelay(target);
                    if (this.aggressive) {
                        this.jumpDelay /= 3;
                    }
                    this.cubic.getJumpHelper().setJumping();
                    this.cubic.playSound(this.cubic.getJumpSound(), this.cubic.getSoundVolume(),
                            ((this.cubic.getRNG().nextFloat() - this.cubic.getRNG().nextFloat()) * 0.2F + 1.0F) * 0.8F);
                    this.cubic.moveStrafing = 1.0F - this.cubic.getRNG().nextFloat() * 2.0F;
                    this.cubic.moveForward = (float) this.cubic.getCubicSize();
                } else {
                    this.cubic.moveStrafing = 0.0F;
                    this.cubic.moveForward = 0.0F;
                    this.entity.setAIMoveSpeed(0.0F);
                }
            }
        }
    }
}
