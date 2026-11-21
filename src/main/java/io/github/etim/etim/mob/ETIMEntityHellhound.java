package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.monster.IMob;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.EntityAIAttackMelee;
import net.minecraft.entity.ai.EntityAIHurtByTarget;
import net.minecraft.entity.ai.EntityAILeapAtTarget;
import net.minecraft.entity.ai.EntityAILookIdle;
import net.minecraft.entity.ai.EntityAINearestAttackableTarget;
import net.minecraft.entity.ai.EntityAISit;
import net.minecraft.entity.ai.EntityAISwimming;
import net.minecraft.entity.ai.EntityAIWanderAvoidWater;
import net.minecraft.entity.ai.EntityAIWatchClosest;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.entity.passive.EntityWolf;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.ItemStack;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumHand;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.EnumDifficulty;
import net.minecraft.world.EnumSkyBlock;
import net.minecraft.world.World;

/**
 * B-61 — R196 {@code EntityHellhound} (128 lines, {@code extends EntityWolf
 * implements IMob}).
 *
 * <p>The R196 hellhound keeps the wolf <b>skeleton</b> and discards the wolf
 * <b>temperament</b>: it clears both AI lists, refuses taming, refuses
 * breeding and refuses feeding, then behaves as a fireproof underground
 * monster that bites players and animals and sets its victim alight.</p>
 *
 * <ul>
 *   <li>{@code :24-30} attributes: speed 0.4, 20 hp, attack 4.0 (follow stays
 *       the wolf's 32/16);</li>
 *   <li>{@code :31-47} the cleared task list (swim 1 / leap 0.4 @2 / melee
 *       1.0 @3 / get-out-of-water+lavva @4 / wander 1.0 @6 / watch 8 @7 /
 *       look-idle @7) and the target list (hurt-by 1 / player 0 @2 /
 *       animal 20 @4);</li>
 *   <li>{@code :56-69} the bite: 40% chance to set the victim on fire for
 *       1..8 seconds with the hellhound breath sound;</li>
 *   <li>{@code :75-98} fire/lava <b>damage</b> immunity (the burning state
 *       itself still applies — the D-3 ruling), permanent hostility towards
 *       players, no taming, no breeding, and the monster light gate;</li>
 *   <li>{@code :100-126} the day-averse path weight, no drops, experience ×3
 *       (5 → 15).</li>
 * </ul>
 *
 * <p>Flag seat: {@link ETIMConfig#livestockNeedsR196} (D-6 ruling).</p>
 */
public class ETIMEntityHellhound extends EntityWolf implements IMob {

    public ETIMEntityHellhound(World world) {
        super(world);
        this.setSize(0.6F, 0.8F); // R196 :25
        this.experienceValue = 15; // R196 :126 — super (5) * 3
        // R196 :26 setAvoidsWater(true) has no 1.12 navigator flag (C-B61-9);
        // the land-mob default already refuses water paths.
        this.etimApplyR196Attributes();
        this.setHealth(this.getMaxHealth());
    }

