package io.github.etim.etim.mixins;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.FoodStats;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Removes vanilla's food-driven regeneration (task 1.3):
 * the fast saturation heal (food 20+, 1/2 heart per half second) and the
 * slow heal (food 18+, 1 HP per 4 s) are both called from
 * {@code FoodStats.onUpdate} via {@code player.heal(...)} — redirected to
 * nothing. ETIM's slow regen takes over
 * ({@code io.github.etim.etim.playerstate.PlayerNaturalRegen}).
 *
 * <p>Nothing else in the method is touched: hunger drain, exhaustion and
 * starvation damage stay vanilla; potions, absorption etc. heal elsewhere
 * and are unaffected. Two call sites must exist, otherwise the load
 * fails loudly (Forge version drift protection).</p>
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
}
