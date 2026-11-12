package io.github.etim.etim.mob;

/**
 * B-35 — the {@code food_or_repair_item_pickup_cooldown} duck for the
 * non-livestock repair-family mobs (skeleton/snowman). R196 {@code
 * EntityLiving :30} keeps the field on the living itself; the livestock
 * carry it in {@code ETIMLivestock.IState} (the B-11 arm), so this duck
 * covers only the mobs that {@code MixinEntityLiving} can bolt it onto.
 * One {@code @Unique} int + get/set, same shape as
 * {@link ETIMFireCountdownDuck} (the B-33 precedent).
 */
public interface ETIMRepairCooldownDuck {

    int etim$getRepairPickupCooldown();

    void etim$setRepairPickupCooldown(int value);
}
