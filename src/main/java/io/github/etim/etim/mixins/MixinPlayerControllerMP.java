package io.github.etim.etim.mixins;

import io.github.etim.etim.reach.ETIMReach;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.PlayerControllerMP;
import net.minecraft.entity.player.EntityPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Task 2.1: narrows the CLIENT selection ray to the R196 reach
 * (EntityPlayer.java:2170-2218 — blocks 2.75, creative 5.0).
 *
 * <p>{@code getBlockReachDistance} drives the objectMouseOver ray length for
 * both blocks and entities; {@code extendedReach} normally lets creative
 * mode select from 6.0 — R196 gives creative only its flat 5.0, so the
 * extended path is disabled and the creative value flows through
 * {@code ETIMReach.getBlockReach} instead. Server-side enforcement of the
 * melee/interaction/block reach lives in {@code ETIMReachEvents}.</p>
 */
@Mixin(PlayerControllerMP.class)
public abstract class MixinPlayerControllerMP {

    @Inject(method = "getBlockReachDistance", at = @At("HEAD"), cancellable = true)
    private void etim$blockReach(CallbackInfoReturnable<Float> cir) {
        EntityPlayer player = Minecraft.getMinecraft().player;
        if (player != null) {
            cir.setReturnValue(ETIMReach.getBlockReach(player));
        }
    }

    @Inject(method = "extendedReach", at = @At("HEAD"), cancellable = true)
    private void etim$noExtendedReach(CallbackInfoReturnable<Boolean> cir) {
        cir.setReturnValue(false);
    }
}
