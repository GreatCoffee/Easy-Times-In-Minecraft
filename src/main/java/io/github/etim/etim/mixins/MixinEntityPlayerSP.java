package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMHunger;
import net.minecraft.client.entity.EntityPlayerSP;
import net.minecraft.util.FoodStats;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Task 2.3: starving players cannot start (or keep) sprinting (R196
 * {@code ClientPlayer.java:129} — the sprint-start/stall gate reads
 * {@code hasFoodEnergy() || allowFlying}, exactly the vanilla structure
 * around {@code onLivingUpdate}'s {@code getFoodStats().getFoodLevel() > 6}
 * recipe). The redirect re-encodes the gate: 7 when the player has food
 * energy, 0 when hungry — the {@code > 6.0F} comparison then matches R196
 * bit-for-bit both for starting AND for the {@code !flag4} stop condition.
 *
 * <p>Sprinting in creative flight still works: vanilla's {@code
 * capabilities.allowFlying} clause inside {@code flag4} survives untouched
 * (same as R196).</p>
 */
@Mixin(EntityPlayerSP.class)
public abstract class MixinEntityPlayerSP {

    @Redirect(
            method = "onLivingUpdate",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/util/FoodStats;getFoodLevel()I"
            ),
            require = 1
    )
    private int etim$sprintRequiresFoodEnergy(FoodStats stats) {
        EntityPlayerSP self = (EntityPlayerSP) (Object) this;
        if (!ETIMConfig.hungerSprintDeny || ETIMHunger.hasFoodEnergy(self)) {
            return 7; // "> 6.0F" passes → may sprint
        }
        return 0; // "> 6.0F" fails → starving, no sprint
    }
}
