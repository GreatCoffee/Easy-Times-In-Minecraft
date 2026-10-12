package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.DespawnRules;
import net.minecraft.entity.passive.EntityAnimal;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * EntityAnimal overrides canDespawn in vanilla 1.12 with {@code false}
 * (animals never despawn) — its own mixin is therefore needed so the R196
 * animal layer + the base LOS gate actually resolve for animal entities.
 * With mobs.mobDespawnR196 = false the vanilla body (still false) wins.
 */
@Mixin(EntityAnimal.class)
public abstract class MixinEntityAnimal {

    @Inject(method = "canDespawn", at = @At("HEAD"), cancellable = true)
    private void etim$canDespawn(CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        cir.setReturnValue(DespawnRules.canDespawn((EntityAnimal) (Object) this));
    }
}
