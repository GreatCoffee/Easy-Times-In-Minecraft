package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.passive.EntitySheep;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-10 batch 2 (audit20 条 303) — F-4, the sheep eating tail (R196
 * {@code EntitySheep.eatGrassBonus :223-231}). The 1.12 vanilla body already
 * carries the R196 first two statements verbatim (setSheared(false) + child
 * addGrowth(60)), so this injection only appends the R196 tail — the
 * capability {@code addFood(0.5F)} — at TAIL, riding {@code
 * livestockNeedsR196} like the rest of the three-need face (the handler
 * gates itself).
 */
@Mixin(EntitySheep.class)
public abstract class MixinEntitySheep {

    @Inject(method = "eatGrassBonus", at = @At("TAIL"))
    private void etim$eatGrassFoodTail(CallbackInfo ci) {
        ETIMLivestockEvents.sheepEatGrassBonus((EntitySheep) (Object) this);
    }
}
