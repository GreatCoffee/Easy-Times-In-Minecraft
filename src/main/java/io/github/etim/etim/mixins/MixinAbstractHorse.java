package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.passive.AbstractHorse;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * B-18 (audit20 条 309 C级 8) — the natural foal face. On a natural horse
 * spawn 1.12 {@code AbstractHorse.onInitialSpawn :1322} flips the 1-in-5
 * gate and hardcodes the foal's age to {@code -24000}; R196's same gate
 * ({@code EntityHorse :1364-1366}, single-class horse family 0..4) routes
 * the write through {@code setGrowingAgeToNewborn()} = {@code -64000}.
 *
 * <p>carrier: value-only redirect — the vanilla 1/5 gate stays untouched.
 * R196 computes the same gate before its newborn write, so only the value
 * face is carried here. Composition with B-17's horse burst is clean: the
 * burst rides {@code EntityAgeable.onLivingUpdate} (per-tick growth), this
 * face rides the one-shot natural-spawn path. Flag inside the helper; the
 * ageGateRow only rings when the value actually moved.</p>
 */
@Mixin(AbstractHorse.class)
public abstract class MixinAbstractHorse {

    @Redirect(
        method = "onInitialSpawn",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/passive/AbstractHorse;setGrowingAge(I)V"),
        require = 1)
    private void etim$foalSpawnAge(AbstractHorse foal, int vanillaAge) {
        foal.setGrowingAge(ETIMLivestockEvents.r196NewbornAge(vanillaAge));
        if (foal.getGrowingAge() != vanillaAge) {
            ETIMLivestockEvents.ageGateRow("horseFoalSpawn", foal, foal.getGrowingAge());
        }
    }
}
