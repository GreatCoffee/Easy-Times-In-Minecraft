package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.EnumCreatureAttribute;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.EntityAIAttackMelee;
import net.minecraft.entity.ai.EntityAIFleeSun;
import net.minecraft.entity.ai.EntityAIHurtByTarget;
import net.minecraft.entity.ai.EntityAILookIdle;
import net.minecraft.entity.ai.EntityAIMoveTowardsRestriction;
import net.minecraft.entity.ai.EntityAINearestAttackableTarget;
import net.minecraft.entity.ai.EntityAIRestrictSun;
import net.minecraft.entity.ai.EntityAISwimming;
import net.minecraft.entity.ai.EntityAIWanderAvoidWater;
import net.minecraft.entity.ai.EntityAIWatchClosest;
import net.minecraft.entity.monster.EntityMob;
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
 * B-59 — R196 {@code EntityShadow.java} (143 lines).
 *
 * <ul>
 *   <li>ctor :6-19 — swim 0, restrictSun 2, fleeSun 3, player melee 2,
 *       villager melee 3, seek-lit-torch 3, restrict 4, wander 1.0 @6,
 *       watch 8 @7, lookIdle 7; targets hurtBy 1, nearest player 2.</li>
 *   <li>attributes :21-26 — follow 40, speed 0.23, attack 5.0; HP 20.</li>
 *   <li>immunity :29-31 — only silver / magic / sunlight get through.</li>
 *   <li>sunlight :39-44 — server side, {@code isInSunlight()} burns for
 *       1000 through the bypass-armor sunlight aspect.</li>
 *   <li>regrowth :45-53 — every 40 ticks heals
 *       {@code (0.4F - brightness) * 10} when positive; every tick calls
 *       the light-source suppression pass.</li>
 *   <li>attack :57-73 — a negative hit on a player adds 2.0 vision
 *       dimming; a health-losing hit adds weakness 600 ticks amp 0.</li>
 *   <li>sounds :77-93 — imported.mob.shadow.* mapped to the zombie set
 *       (D-2 A), volume 0.2, empty step.</li>
 *   <li>no drops :96; UNDEAD :108; XP {@code super * 2} = 10 :130;
 *       {@code isHarmedByFire/Lava = false} :114/:118.</li>
 * </ul>
 *
 * <p>C-5: R196's {@code getAmountAfterResistance(2.0F, 4)} is applied raw
 * (+2.0).</p>
 */
public class ETIMEntityShadow extends EntityMob {

    public ETIMEntityShadow(World world) {
        super(world);
        this.tasks.addTask(0, new EntityAISwimming(this));
        this.tasks.addTask(2, new EntityAIRestrictSun(this));
        this.tasks.addTask(2, new EntityAIAttackMelee(this, 1.0D, true));
        this.tasks.addTask(3, new EntityAIFleeSun(this, 1.0D));
        this.tasks.addTask(3, new ETIMEntityAISeekLitTorch(this, 1.0F));
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
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(40.0D); // :23
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.23D); // :24
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(5.0D); // :25
    }

    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        String aspect = ETIMDamageAspects.describe(source);
        boolean allowed = "silver".equals(aspect)                 // :29-31
                || "magic".equals(aspect)
                || "sunlight".equals(aspect);
        if (!allowed) {
            if (ETIMConfig.mobDebugLog && !this.world.isRemote) {
                ETIM.LOGGER.info("[UndeadLog] shadow immune aspect={} source={} entity={}",
                        aspect, source.getDamageType(), this);
            }
            return false;
        }
        return super.attackEntityFrom(source, amount);
    }

    public boolean isInSunlight() {
        return this.world.isDaytime() && this.world.canSeeSky(new BlockPos(this));
    }

    @Override
    public void onLivingUpdate() {
        if (!this.world.isRemote) {
            if (this.ticksExisted == 1 && ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[UndeadLog] spawn kind=shadow hp={} follow={} attack={} xp={} undead={} entity={}",
                        this.getMaxHealth(),
                        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).getAttributeValue(),
                        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue(),
                        this.experienceValue * 2, this.isEntityUndead(), this);
            }
            if (this.isInSunlight()) {
                this.attackEntityFrom(ETIMDamageAspects.SUNLIGHT, 1000.0F); // :39-44
            } else if (this.ticksExisted % 40 == 0) {
                float brightness = this.getBrightness();
                int amount = (int) ((0.4F - brightness) * 10.0F); // :45-53
                if (amount > 0) {
                    this.heal(amount);
                    if (ETIMConfig.mobDebugLog) {
                        ETIM.LOGGER.info("[UndeadLog] shadow regrow brightness={} heal={} entity={}",
                                brightness, amount, this);
                    }
                }
            }
            ETIMLightSourceSuppression.tryDisableNearbyLightSource(this);
        }
        super.onLivingUpdate();
    }

    @Override
    public boolean attackEntityAsMob(Entity target) {
        boolean hit = super.attackEntityAsMob(target);
        if (hit && !this.world.isRemote) {
            if (target instanceof EntityPlayer) {
                ETIMVisionDimming.add((EntityPlayer) target, 2.0F); // :57-65 (C-5)
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[UndeadLog] shadow dim target={} amount=2.0 entity={}",
                            target.getName(), this);
                }
            }
            if (target instanceof EntityLivingBase && ((EntityLivingBase) target).getHealth() < ((EntityLivingBase) target).getMaxHealth()) {
                ((EntityLivingBase) target).addPotionEffect(new PotionEffect(MobEffects.WEAKNESS, 600, 0)); // :66-73
            }
        }
        return hit;
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
    protected float getSoundVolume() {
        return 0.2F; // :86
    }

    @Override
    public EnumCreatureAttribute getCreatureAttribute() {
        return EnumCreatureAttribute.UNDEAD; // :108
    }

    @Override
    protected int getExperiencePoints(EntityPlayer player) {
        return super.getExperiencePoints(player) * 2; // :130
    }

    /** B-59 W1 probe: the R196 XP row for {@code /etest undead}. */
    public int etimExperienceProbe(EntityPlayer player) {
        return this.getExperiencePoints(player);
    }
}
