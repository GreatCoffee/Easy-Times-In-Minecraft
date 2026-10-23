package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import com.google.common.base.Predicate;

import net.minecraft.block.material.Material;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.EntityAIAttackMelee;
import net.minecraft.entity.ai.EntityAIHurtByTarget;
import net.minecraft.entity.ai.EntityAILookIdle;
import net.minecraft.entity.ai.EntityAINearestAttackableTarget;
import net.minecraft.entity.ai.EntityAISwimming;
import net.minecraft.entity.ai.EntityAIWanderAvoidWater;
import net.minecraft.entity.ai.EntityAIWatchClosest;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.entity.monster.EntityMob;
import net.minecraft.entity.passive.EntityChicken;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.init.MobEffects;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.network.datasync.DataParameter;
import net.minecraft.network.datasync.DataSerializers;
import net.minecraft.network.datasync.EntityDataManager;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.DamageSource;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

/**
 * R196 {@code EntityArachnid} port (mite-src EntityArachnid.java :3-245 —
 * one-hand re-verified 2026-10-23). Verdict spider3-终审回执.md G-S1 = B line
 * with the parent corrected: extends {@link EntityMob}, NOT 1.12 EntitySpider —
 * the R196 Arachnid carries no jockey / on-spawn effect-group face
 * (Arachnid.onSpawnWithEgg :243-245 is an empty super) and must not inherit
 * the vanilla spider's 1%-jockey + hard-difficulty buff + Forge patch faces.
 *
 * <p>Judged faces carried here (R196 one-hand line anchors): num_webs web
 * throws (:14-19 init, :56-58 interval, :66-93 two-pass block ray), lead=10
 * predicted aim (:109-126), peaceful-during-day three-clause gate
 * (:147-152 via the target goal, :41-54 via checkSwitchingToPeaceful), jump
 * attack (:170-186 — D-S2 blank-tick face carried), drop faces (:194-204,
 * :180-182), web/poison immunity + ARTHROPOD (:207-223), climb bit (:22-27,
 * :225-240). N/A per verdict: curse-of-spiders deny (:253-255), snowball
 * aggro, tension effect group, EntityAIGetOutOfLava (Demon-only, logged).</p>
 */
public abstract class ETIMEntityArachnid extends EntityMob {

    /** R196 :22-27 — climb state bit (dataWatcher 16). */
    private static final DataParameter<Byte> CLIMBING =
            EntityDataManager.createKey(ETIMEntityArachnid.class, DataSerializers.BYTE);

    /** R196 :4. */
    int numWebs;

    protected ETIMEntityArachnid(World world, float scaling) {
        super(world);
        // R196 :8 — the scaling factor feeds BOTH axes (collision box, not the
        // render scale: BlackWidow/Phase 0.84F×0.54F, Demon 1.4F×0.9F per the
        // verdict's collision-box correction).
        this.setSize(1.4F * scaling, 0.9F * scaling);
        // R196 :9-13 — Phase is exempt from the init arm entirely (stays 0 =
        // never throws); Demon skips the trim (starts with rand(4) untrimmed).
        // No CaveSpider carrier exists in the ETIM universe, so the Cave
        // clause has no reachable counterpart here.
        if (world != null && !world.isRemote && !(this instanceof ETIMEntityPhaseSpider)) {
            this.numWebs = this.rand.nextInt(4);
            if (this.numWebs > 0 && !(this instanceof ETIMEntityDemonSpider)) {
                this.numWebs--;
            }
        }
    }

    @Override
    protected void entityInit() {
        super.entityInit();
        this.dataManager.register(CLIMBING, (byte) 0);
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound nbt) {
        super.writeEntityToNBT(nbt);
        nbt.setByte("num_webs", (byte) this.numWebs); // R196 :30-39 field name verbatim
    }

    @Override
    public void readEntityFromNBT(NBTTagCompound nbt) {
        super.readEntityFromNBT(nbt);
        this.numWebs = nbt.getByte("num_webs");
    }

