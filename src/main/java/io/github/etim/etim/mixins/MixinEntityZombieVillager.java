package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.passive.EntityVillager;
import net.minecraft.entity.monster.EntityZombieVillager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * B-18 (audit20 条 309 C级 8) — the child-cure age carry-over face. When a
 * baby zombie villager is cured, 1.12 {@code EntityZombieVillager
 * .finishConversion :237} hardcodes the freshly-born villager's age to
 * {@code -24000} (inside the existing {@code isChild()} gate — vanilla
 * keeps a cured child a child). R196 carries the same gate
 * {@code EntityZombie.java:360-362} but routes the write through
 * {@code setGrowingAgeToNewborn()} = {@code -64000} — the cure face is
 * R196's uniform newborn pipeline, not the vanilla spawn window.
 *
 * <p>carrier: a value-only redirect on the villager write (the vanilla
 * {@code isChild()} gate stays untouched ahead of it). The helper is
 * flag-gated inside — flag off passes the vanilla {@code -24000} back
 * verbatim, and the ageGateRow only rings when the value actually moved
 * (the helper's mapping), matching the other B-18 faces.</p>
 */
@Mixin(EntityZombieVillager.class)
public abstract class MixinEntityZombieVillager {

    @Redirect(
        method = "finishConversion",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/passive/EntityVillager;setGrowingAge(I)V"),
        require = 1)
    private void etim$cureChildAge(EntityVillager villager, int vanillaAge) {
        villager.setGrowingAge(ETIMLivestockEvents.r196NewbornAge(vanillaAge));
        if (villager.getGrowingAge() != vanillaAge) {
            ETIMLivestockEvents.ageGateRow("zombieCureChild", villager, villager.getGrowingAge());
        }
    }
}
