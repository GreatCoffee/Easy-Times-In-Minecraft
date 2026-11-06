package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.EntityChicken;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-10 batch 2 (audit20 条 303) — F-3, the jump feather face (R196
 * {@code EntityChicken.jump :185-191}: after the super body, !child +
 * 1-in-40 + not-in-water → {@code tryDropFeather(true)}, the
 * retain-at-least-one arm whose meter needs 2+ to shed one). 1.12 declares
 * {@code jump()} on EntityLivingBase (:2006), so the injection lives here
 * behind an instanceof chicken gate — unrelated living entities pay a single
 * failed instanceof per jump; with {@code livestockProductionR196} off the
 * vanilla body stands untouched.
 */
@Mixin(EntityLivingBase.class)
public abstract class MixinEntityLivingBase {

    @Inject(method = "jump", at = @At("TAIL"))
    private void etim$chickenJumpFeather(CallbackInfo ci) {
        if (ETIMConfig.livestockProductionR196 && (Object) this instanceof EntityChicken) {
            ETIMLivestockEvents.jumpFeather((EntityChicken) (Object) this);
        }
    }
}