    /** R196 :143 — the base Arachnid is peaceful in daylight. Wood/Demon override false. */
    public boolean peacefulDuringDay() {
        return true;
    }

    /** R196 :56-58 — 500 ticks between throws; Demon 200 (no Cave carrier). */
    protected int getTicksBetweenWebThrows() {
        return this instanceof ETIMEntityDemonSpider ? 200 : 500;
    }

    /** R196 :183-185 — jump is always enabled for arachnids. */
    public boolean canJump() {
        return true;
    }

    @Override
    protected void initEntityAI() {
        // vanilla-spider-shaped goal set (no R196 AI ids survive the port);
        // the melee goal is the verdict's jump-face carrier (D-S2/D-S3).
        this.tasks.addTask(1, new EntityAISwimming(this));
        this.tasks.addTask(4, new ETIMAIAttackMelee(this));
        this.tasks.addTask(5, new EntityAIWanderAvoidWater(this, 0.8D));
        this.tasks.addTask(6, new EntityAIWatchClosest(this, EntityPlayer.class, 8.0F));
        this.tasks.addTask(6, new EntityAILookIdle(this));
        this.targetTasks.addTask(1, new EntityAIHurtByTarget(this, false, new Class[0]));
        // R196 :147-152 peaceful gate + :258-260 LOS=false → checkSight=false.
        this.targetTasks.addTask(2, new ETIMSpiderTargetGoal<EntityPlayer>(this, EntityPlayer.class));
        // R196 :155-162 — chickens as prey (findNonPlayerToAttack face).
        this.targetTasks.addTask(3, new ETIMSpiderTargetGoal<EntityChicken>(this, EntityChicken.class));
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        // R196 :128-134. experienceValue=5 comes from the EntityMob ctor —
        // the R196 EntityLivingBase:2587-2589 fixed-5 baseline, same value.
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(12.0D);
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(28.0D);
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(1.0D);
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(4.0D);
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (!this.world.isRemote) {
            // R196 :62-64 climb bit + :41-54 daylight-truce probe.
            this.setBesideClimbableBlock(this.collidedHorizontally);
            this.checkSwitchingToPeaceful();
            // R196 :66-93 — web throw when the counter aligns, a living target
            // sits within 8 blocks, and the two-pass block ray is clear.
            if (this.numWebs > 0 && this.ticksExisted % this.getTicksBetweenWebThrows() == 0) {
                Entity target = this.getAttackTarget();
                if (target instanceof EntityLivingBase) {
                    EntityLivingBase elb = (EntityLivingBase) target;
                    double dist = this.getDistance(elb);
                    if (dist <= 8.0D) {
                        if (this.webRayClear(elb)) {
                            this.attackEntityWithRangedAttack(elb, 1.0F);
                        }
                    }
                }
            }
        }
    }

    /**
     * R196 :73-88 — two-pass block ray: eye→target-eye, on block hit re-limit
     * to the foot+0.25·height point and re-ray; clear → throw. The third
     * (entity-occlusion) pass is dropped per the verdict's C-grade note.
     */
    private boolean webRayClear(EntityLivingBase target) {
        Vec3d start = this.getPositionEyes(1.0F);
        Vec3d end = target.getPositionEyes(1.0F);
        RayTraceResult rc = this.world.rayTraceBlocks(start, end, false, true, false);
        if (rc != null && rc.typeOfHit == RayTraceResult.Type.BLOCK) {
            Vec3d limited = new Vec3d(target.posX,
                    target.getEntityBoundingBox().minY + target.height * 0.25F, target.posZ);
            rc = this.world.rayTraceBlocks(start, limited, false, true, false);
        }
        return rc == null || rc.typeOfHit != RayTraceResult.Type.BLOCK;
    }

