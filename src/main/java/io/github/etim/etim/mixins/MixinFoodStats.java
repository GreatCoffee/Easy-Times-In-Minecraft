package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.DamageSource;
import net.minecraft.util.FoodStats;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Removes vanilla's food-driven regeneration (task 1.3):
 * the fast saturation heal (food 20+, 1/2 heart per half second) and the
 * slow heal (food 18+, 1 HP per 4 s) are both called from
 * {@code FoodStats.onUpdate} via {@code player.heal(...)} — redirected to
 * nothing. ETIM's regen owns healing: since task 1.5 that is the R196
 * heal_progress formula in {@code io.github.etim.etim.hunger.ETIMFoodStats}.
 *
 * <p>Since task 1.5 the starvation strike is suppressed too (the R196 starve
 * gate lives in {@code ETIMFoodStats.tick}, progression 0.002/tick with the
 * health/difficulty gate; vanilla charges once per 80 ticks off the same
 * bar that now mirrors {@code satiation + nutrition} — double damage must
 * not happen). With {@code ETIMConfig.foodModel} off the vanilla strike
 * passes through unchanged. Two heal call sites must exist, otherwise the
 * load fails loudly (Forge version drift protection).</p>
 */
@Mixin(FoodStats.class)
public abstract class MixinFoodStats {

    @Redirect(
            method = "onUpdate",
            at = @At(
                    value = "INVOKE",
                    // The receiver's declared type is EntityPlayer (javac emits its
                    // own class as the invokevirtual owner), NOT the declaring
                    // superclass EntityLivingBase.
                    target = "Lnet/minecraft/entity/player/EntityPlayer;heal(F)V"),
            require = 2
    )
    private void etim$suppressVanillaRegen(EntityPlayer player, float amount) {
        // R196 regen owns healing; vanilla rates are gone.
    }

    @Redirect(
            method = "onUpdate",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/player/EntityPlayer;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z"),
            require = 1
    )
    private boolean etim$suppressVanillaStarve(EntityPlayer player, DamageSource source, float amount) {
        if (ETIMConfig.foodModel) {
            return false; // the R196 gate in ETIMFoodStats owns starvation
        }
        return player.attackEntityFrom(source, amount);
    }
}
