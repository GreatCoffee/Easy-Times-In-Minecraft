package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLiving;

/**
 * B-33 — the duck face for the R196
 * {@code increased_chance_of_spreading_fire_countdown} field (R196
 * {@code EntityLiving.java:41}). 1.12 {@code EntityLiving} carries no such
 * field; the storage is a mixin-added field on {@code MixinEntityLiving}
 * (this interface is the mixin class's {@code implements} contract).
 */
public interface ETIMFireCountdownDuck {

    int etim$getIncreasedChanceOfSpreadingFireCountdown();

    void etim$setIncreasedChanceOfSpreadingFireCountdown(int value);

    /**
     * The {@code instanceof} probe (mixin-added interfaces only light up on
     * the merged class).
     */
    static boolean carries(EntityLiving living) {
        return living instanceof ETIMFireCountdownDuck;
    }
}
