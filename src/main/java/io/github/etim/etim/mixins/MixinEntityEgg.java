package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.passive.EntityChicken;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyArg;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * B-12 (audit20 条 309) — the R196 egg-throw value faces:
 * <ul>
 *   <li>F-C(1) the hatchling's starting age — R196
 *       {@code EntityEgg :30} calls {@code setGrowingAgeToNewborn()} =
 *       {@code -64000}; vanilla writes {@code -24000} at
 *       {@code EntityEgg.onImpact :78}. Spawn chance / count faces are
 *       already verbatim on both sides (1-in-8 spawn, 1-in-32 litter of
 *       4, R196 :22-26 = vanilla :66-73) — untouched.</li>
 *   <li>F-C(2) the thrown-egg impact damage — R196
 *       {@code EntityEgg :19} hurts the struck entity with {@code 1.0F};
 *       vanilla carries {@code 0.0F} (:61). No other judgment face needs
 *       a carrier change (the poof broadcast rides 1.12's state-3 face,
 *       same 8 snowballpoof particles on both sides).</li>
 * </ul>
 */
@Mixin(net.minecraft.entity.projectile.EntityEgg.class)
public abstract class MixinEntityEgg {

    @Redirect(
        method = "onImpact",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/passive/EntityChicken;setGrowingAge(I)V"))
    private void etim$chickenNewbornAge(EntityChicken chicken, int age) {
        chicken.setGrowingAge(ETIMLivestockEvents.r196NewbornAge(age));
    }

    /**
     * F-C(2) — R196 {@code EntityEgg :19} carries {@code 1.0F}; vanilla
     * {@code :61} carries {@code 0.0F}. The call site's owner is the
     * STATIC receiver {@code Entity} (javac emits
     * {@code invokevirtual Lnet/minecraft/entity/Entity;attackEntityFrom} —
     * A-12-2, W-B12 verdict: the {@code EntityLivingBase} owner never
     * matched and the write sailed through unmodified). {@code require = 1}
     * per B-12-1: an unbound takeaway must be loud, not silent.
     */
    @ModifyArg(
        method = "onImpact",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/Entity;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z"),
        require = 1,
        index = 1)
    private float etim$eggImpactDamage(float amount) {
        return ETIMConfig.livestockNeedsR196 ? 1.0F : amount;
    }
}
