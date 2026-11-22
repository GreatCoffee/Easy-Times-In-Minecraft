package io.github.etim.etim.world;

import io.github.etim.etim.mob.ETIMMassiveFallDuck;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.init.MobEffects;
import net.minecraft.init.SoundEvents;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.DamageSource;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * R196 fall formula (census F :85; {@code EntityLivingBase.java:1010-1109}).
 *
 * <p>R196 differs from vanilla 1.12 in three ways:</p>
 * <ul>
 *   <li>safe height is 2.5 blocks, not 3.0;</li>
 *   <li>the raw damage is doubled ({@code damage *= 2.0F});</li>
 *   <li>the landing block's cushioning is applied
 *       ({@code damage -= cushioning * 10.0F; damage *= 1.0F - cushioning;}
 *       after clamping the sum to 1.0F).</li>
 * </ul>
 *
 * <p>Jump Boost reduces the fall distance by {@code amplifier + 1}. The
 * massive-fall flag is raised when the pre-cushion damage reaches half the
 * entity's max health ({@code EntityLivingBase.java:1130-1133}).</p>
 */
public final class ETIMFall {

    private ETIMFall() {
    }

    /** R196 raw damage before cushioning; negative when below the safe height. */
    public static float rawDamage(EntityLivingBase entity, float distance) {
        PotionEffect jump = entity.getActivePotionEffect(MobEffects.JUMP_BOOST);
        int amp = jump == null ? 0 : jump.getAmplifier() + 1;
        return (distance - 2.5F - amp) * 2.0F;
    }

    /** R196 damage after cushioning at the given resting block. */
    public static float damageAfterCushioning(EntityLivingBase entity, float distance, BlockPos resting) {
        return afterCushioning(rawDamage(entity, distance),
                ETIMCushioning.total(entity.world, resting));
    }

    /** R196 {@code damage -= c*10; damage *= 1-c} for a known cushioning value. */
    public static float afterCushioning(float rawDamage, float cushioning) {
        if (rawDamage < 1.0F) {
            return 0.0F;
        }
        float damage = rawDamage - cushioning * 10.0F;
        damage *= 1.0F - cushioning;
        return Math.max(damage, 0.0F);
    }

    /**
     * Applies the R196 fall body. Called from the {@code MixinEntityLivingBase}
     * HEAD hook; the vanilla body is cancelled by the caller.
     */
    public static void apply(EntityLivingBase entity, float distance, float damageMultiplier,
            ETIMMassiveFallDuck duck) {
        World world = entity.world;
        if (distance < 0.5F) {
            return;
        }
        for (Entity passenger : entity.getPassengers()) {
            passenger.fall(distance, damageMultiplier);
        }
        if (world.isRemote) {
            return;
        }
        float damage = rawDamage(entity, distance);
        if (damage < 1.0F) {
            return;
        }
        BlockPos resting = new BlockPos(entity.posX, entity.posY - 0.1D, entity.posZ);
        float cushioning = ETIMCushioning.total(world, resting);
        if (damage >= entity.getMaxHealth() * 0.5F) {
            duck.etim$setHasTakenMassiveFallDamage(true);
        }
        damage -= cushioning * 10.0F;
        damage *= 1.0F - cushioning;
        if (damage <= 0.0F) {
            return;
        }
        world.playSound(null, entity.posX, entity.posY, entity.posZ,
                damage > 4.0F ? SoundEvents.ENTITY_GENERIC_BIG_FALL : SoundEvents.ENTITY_GENERIC_SMALL_FALL,
                SoundCategory.NEUTRAL, 1.0F, 1.0F);
        entity.attackEntityFrom(DamageSource.FALL, damage);
    }
}
