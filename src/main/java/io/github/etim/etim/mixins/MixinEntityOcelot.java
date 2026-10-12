package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.DespawnRules;
import net.minecraft.entity.passive.EntityOcelot;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Vanilla 1.12's cat override returns flat {@code !tamed && ticks > 2400}
 * WITHOUT calling super — it would bypass the R196 chain (animal walls +
 * LOS gate) that MITE fits behind the same gate (R196 EntityOcelot:53-55,
 * {@code !tamed && ticks > 2400 ? super.canDespawn() : false}). Only the
 * gate→chain path differs, so the vanilla body is replaced when the switch
 * is on; Golem/Villager overrides (constant false both games) need no hook.
 * The vanilla 1.12 chicken-jockey gate is NOT carried — MITE 1.6.4 has no
 * chicken-jockey despawn rule, so chickens ride the plain animal layer
 * (noted in the run27 deviation list).
 */
@Mixin(EntityOcelot.class)
public abstract class MixinEntityOcelot {

    @Inject(method = "canDespawn", at = @At("HEAD"), cancellable = true)
    private void etim$canDespawn(CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        EntityOcelot self = (EntityOcelot) (Object) this;
        cir.setReturnValue(!self.isTamed() && self.ticksExisted > 2400
                && DespawnRules.canDespawn(self));
    }
}
