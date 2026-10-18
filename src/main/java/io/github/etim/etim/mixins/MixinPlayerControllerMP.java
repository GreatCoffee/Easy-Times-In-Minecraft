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
 * Task 2.1: the client selection ray runs the R196 two-stage shape
 * (❗F-6-18, audit20-06 R1): the ray length is 16.0 survival / 5.0 creative
 * (R196 Raycast(observer, partial, 16.0) EntityPlayer:2239; creative flat 5.0
 * = hasExtendedReach EntityPlayer:2171/:2175) — the actual block trim then
 * happens in {@code MixinEntityRenderer} (bodyDistance vs getReach(block, meta)),
 * which becomes live code with this change. Server-side enforcement of the
 * melee/interaction/block reach lives in {@code ETIMReachEvents}.
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
