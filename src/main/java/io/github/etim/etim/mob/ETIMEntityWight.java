package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItems;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
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
import net.minecraft.init.Items;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.Item;
import net.minecraft.util.DamageSource;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * B-59 — R196 {@code EntityWight.java} (135 lines).
 *
 * <ul>
 *   <li>ctor :6-17 — swim 0, breakDoor 1, player melee 2, villager melee 3,
 *       restrict 4, wander 1.0 @6, watch 8 @7, lookIdle 7; targets
 *       hurtBy 1, nearest player 2 (chance 0, sight).</li>
 *   <li>attributes :19-24 — follow 40, speed 0.25, attack 5.0; HP stays
 *       the 20 default.</li>
 *   <li>immunity :27-29 — {@code isImmuneTo = !fire && !lava && !silver
 *       && !magic}: everything else is refused outright (no damage, no
 *       knockback, no aggro).</li>
 *   <li>attack :42-54 — on a living hit, if the victim is a player and
 *       {@code rand.nextFloat() < 0.4F}, drain
 *       {@code max((level + 1) * 10, 20)} experience points.</li>
 *   <li>drops :76-104 — 25% (50% when player-killed) rotten flesh; when
 *       player-killed, {@code rand.nextInt(200) < 5 + looting * 2} rolls
 *       copper / silver / gold / iron nugget.</li>
 *   <li>sounds :58-74 — imported.mob.wight.* mapped to the zombie set
 *       (D-2 A); step zombie 0.15/1.0.</li>
 *   <li>creature attribute UNDEAD :110; XP {@code super * 2} = 10 :132.</li>
 * </ul>
 *
 * <p>C-1: R196 also gates the rare drop on
 * {@code !has_taken_massive_fall_damage}; 1.12 has no such flag, so the
 * drop rides on {@code recentlyHit} alone. C-2: the drain resistance
 * chain ({@code getDrainAfterResistance}) is not restored — the raw drain
 * is subtracted.</p>
 */
public class ETIMEntityWight extends EntityMob {

    public ETIMEntityWight(World world) {
        super(world);
        this.tasks.addTask(0, new EntityAISwimming(this));
        this.tasks.addTask(1, new EntityAIBreakDoor(this));
        this.tasks.addTask(2, new EntityAIAttackMelee(this, 1.0D, true));
        this.tasks.addTask(4, new EntityAIMoveTowardsRestriction(this, 1.0D));
        this.tasks.addTask(6, new EntityAIWanderAvoidWater(this, 1.0D));
        this.tasks.addTask(7, new EntityAIWatchClosest(this, EntityPlayer.class, 8.0F));
        this.tasks.addTask(7, new EntityAILookIdle(this));
        this.targetTasks.addTask(1, new EntityAIHurtByTarget(this, true));
        this.targetTasks.addTask(2, new EntityAINearestAttackableTarget<>(this, EntityPlayer.class, 0, true, false, null));
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(40.0D); // :21
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.25D); // :22
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(5.0D); // :23
    }

    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        String aspect = ETIMDamageAspects.describe(source);
        boolean allowed = source.isFireDamage()          // :27-29 — fire aspect
                || source == DamageSource.LAVA           // lava
                || "silver".equals(aspect)               // silver aspect
                || "magic".equals(aspect);               // magic aspect
        if (!allowed) {
            if (ETIMConfig.mobDebugLog && !this.world.isRemote) {
                ETIM.LOGGER.info("[UndeadLog] wight immune aspect={} source={} entity={}",
                        aspect, source.getDamageType(), this);
            }
            return false;
        }
        return super.attackEntityFrom(source, amount);
    }

    @Override
    public boolean attackEntityAsMob(Entity target) {
        boolean hit = super.attackEntityAsMob(target);
        if (hit && !this.world.isRemote && target instanceof EntityPlayer && this.rand.nextFloat() < 0.4F) { // :42-54
            EntityPlayer player = (EntityPlayer) target;
            int drain = Math.max((player.experienceLevel + 1) * 10, 20);
            int levelBefore = player.experienceLevel;
            int totalBefore = player.experienceTotal;
            player.addExperience(-drain); // C-2: no resistance chain
            while (player.experience < 0.0F && player.experienceLevel > 0) {
                player.addExperienceLevel(-1);
                player.experience += (float) player.xpBarCap();
            }
            if (player.experience < 0.0F) {
                player.experience = 0.0F;
            }
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[UndeadLog] wight drain target={} amount={} level={}->{} total={}->{} entity={}",
                        player.getName(), drain, levelBefore, player.experienceLevel,
                        totalBefore, player.experienceTotal, this);
            }
        }
        return hit;
    }

    @Override
    protected void dropFewItems(boolean wasRecentlyHit, int looting) {
        boolean flesh = this.rand.nextFloat() < (wasRecentlyHit ? 0.5F : 0.25F);
        if (flesh) { // :84-88
            this.dropItem(Items.ROTTEN_FLESH, 1);
        }
        boolean nugget = false;
        int rareRoll = -1;
        if (wasRecentlyHit) {
            rareRoll = this.rand.nextInt(200);
        }
        if (wasRecentlyHit && rareRoll < 5 + looting * 2) { // :89-103 (C-1)
            int roll = this.rand.nextInt(4);
            Item nuggetItem = roll == 0 ? ETIMItems.nuggetCopper
                    : roll == 1 ? ETIMItems.nuggetSilver
                    : roll == 2 ? Items.GOLD_NUGGET
                    : Items.IRON_NUGGET;
            this.dropItem(nuggetItem, 1);
            nugget = true;
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[UndeadLog] wight drop flesh={} nugget={} hit={} rare_roll={} looting={} entity={}",
                    flesh, nugget, wasRecentlyHit, rareRoll, looting, this);
        }
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (!this.world.isRemote && this.ticksExisted == 1 && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[UndeadLog] spawn kind=wight hp={} follow={} attack={} xp={} undead={} entity={}",
                    this.getHealth(),
                    this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).getAttributeValue(),
                    this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue(),
                    this.getExperiencePoints(this.getAttackTarget() instanceof EntityPlayer
                            ? (EntityPlayer) this.getAttackTarget() : this.world.getClosestPlayerToEntity(this, 64.0D)),
                    this.getCreatureAttribute() == EnumCreatureAttribute.UNDEAD, this);
        }
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return SoundEvents.ENTITY_ZOMBIE_AMBIENT;
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
        this.playSound(SoundEvents.ENTITY_ZOMBIE_STEP, 0.15F, 1.0F);
    }

    @Override
    public EnumCreatureAttribute getCreatureAttribute() {
        return EnumCreatureAttribute.UNDEAD;
    }

    @Override
    protected int getExperiencePoints(EntityPlayer player) {
        return super.getExperiencePoints(player) * 2; // :132
    }

    /** B-59 W1 probe: the R196 XP row for {@code /etest undead}. */
    public int etimExperienceProbe(EntityPlayer player) {
        return this.getExperiencePoints(player);
    }
}
