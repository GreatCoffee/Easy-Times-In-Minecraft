package io.github.etim.etim.mixins;

import io.github.etim.etim.fishing.ETIMFishing;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.projectile.EntityFishHook;
import net.minecraft.util.math.BlockPos;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Batch five (fishing, audit20 条 268-271) — D-1 甲 route: the ONLY mixin of
 * the batch. The vanilla {@code catchingFish(BlockPos)} private body is the
 * time-driven delay scheduler (ticksCaughtDelay r(100,600)−lure → catchable
 * delay → r(20,40)); it is cancelled WHOLE when the R196 nine-segment drive
 * claims the tick ({@link ETIMFishing#tickBite} — 拉动判读: the R196 window
 * decrement + bite rolls + the one-shot flap face all live in the helper),
 * otherwise vanilla fishing continues untouched ({@code fishingSystem}
 * off / dedicated-side gate).
 *
 * <p>Shadows: {@code ticksCatchable} is PRIVATE (1.12 :43) — the write-back
 * face for the bite window has to stay inside the mixin (终审判读位 C-注4);
 * {@code angler} is private (:41) and is fed to the helper by name.</p>
 */
@Mixin(EntityFishHook.class)
public abstract class MixinEntityFishHook {

    @Shadow
    private int ticksCatchable;

    @Shadow
    private EntityPlayer angler;

    /** The R196 drive consumes the tick server-side only (1.12 :255 gate). */
    @Inject(method = "catchingFish(Lnet/minecraft/util/math/BlockPos;)V", at = @At("HEAD"), cancellable = true)
    private void etim$r196Bite(BlockPos pos, CallbackInfo ci) {
        EntityFishHook self = (EntityFishHook) (Object) this;
        int consumed = ETIMFishing.tickBite(self, this.angler, this.ticksCatchable);
        if (consumed >= 0) {
            this.ticksCatchable = consumed;
            ci.cancel();
        }
    }
}
