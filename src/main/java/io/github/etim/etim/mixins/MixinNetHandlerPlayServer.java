package io.github.etim.etim.mixins;

import io.github.etim.etim.hunger.ETIMEndurance;
import net.minecraft.entity.item.EntityBoat;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.network.NetHandlerPlayServer;
import net.minecraft.network.play.client.CPacketInput;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Boat-paddle pool drain (R196 EntityPlayer:1727-1728, the riding twin branch
 * of {@code addMovementStat}; movement product line, 终审 boat-waterjump
 * G-B1 = A, hook face α = {@code processInput} TAIL — ExactlyOnce per riding
 * tick).
 *
 * <p>1.12.2 feeds the server-side {@code moveForward} only here:
 * {@code CPacketInput} → {@code setEntityActionState}
 * (NetHandlerPlayServer:315-319, the single setEntityActionState call site in
 * the tree), and the riding client ships C0C unconditionally every tick
 * (EntityPlayerSP:232-241). Charging {@code |moveForward| × rate} at this
 * TAIL therefore reproduces the R196 per-call client charge with no
 * packet-order dependence and no double count (β's ≈2.02×/tick face, 驳回).
 * The +2% raw-vs-0.98 angle is D-B1, accepted. Bare charge (mod = 1.0), like
 * R196 {@code addHungerClientSide}.</p>
 */
@Mixin(NetHandlerPlayServer.class)
public abstract class MixinNetHandlerPlayServer {

    @Inject(method = "processInput", at = @At("TAIL"), remap = true)
    private void etim$boatDrain(CPacketInput packetIn, CallbackInfo ci) {
        NetHandlerPlayServer self = (NetHandlerPlayServer) (Object) this;
        EntityPlayer player = self.player;
        if (player.getRidingEntity() instanceof EntityBoat && player.moveForward != 0.0F) {
            ETIMEndurance.chargeBoat(player, player.moveForward);
        }
    }
}