    /**
     * R196 :109-126 — lead=10 predicted aim (pos+motion×lead per Entity:3192),
     * bow pitch sound, Demon/burning sets the web aflame, counter decrements.
     */
    public void attackEntityWithRangedAttack(EntityLivingBase target, float p) {
        ETIMEntityWeb web = new ETIMEntityWeb(this.world, this);
        int lead = 10;
        double dx = target.posX + target.motionX * lead - this.posX;
        double dy = target.posY + target.getEyeHeight() - 1.1F - web.posY;
        double dz = target.posZ + target.motionZ * lead - this.posZ;
        float f = MathHelper.sqrt(dx * dx + dz * dz) * 0.2F;
        web.shoot(dx, dy + f, dz, 0.8F, 0.0F);
        this.playSound(SoundEvents.ENTITY_ARROW_SHOOT, 1.0F,
                1.0F / (this.getRNG().nextFloat() * 0.4F + 0.8F));
        this.world.spawnEntity(web);
        if (this instanceof ETIMEntityDemonSpider || this.isBurning()) {
            web.setFire(10); // R196 :123 — carried seconds semantics
        }
        this.numWebs--;
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[MobLog] web-throw thrower=" + this.getName() + "#" + this.getEntityId()
                    + " target=" + target.getName() + "#" + target.getEntityId()
                    + " dist=" + Math.round(this.getDistance(target) * 10.0D) / 10.0D
                    + " burning=" + web.isBurning());
        }
    }

    /**
     * R196 :170-186 — jump attack face, invoked from the melee AI each update:
     * dist ∈ (2,6) ∩ rand(10)==0 → jump (onGround) or a blank tick (D-S2);
     * outside the band or dice missed → vanilla melee (super.updateTask).
     */
    protected boolean tryJumpAttack(Entity target) {
        double dx = target.posX - this.posX;
        double dz = target.posZ - this.posZ;
        float dist = MathHelper.sqrt(dx * dx + dz * dz);
        if (!(dist > 2.0F) || !(dist < 6.0F) || !this.canJump() || this.rand.nextInt(10) != 0) {
            return false;
        }
        if (this.onGround) {
            this.motionX = dx / dist * 0.5 * 0.8F + this.motionX * 0.2F;
            this.motionZ = dz / dist * 0.5 * 0.8F + this.motionZ * 0.2F;
            this.motionY = 0.4F;
            this.rotationYaw = (float) (MathHelper.atan2(dz, dx) * (180D / Math.PI)) - 90.0F;
            this.getNavigator().tryMoveToEntityLiving(target, 1.0D); // R196 :182-184 repath
        }
        return true;
    }

    /**
     * R196 :41-54 — an already-attacking arachnid whose species is peaceful
     * by day drops the player grudge 1/100 outdoors in bright light.
     */
    protected void checkSwitchingToPeaceful() {
        if (this.getAttackTarget() instanceof EntityPlayer
                && this.peacefulDuringDay()
                && this.getBrightness() > 0.5F
                && !(this.getRevengeTarget() instanceof EntityPlayer)
                && this.rand.nextInt(100) == 0
                && this.world.canSeeSky(new BlockPos(this.posX, this.posY, this.posZ))) {
            this.setAttackTarget(null);
        }
    }

    /** R196 :147-152 — the daytime gate behind the target goal's peaceful face. */
    protected boolean isDaytimeTruce() {
        return this.peacefulDuringDay()
                && this.getBrightness() > 0.5F
                && this.world.canSeeSky(new BlockPos(this.posX, this.posY, this.posZ));
    }

    /** R196 :180-182 — the arachnid base drop face. */
    @Override
    protected Item getDropItem() {
        return Items.STRING;
    }

    /** R196 :194-204 — player-kill web dump + eye dice (looting rides the roll). */
    @Override
    protected void dropFewItems(boolean wasRecentlyHit, int looting) {
        if (wasRecentlyHit) {
            while (this.numWebs-- > 0) {
                this.entityDropItem(new ItemStack(Items.STRING), 0.0F);
            }
        }
        if (wasRecentlyHit && (this.rand.nextInt(3) == 0 || this.rand.nextInt(1 + looting) > 0)) {
            this.entityDropItem(new ItemStack(Items.SPIDER_EYE, 1), 0.0F);
        }
    }

    // R196 :207-223 — spider-web/poison faces.
    @Override
    public void setInWeb() {
    }

    @Override
    public boolean isPotionApplicable(PotionEffect effect) {
        return effect.getPotion() == MobEffects.POISON ? false : super.isPotionApplicable(effect);
    }

    @Override
    public net.minecraft.entity.EnumCreatureAttribute getCreatureAttribute() {
        return net.minecraft.entity.EnumCreatureAttribute.ARTHROPOD;
    }

    @Override
    public boolean isOnLadder() {
        return this.isBesideClimbableBlock();
    }

    public boolean isBesideClimbableBlock() {
        return (this.dataManager.get(CLIMBING) & 1) != 0;
    }

    public void setBesideClimbableBlock(boolean climbing) {
        byte b = this.dataManager.get(CLIMBING);
        this.dataManager.set(CLIMBING, climbing ? (byte) (b | 1) : (byte) (b & -2));
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.ENTITY_SPIDER_AMBIENT; // R196 :157-163
    }

    @Override
    protected SoundEvent getHurtSound(DamageSource source) {
        return SoundEvents.ENTITY_SPIDER_HURT;
    }

    @Override
    protected SoundEvent getDeathSound() {
        return SoundEvents.ENTITY_SPIDER_DEATH;
    }

    @Override
    protected void playStepSound(BlockPos pos, net.minecraft.block.Block blockIn) {
        this.playSound(SoundEvents.ENTITY_SPIDER_STEP, 0.15F, 1.0F); // R196 :165-168
    }

    @Override
    public float getSoundVolume() {
        return super.getSoundVolume(); // Wood multiplies down (R196 :16-21)
    }

    @Override
    public float getSoundPitch() {
        return super.getSoundPitch(); // Wood multiplies up (R196 :23-28)
    }

    /** R196 :246-248 — exact-class probe (the poison-960 branch key). */
    public final boolean isBlackWidowSpider() {
        return this.getClass() == ETIMEntityBlackWidowSpider.class;
    }

    /**
     * R196 :147-152 + :155-162 + :258-260 — the shared target goal: the
     * peaceful-during-day three-clause gate, LOS=false (checkSight=false),
     * and the Wood brightness-range halving (:50-52).
     */
    static class ETIMSpiderTargetGoal<T extends EntityLivingBase> extends EntityAINearestAttackableTarget<T> {
        ETIMSpiderTargetGoal(ETIMEntityArachnid owner, Class<T> cls) {
            super(owner, cls, 10, false, false, (Predicate<? super T>) null);
        }

        @Override
        public boolean shouldExecute() {
            ETIMEntityArachnid owner = (ETIMEntityArachnid) this.taskOwner;
            if (owner.isDaytimeTruce()) {
                return false;
            }
            return super.shouldExecute();
        }

        @Override
        protected AxisAlignedBB getTargetableArea(double targetDistance) {
            EntityLiving owner = this.taskOwner;
            // R196 WoodSpider :50-52 — bright spots halve the targetting range.
            if (owner instanceof ETIMEntityWoodSpider && owner.getBrightness() >= 0.65F) {
                targetDistance *= 0.5D;
            }
            return super.getTargetableArea(targetDistance);
        }
    }

    /** shared melee goal — carries the R196 :170-186 jump/blank-tick face. */
    static class ETIMAIAttackMelee extends EntityAIAttackMelee {
        private final ETIMEntityArachnid spider;

        ETIMAIAttackMelee(ETIMEntityArachnid spider) {
            super(spider, 1.0D, true);
            this.spider = spider;
        }

        @Override
        public void updateTask() {
            EntityLivingBase target = this.attacker.getAttackTarget();
            if (target != null && this.spider.tryJumpAttack(target)) {
                return; // jump executed or blank tick (D-S2) — no melee this update
            }
            super.updateTask();
        }
    }
}