    private void etimApplyR196Attributes() {
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.4D);
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(20.0D);
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(4.0D);
        // R196 EntityWolf:49-50 -- follow 16 while untamed; the hellhound is never tame.
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(16.0D);
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.etimApplyR196Attributes();
    }

    // ------------------------------------------------------------------
    // R196 :31-47 — the cleared task/target lists
    // ------------------------------------------------------------------

    @Override
    protected void initEntityAI() {
        // R196 clears both lists; the 1.12 wolf's sit/follow-owner/mate/beg
        // and tamed-animal targets must not survive. aiSit is still seated so
        // EntityTameable#setSitting and the 1.12 wolf's own null-guards work.
        this.aiSit = new EntityAISit(this);
        this.tasks.taskEntries.clear();
        this.targetTasks.taskEntries.clear();

        this.tasks.addTask(1, new EntityAISwimming(this));
        this.tasks.addTask(2, new EntityAILeapAtTarget(this, 0.4F));
        this.tasks.addTask(3, new EntityAIAttackMelee(this, 1.0D, true));
        this.tasks.addTask(4, new ETIMEntityAIGetOutOfWater(this, 1.0F));
        this.tasks.addTask(4, new ETIMEntityAIGetOutOfLava(this, 1.0F));
        this.tasks.addTask(6, new EntityAIWanderAvoidWater(this, 1.0D));
        this.tasks.addTask(7, new EntityAIWatchClosest(this, EntityPlayer.class, 8.0F));
        this.tasks.addTask(7, new EntityAILookIdle(this));

        this.targetTasks.addTask(1, new EntityAIHurtByTarget(this, true));
        this.targetTasks.addTask(2,
                new EntityAINearestAttackableTarget<>(this, EntityPlayer.class, 0, true, false, null));
        this.targetTasks.addTask(4,
                new EntityAINearestAttackableTarget<>(this, EntityAnimal.class, 20, true, false, null));
    }

    // ------------------------------------------------------------------
    // R196 :75-98 — the taming / breeding refusal
    // ------------------------------------------------------------------

    @Override
    public boolean isTamed() {
        return false; // R196 :90-92
    }

    @Override
    public void setTamed(boolean tamed) {
        // R196 :90-92 — the hellhound is never tame; swallow the flag so the
        // wolf's tame-success health/attack rewrite can never fire.
    }

    @Override
    public boolean processInteract(EntityPlayer player, EnumHand hand) {
        ItemStack stack = player.getHeldItem(hand);
        if (!this.world.isRemote && !stack.isEmpty() && stack.getItem() == Items.BONE) {
            if (ETIMConfig.mobDebugLog) { // R196 :78-84 — canBeTamedBy = false
                ETIM.LOGGER.info("[BeastLog] hell tamereject player=" + player.getName()
                        + " hand=" + hand + " entity=" + this.getEntityId() + " [server]");
            }
            return true;
        }
        return super.processInteract(player, hand);
    }

    @Override
    public boolean isBreedingItem(ItemStack stack) {
        return false; // R196 :93-94 — isFoodItem = false, canMateWith = false
    }

    @Override
    public boolean canMateWith(EntityAnimal otherAnimal) {
        return false; // R196 :93
    }

    // ------------------------------------------------------------------
    // R196 :56-69 — the burning bite
    // ------------------------------------------------------------------

    @Override
    public boolean attackEntityAsMob(Entity entityIn) {
        boolean hit = super.attackEntityAsMob(entityIn);
        if (hit && entityIn instanceof EntityLivingBase) {
            EntityLivingBase target = (EntityLivingBase) entityIn;
            if (target.getHealth() > 0.0F && this.rand.nextFloat() < 0.4F) {
                int seconds = 1 + this.rand.nextInt(8); // R196 :64 — setFire(1 + rand(8))
                target.setFire(seconds);
                this.playSound(SoundEvents.ENTITY_BLAZE_BURN, 4.0F, 1.0F);
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[BeastLog] bite kind=hellhound target=" + target.getName()
                            + " fire=" + seconds
                            + " hurt=" + (target.getHealth() < target.getMaxHealth())
                            + " entity=" + this.getEntityId() + " [server]");
                }
            }
        }
        return hit;
    }

    // ------------------------------------------------------------------
    // R196 :75-98 — fire/lava damage immunity (D-3 ruling: the burning state
    // itself still applies, only the damage is refused)
    // ------------------------------------------------------------------

    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        if (!this.world.isRemote && source != null
                && (source.isFireDamage() || source == DamageSource.LAVA)) {
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[BeastLog] hell immune aspect=fire source=" + source.getDamageType()
                        + " entity=" + this.getEntityId() + " [server]");
            }
            return false;
        }
        return super.attackEntityFrom(source, amount);
    }

    // ------------------------------------------------------------------
    // R196 :96-98 / :100-126 — monster light gate, day-averse path weight
    // ------------------------------------------------------------------

    @Override
    public boolean getCanSpawnHere() {
        return this.world.getDifficulty() != EnumDifficulty.PEACEFUL
                && this.etimMonsterLightLevel()
                && super.getCanSpawnHere();
    }

    /** R196 {@code isValidLightLevel = EntityMob.isValidLightLevel(this)} — the 1.12 body, copied. */
    private boolean etimMonsterLightLevel() {
        BlockPos pos = new BlockPos(this.posX, this.getEntityBoundingBox().minY, this.posZ);
        if (this.world.getLightFor(EnumSkyBlock.SKY, pos) > this.rand.nextInt(32)) {
            return false;
        }
        int light = this.world.getLightFromNeighbors(pos);
        if (this.world.isThundering()) {
            int sky = this.world.getSkylightSubtracted();
            this.world.setSkylightSubtracted(10);
            light = this.world.getLightFromNeighbors(pos);
            this.world.setSkylightSubtracted(sky);
        }
        return light <= this.rand.nextInt(8);
    }

    @Override
    public float getBlockPathWeight(BlockPos pos) {
        return this.world.isDaytime() && this.world.canSeeSky(new BlockPos(this)) ? -0.5F : 10.0F; // R196 :104-106
    }

    // ------------------------------------------------------------------
    // R196 :46-51 — the mapped sounds (D-4 ruling) and the spawn judge row
    // ------------------------------------------------------------------

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.ENTITY_WOLF_GROWL;
    }

    @Override
    protected SoundEvent getHurtSound(DamageSource source) {
        return SoundEvents.ENTITY_WOLF_HURT;
    }

    @Override
    protected SoundEvent getDeathSound() {
        return SoundEvents.ENTITY_WOLF_DEATH;
    }

    /** B-61 probe: the R196 experience value (5 * 3). */
    public int etimXp() {
        return this.experienceValue;
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (!this.world.isRemote && this.ticksExisted == 1 && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[BeastLog] spawn kind=hellhound hp=" + fmt(this.getHealth())
                    + " max=" + fmt(this.getMaxHealth())
                    + " attack=" + fmt(this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue())
                    + " speed=" + fmt(this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).getAttributeValue())
                    + " follow=" + fmt(this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).getAttributeValue())
                    + " hostile=true tamed=false xp=" + this.experienceValue
                    + " entity=" + this.getEntityId() + " [server]");
        }
    }

    private static String fmt(double value) {
        return String.format(java.util.Locale.ROOT, "%.3f", value);
    }
}
