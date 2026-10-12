package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.DespawnRules;
import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Stage 5 slice 1 — the R196 despawn chain base layer (audit 11 §2.1):
 * both the despawn main loop and the layered canDespawn are transcribed in
 * {@link DespawnRules}; defeat them by the mobs.mobDespawnR196 switch
 * (false = the vanilla 1.12 bodies stay untouched).
 */
@Mixin(EntityLiving.class)
public abstract class MixinEntityLiving {

    @Inject(method = "despawnEntity", at = @At("HEAD"), cancellable = true)
    private void etim$tryDespawnEntity(CallbackInfo ci) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        if (DespawnRules.tryDespawn((EntityLiving) (Object) this)) {
            ci.cancel();
        }
    }

    @Inject(method = "canDespawn", at = @At("HEAD"), cancellable = true)
    private void etim$canDespawn(CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        cir.setReturnValue(DespawnRules.canDespawn((EntityLiving) (Object) this));
    }
}
