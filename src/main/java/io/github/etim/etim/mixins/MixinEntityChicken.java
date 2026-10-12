package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.DespawnRules;
import net.minecraft.entity.passive.EntityChicken;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Vanilla 1.12's chicken override gates on the chicken-jockey rider rule —
 * MITE 1.6.4 has no chicken-jockey despawn mechanic, so R196 chickens run
 * the plain animal layer + LOS gate like every other livestock animal. With
 * mobs.mobDespawnR196 = false the vanilla body wins (see also the deviation
 * list: the jockey gate is dropped only while the switch is on).
 */
@Mixin(EntityChicken.class)
public abstract class MixinEntityChicken {

    @Inject(method = "canDespawn", at = @At("HEAD"), cancellable = true)
    private void etim$canDespawn(CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        cir.setReturnValue(DespawnRules.canDespawn((EntityChicken) (Object) this));
    }
}
