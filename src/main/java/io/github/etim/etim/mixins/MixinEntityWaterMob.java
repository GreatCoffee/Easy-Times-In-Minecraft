package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.DespawnRules;
import net.minecraft.entity.passive.EntityWaterMob;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * EntityWaterMob overrides canDespawn in vanilla 1.12 with {@code true} —
 * its own mixin is required so the water-mob layer (the −9600 view reset)
 * actually resolves for squids/dolphins. With mobs.mobDespawnR196 = false
 * the vanilla body (still true) wins.
 */
@Mixin(EntityWaterMob.class)
public abstract class MixinEntityWaterMob {

    @Inject(method = "canDespawn", at = @At("HEAD"), cancellable = true)
    private void etim$canDespawn(CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        cir.setReturnValue(DespawnRules.canDespawn((EntityWaterMob) (Object) this));
    }
}
