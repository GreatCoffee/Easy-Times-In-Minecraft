package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMEntityAISeekShelterFromRain;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.passive.AbstractHorse;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

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

    /**
     * B-19 (C-16-5 residual) — the R196 {@code EntityHorse} ctor :65 seat:
     * {@code addTask(4, EntityAISeekShelterFromRain, 1.0F)}. The unique
     * {@code (World)} ctor hosts every spawn chain (B-18 same carrier).
     * C-note 6: the 1.12 umbrella drags llama/skeleton horses along; R196's
     * horse is the single-class 0..4 family.
     */
    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$shelterAITask(net.minecraft.world.World world, CallbackInfo ci) {
        ((EntityLiving) (Object) this).tasks.addTask(4,
                new ETIMEntityAISeekShelterFromRain((EntityLiving) (Object) this, 1.0F));
    }

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
