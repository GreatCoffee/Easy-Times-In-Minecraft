package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.EntityAIBreakDoor;
import net.minecraft.entity.ai.EntityAIHurtByTarget;
import net.minecraft.entity.ai.EntityAILookIdle;
import net.minecraft.entity.ai.EntityAIMoveTowardsRestriction;
import net.minecraft.entity.ai.EntityAINearestAttackableTarget;
import net.minecraft.entity.ai.EntityAISwimming;
import net.minecraft.entity.ai.EntityAIWanderAvoidWater;
import net.minecraft.entity.ai.EntityAIWatchClosest;
import net.minecraft.entity.ai.EntityAIAttackMelee;
import net.minecraft.entity.monster.EntityMob;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.entity.passive.EntityVillager;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.MobEffects;
import net.minecraft.init.SoundEvents;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.DamageSource;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * B-59 — R196 {@code EntityGhoul.java} (129 lines) +
 * {@code EntityAnimalWatcher.java} (:1-30 digger skin).
 *
 * <p>Faces carried here (R196 one-hand anchors):</p>
 * <ul>
 *   <li>ctor :4-21 — the ten-row task table: swim 0, breakDoor 1, player
 *       melee 2 (no long memory), villager melee 3 (long memory), animal
 *       melee 4 (long memory), restrict 4, wander 0.8 @6, watch 8 @7,
 *       lookIdle 7; targets hurtBy 1, player 2 (chance 0, sight),
 *       villager 2 (chance 0, no sight), animal 3 (chance 10, sight).</li>
 *   <li>attributes :24-29 — follow 40, speed 0.28, attack 5.0; max health
 *       stays the {@code EntityLivingBase} default 20 (R196 never overrides).</li>
 *   <li>attack :42-53 — a hit that lost health on any living target adds
 *       {@code Potion.moveSlowdown 50 ticks, amplifier 5}.</li>
 *   <li>digger skin :22-24 / :122-124 — {@code isDiggingEnabled =
 *       !isHoldingItemThatPreventsDigging()} and the cooloff override
 *       {@code super / 2} (the generic dig state machine reads both).</li>
 *   <li>sounds :56-74 — imported.mob.ghoul.{say,hurt,death} mapped to the
 *       vanilla zombie set (B-59 D-2 ruling A; the repo ships no .ogg);
 *       step = zombie step, volume 0.15 pitch 1.0.</li>
 *   <li>drops :78 — {@code getDropItemId() = -1}: nothing drops.</li>
 *   <li>creature attribute :84 — UNDEFINED (NOT undead); Smite must not
 *       apply and pepsin must harm it (R196 {@code EntityLivingBase}
 *       default).</li>
 *   <li>XP :126 — {@code super * 2} = 10.</li>
 * </ul>
 *
 * <p>Registered C notes: the meat-seeking {@code EntityAIMoveToFoodItem}
 * row (:18) rides the livestock-only carrier and stays logged (C-9); the
 * per-target long-memory split (:9/:10/:19) collapses to one long-memory
 * melee goal (C-10); {@code drawBackFaces()} (:118) is a pure render cull
 * face (C-4).</p>
 */
public class ETIMEntityGhoul extends EntityMob {

    public ETIMEntityGhoul(World world) {
        super(world);
        // R196 :6 — navigator.setBreakDoors(true); 1.12 has no navigator flag,
        // the EntityAIBreakDoor task is the carrier (mobGriefing gated).
        this.tasks.addTask(0, new EntityAISwimming(this));
        this.tasks.addTask(1, new EntityAIBreakDoor(this));
        this.tasks.addTask(2, new EntityAIAttackMelee(this, 1.0D, true)); // :9/:10/:19 collapsed (C-10)
        this.tasks.addTask(4, new EntityAIMoveTowardsRestriction(this, 1.0D));
        this.tasks.addTask(6, new EntityAIWanderAvoidWater(this, 0.8D));
        this.tasks.addTask(7, new EntityAIWatchClosest(this, EntityPlayer.class, 8.0F));
        this.tasks.addTask(7, new EntityAILookIdle(this));
        this.targetTasks.addTask(1, new EntityAIHurtByTarget(this, true));
        this.targetTasks.addTask(2, new EntityAINearestAttackableTarget<>(this, EntityPlayer.class, 0, true, false, null));
        this.targetTasks.addTask(2, new EntityAINearestAttackableTarget<>(this, EntityVillager.class, 0, false, false, null));
        this.targetTasks.addTask(3, new EntityAINearestAttackableTarget<>(this, EntityAnimal.class, 10, true, false, null));
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(40.0D); // :26
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.28D); // :27
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(5.0D); // :28
        // max health: R196 has no override → EntityLivingBase default 20.
    }

    @Override
    public boolean attackEntityAsMob(Entity target) {
        float before = target instanceof EntityLivingBase ? ((EntityLivingBase) target).getHealth() : 0.0F;
        boolean hit = super.attackEntityAsMob(target);
        if (hit && target instanceof EntityLivingBase && !target.isDead) {
            EntityLivingBase living = (EntityLivingBase) target;
            boolean lost = living.getHealth() < before;
            if (lost) {
                living.addPotionEffect(new PotionEffect(MobEffects.SLOWNESS, 50, 5)); // :42-53
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[UndeadLog] ghoul slow target={} ticks=50 amp=5 lost={} entity={}",
                            living.getName(), lost, this);
                }
            }
        }
        return hit;
    }

    /** R196 AnimalWatcher :22-24 — the dig gate; no tool requirement. */
    public boolean isGhoulDiggingEnabled() {
        return !ETIMDigging.isHoldingItemThatPreventsDigging(this);
    }

    /** R196 EntityGhoul :122-124 — the cooloff override {@code super / 2}. */
    public int getCooloffDivisor() {
        return 2;
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.ENTITY_ZOMBIE_AMBIENT; // D-2 A: imported.mob.ghoul.say
    }

    @Override
    protected SoundEvent getHurtSound(DamageSource source) {
        return SoundEvents.ENTITY_ZOMBIE_HURT;
    }

    @Override
    protected SoundEvent getDeathSound() {
        return SoundEvents.ENTITY_ZOMBIE_DEATH;
    }

    @Override
    protected void playStepSound(BlockPos pos, net.minecraft.block.Block blockIn) {
        this.playSound(SoundEvents.ENTITY_ZOMBIE_STEP, 0.15F, 1.0F); // :70-72
    }

    @Override
    protected int getExperiencePoints(EntityPlayer player) {
        return super.getExperiencePoints(player) * 2; // :126
    }

    /** B-59 W1 probe: the R196 XP row for {@code /etest undead}. */
    public int etimExperienceProbe(EntityPlayer player) {
        return this.getExperiencePoints(player);
    }

    /** R196 :96 — the predator face the livestock flee table reads. */
    public boolean preysUpon(Entity candidate) {
        return candidate instanceof EntityAnimal;
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (!this.world.isRemote && this.ticksExisted == 1 && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[UndeadLog] spawn kind=ghoul hp={} follow={} attack={} xp={} undead={} entity={}",
                    this.getMaxHealth(),
                    this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).getAttributeValue(),
                    this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue(),
                    this.experienceValue * 2, this.isEntityUndead(), this);
        }
    }
}
