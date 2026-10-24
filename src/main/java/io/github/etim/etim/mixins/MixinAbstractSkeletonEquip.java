package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMMobEquip;
import net.minecraft.entity.monster.AbstractSkeleton;
import net.minecraft.world.DifficultyInstance;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B3 批文 §〇-获取机制面: the R196 skeleton random-equipment chain
 * (weapon :189-202 + armor) replaces the vanilla face WHOLE (HEAD+cancel,
 * 终审伪码批注 — TAIL would leave the vanilla bow/armor rows behind).
 * Covers normal + stray (both ride this override); the wither skeleton
 * keeps its own 1.12 override (批文 §四, wither 分流坐实 — C 级登记).
 * Server side only.
 */
@Mixin(AbstractSkeleton.class)
public abstract class MixinAbstractSkeletonEquip {

    @Inject(method = "setEquipmentBasedOnDifficulty(Lnet/minecraft/world/DifficultyInstance;)V",
            at = @At("HEAD"), cancellable = true)
    private void etim$mobEquip(DifficultyInstance difficulty, CallbackInfo ci) {
        AbstractSkeleton skeleton = (AbstractSkeleton) (Object) this;
        if (!skeleton.world.isRemote) {
            ETIMMobEquip.skeletonEquip(skeleton);
            ci.cancel();
        }
    }
}
