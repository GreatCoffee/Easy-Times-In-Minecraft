package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.entity.EnumCreatureAttribute;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.EntityAIAttackMelee;
import net.minecraft.entity.ai.EntityAIBreakDoor;
import net.minecraft.entity.ai.EntityAIHurtByTarget;
import net.minecraft.entity.ai.EntityAILookIdle;
import net.minecraft.entity.ai.EntityAIMoveTowardsRestriction;
import net.minecraft.entity.ai.EntityAINearestAttackableTarget;
import net.minecraft.entity.ai.EntityAISwimming;
import net.minecraft.entity.ai.EntityAIWanderAvoidWater;
import net.minecraft.entity.ai.EntityAIWatchClosest;
import net.minecraft.entity.monster.EntityMob;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.SoundEvents;
import net.minecraft.util.DamageSource;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * B-60 — R196 {@code EntityInvisibleStalker.java} (102 lines).
 *
 * <p>Surface undead family member 4/4: a nearly transparent stalker
 * (renderer alpha 0.05, wight texture) that snuffs torches each tick and
 * walks toward lit sources (1/200 roll). Stats: follow 40, speed 0.23,
 * attack 4.0, HP 20 (no override in R196), XP 10, no drops, creature
 * attribute {@code UNDEFINED}.</p>
 *
 * <p>R196 task rows: 0 swim, 2 melee(Player), 3 melee(Villager),
 * 4 move-towards-restriction, 4 seek-lit-torch, 6 wander, 7 watch/look;
 * targets: 1 hurt-by, 2 nearest player (chance 0, sight). 1.12 merges the
 * per-class collide rows into one {@link EntityAIAttackMelee} (same reading
 * as C-B59-10); the villager row has no target source in R196 either, so
 * it is inert there and omitted here.</p>
 */
public class ETIMEntityInvisibleStalker extends EntityMob {

    public ETIMEntityInvisibleStalker(World world) {
        super(world);
        this.experienceValue = 10; // R196 getExperienceValue() * 2, base 5
        this.tasks.addTask(0, new EntityAISwimming(this));
        this.tasks.addTask(1, new EntityAIBreakDoor(this)); // R196 navigator.setBreakDoors(true)
        this.tasks.addTask(2, new EntityAIAttackMelee(this, 1.0D, true));
        this.tasks.addTask(4, new EntityAIMoveTowardsRestriction(this, 1.0D));
        this.tasks.addTask(4, new ETIMEntityAISeekLitTorch(this, 1.0D)); // :16
        this.tasks.addTask(6, new EntityAIWanderAvoidWater(this, 1.0D));
        this.tasks.addTask(7, new EntityAIWatchClosest(this, EntityPlayer.class, 8.0F));
        this.tasks.addTask(7, new EntityAILookIdle(this));
        this.targetTasks.addTask(1, new EntityAIHurtByTarget(this, true));
        this.targetTasks.addTask(2,
                new EntityAINearestAttackableTarget<>(this, EntityPlayer.class, 0, true, false, null));
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(40.0D); // :22
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.23D); // :23
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(4.0D); // :24
    }

    @Override
    public void onLivingUpdate() {
        // R196 :38-41 — before super, every tick.
        ETIMLightSourceSuppression.tryDisableNearbyLightSource(this, "stalker");
        super.onLivingUpdate();
        if (!this.world.isRemote && this.ticksExisted == 1 && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[StalkerLog] spawn kind=stalker hp={} max={} follow={} attack={} speed={} xp={} undead={} invisible={} entity={}",
                    this.getHealth(), this.getMaxHealth(),
                    this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).getAttributeValue(),
                    this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue(),
                    this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).getAttributeValue(),
                    this.experienceValue,
                    this.getCreatureAttribute() == EnumCreatureAttribute.UNDEAD,
                    this.isInvisible(),
                    this.getEntityId());
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.ENTITY_ZOMBIE_AMBIENT; // D-2: imported.mob.invisiblestalker.* → vanilla zombie
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
    protected float getSoundVolume() {
        return 0.2F; // :63-65
    }

    @Override
    protected void playStepSound(BlockPos pos, net.minecraft.block.Block blockIn) {
        // R196 :58-60 — silent footsteps.
    }

    @Override
    public EnumCreatureAttribute getCreatureAttribute() {
        return EnumCreatureAttribute.UNDEFINED; // :72-75
    }

    /** B-59 harness probe parity for the undead family. */
    public int etimExperienceProbe(EntityPlayer player) {
        return this.getExperiencePoints(player);
    }
}
