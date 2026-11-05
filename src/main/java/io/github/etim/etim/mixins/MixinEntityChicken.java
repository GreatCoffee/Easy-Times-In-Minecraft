package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.DespawnRules;
import net.minecraft.entity.passive.EntityChicken;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Vanilla 1.12's chicken override gates on the chicken-jockey rider rule —
 * MITE 1.6.4 has no chicken-jockey despawn mechanic, so R196 chickens run
 * the plain animal layer + LOS gate like every other livestock animal. With
 * mobs.mobDespawnR196 = false the vanilla body wins (see also the deviation
 * list: the jockey gate is dropped only while the switch is on).
 *
 * <p>B-10 (条 300): R196's chicken egg comes from {@code produceGoods}
 * (EntityChicken.java:88-93 — counter ≥ 200, 1-in-20 per pass), NOT from
 * the vanilla 6000-tick {@code timeUntilNextEgg} lane. While
 * livestockProductionR196 is on, that vanilla lane is frozen (floor 10000
 * every tick, R196 has no such field) so the two egg sources cannot stack;
 * with the switch off the vanilla lane resumes untouched (the floored NBT
 * value just means a long normal wait, never a broken timer).</p>
 */
@Mixin(EntityChicken.class)
public abstract class MixinEntityChicken {

    @Shadow
    private int timeUntilNextEgg;

    @Inject(method = "canDespawn", at = @At("HEAD"), cancellable = true)
    private void etim$canDespawn(CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        cir.setReturnValue(DespawnRules.canDespawn((EntityChicken) (Object) this));
    }

    @Inject(method = "onLivingUpdate", at = @At("HEAD"))
    private void etim$vanillaEggLaneFreeze(CallbackInfo ci) {
        if (ETIMConfig.livestockProductionR196) {
            this.timeUntilNextEgg = Math.max(this.timeUntilNextEgg, 10000);
        }
    }
}
