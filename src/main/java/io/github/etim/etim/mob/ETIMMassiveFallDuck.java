package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLivingBase;

/**
 * B-38 drop-face pack — the R196 massive-fall flag carrier (R196
 * {@code EntityLivingBase.java:74 public boolean has_taken_massive_fall_damage}).
 * The flag is set by the fall() redirect in {@code MixinEntityLivingBase} and
 * consumed by three drop faces: the onDeath few-items mercy gate
 * (R196 :910 {@code !flag || rand < 0.1F}), the skeleton/zombie rare-drop
 * guards (R196 EntitySkeleton :161 / EntityZombie :153), and the equipment
 * main gate (R196 EntityLiving :989).
 */
public interface ETIMMassiveFallDuck {

    boolean etim$hasTakenMassiveFallDamage();

    void etim$setHasTakenMassiveFallDamage(boolean value);

    static boolean carries(EntityLivingBase entity) {
        return entity instanceof ETIMMassiveFallDuck;
    }
}
