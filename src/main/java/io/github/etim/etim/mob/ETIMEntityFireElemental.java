package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.block.Block;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.EnumCreatureAttribute;
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
import net.minecraft.entity.projectile.EntityArrow;
import net.minecraft.entity.projectile.EntitySnowball;
import net.minecraft.init.Enchantments;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.ItemStack;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * B-62 — R196 {@code EntityFireElemental.java} (200 lines, extends EntityMob).
 *
 * <p>Fire incarnate: immune to everything but water, snowballs and
 * non-fire-flavored magic ({@link #attackEntityFrom}); takes 1 water damage
 * every 40 offset ticks and fizzes while wet; heals 4 on the ambient-fire
 * cadence while standing in lava; bites set the target alight for 6s. No
 * biome weight row — the only natural source is the lava-tick spawner
 * ({@code ETIMLavaFireSpawner}, D-1 A).</p>
 */
public class ETIMEntityFireElemental extends EntityMob {

    private int ticksUntilNextFireSound;
    private int ticksUntilNextFizzSound;

    public ETIMEntityFireElemental(World world) {
        super(world);
        this.experienceValue = 15; // R196 getExperienceValue() = super * 3
        this.tasks.addTask(0, new EntityAISwimming(this));
        this.tasks.addTask(1, new ETIMEntityAIGetOutOfWater(this, 1.0F)); // R196 :12
        // R196 :13-19 — melee(Player) @2, melee(Villager) @3; 1.12 merges the two
        // collide rows into one melee (C-B59-10 reading), the villager row rides
        // the target table instead.
        this.tasks.addTask(2, new net.minecraft.entity.ai.EntityAIAttackMelee(this, 1.0D, true));
        this.tasks.addTask(2, new ETIMEntityAISeekShelterFromRain(this, 1.0F)); // R196 :15
        this.tasks.addTask(4, new EntityAIMoveTowardsRestriction(this, 1.0D));
        this.tasks.addTask(6, new EntityAIWanderAvoidWater(this, 1.0D));
        this.tasks.addTask(7, new EntityAIWatchClosest(this, EntityPlayer.class, 8.0F));
        this.tasks.addTask(7, new EntityAILookIdle(this));
        this.targetTasks.addTask(1, new EntityAIHurtByTarget(this, true));
        this.targetTasks.addTask(2,
                new EntityAINearestAttackableTarget<>(this, EntityPlayer.class, 0, true, false, null));
        this.targetTasks.addTask(3,
                new EntityAINearestAttackableTarget<>(this, EntityVillager.class, 0, false, false, null));
        this.isImmuneToFire = true;
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(40.0D); // R196 :22-28
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.25D);
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(5.0D);
    }

    // ==================== immunity (R196 :35-57) ====================

    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        boolean water = source == DamageSource.DROWN || "water".equals(source.getDamageType());
        Entity immediate = source.getImmediateSource();
        boolean snowball = immediate instanceof EntitySnowball;
        boolean fireFlavored = this.isFireFlavored(source, immediate);
        boolean allowed = water || snowball
                || (ETIMDamageAspects.hasMagic(source) && !fireFlavored);
        if (!allowed) {
            if (ETIMConfig.mobDebugLog && !this.world.isRemote) {
                ETIM.LOGGER.info("[ElementalLog] immune kind=fire source={} entity={} [server]",
                        source.getDamageType(), this.getEntityId());
            }
            return false;
        }
        return super.attackEntityFrom(source, amount);
    }

    /** R196: flame arrows and fire-aspect melee are still fire damage. */
    private boolean isFireFlavored(DamageSource source, Entity immediate) {
        if (immediate instanceof EntityArrow) {
            return ((EntityArrow) immediate).isBurning();
        }
        if (source.getTrueSource() instanceof EntityLivingBase) {
            ItemStack held = ((EntityLivingBase) source.getTrueSource()).getHeldItemMainhand();
            return net.minecraft.enchantment.EnchantmentHelper.getEnchantmentLevel(Enchantments.FIRE_ASPECT, held) > 0;
        }
        return false;
    }

    // ==================== tick (R196 :63-91) ====================

    @Override
    public void onLivingUpdate() {
        if (this.world.isRemote && this.isWet()) {
            this.spawnSteam(this.isInWater() ? 10 : 1);
        }
        if (!this.world.isRemote) {
            int offsetTicks = this.ticksExisted + this.getEntityId() * 47; // R196 getTicksExistedWithOffset
            if (offsetTicks % 40 == 0) {
                this.attackEntityFrom(DamageSource.DROWN, 1.0F);
            }
            if (this.isWet()) {
                if (--this.ticksUntilNextFizzSound <= 0) {
                    this.playSound(SoundEvents.BLOCK_FIRE_EXTINGUISH, 0.7F,
                            1.6F + (this.rand.nextFloat() - this.rand.nextFloat()) * 0.4F);
                    this.ticksUntilNextFizzSound = this.rand.nextInt(7) + 2;
                    if (this.rand.nextInt(this.isInWater() ? 1 : 4) == 0) {
                        this.attackEntityFrom(DamageSource.DROWN, 1.0F);
                    }
                }
            } else if (--this.ticksUntilNextFireSound <= 0) {
                this.playSound(SoundEvents.BLOCK_FIRE_AMBIENT, 1.0F + this.rand.nextFloat(),
                        this.rand.nextFloat() * 0.7F + 0.3F);
                this.ticksUntilNextFireSound = this.rand.nextInt(21) + 30;
                if (this.isInLava()) {
                    this.heal(4.0F); // R196 :84-86
                }
            }
        }
        super.onLivingUpdate();
        if (!this.world.isRemote && this.ticksExisted == 1) {
            this.logSpawn();
        }
    }

    private void spawnSteam(int count) {
        for (int i = 0; i < count; i++) {
            this.world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL,
                    this.posX + (this.rand.nextDouble() - 0.5D) * this.width,
                    this.posY + this.rand.nextDouble() * this.height,
                    this.posZ + (this.rand.nextDouble() - 0.5D) * this.width,
                    0.0D, 0.08D, 0.0D);
        }
    }

    private void logSpawn() {
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[ElementalLog] spawn kind=fire hp={} max={} attack={} speed={} follow={} xp={} entity={} [server]",
                    this.getHealth(), this.getMaxHealth(),
                    this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue(),
                    this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).getAttributeValue(),
                    this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).getAttributeValue(),
                    this.experienceValue, this.getEntityId());
        }
    }

    // ==================== attack (R196 :98-110) ====================

    @Override
    public boolean attackEntityAsMob(Entity target) {
        float before = target instanceof EntityLivingBase ? ((EntityLivingBase) target).getHealth() : 0.0F;
        boolean hit = super.attackEntityAsMob(target);
        if (hit && !this.world.isRemote && target instanceof EntityLivingBase
                && ((EntityLivingBase) target).getHealth() < before) { // R196 entityLostHealth()
            target.setFire(6); // R196 :102-104
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[ElementalLog] bite kind=fire target={} fire=6 entity={} [server]",
                        target.getName(), this.getEntityId());
            }
        }
        return hit;
    }

    // ==================== misc ====================

    @Override
    public boolean isBurning() {
        return true; // R196 isBurning() = true
    }

    @Override
    protected boolean isValidLightLevel() {
        return true; // R196
    }


    @Override
    public boolean canBreatheUnderwater() {
        return false;
    }

    @Override
    public EnumCreatureAttribute getCreatureAttribute() {
        return EnumCreatureAttribute.UNDEFINED;
    }

    @Override
    protected SoundEvent getAmbientSound() {
        return null; // R196 声音全 null（火声由 tick 手动播）
    }

    @Override
    protected SoundEvent getHurtSound(DamageSource source) {
        return null;
    }

    @Override
    protected SoundEvent getDeathSound() {
        return null;
    }

    @Override
    protected void playStepSound(BlockPos pos, Block blockIn) {
        // R196 playStepSound 空实现
    }

    public int etimExperienceProbe(EntityPlayer player) {
        return this.getExperiencePoints(player);
    }
}
