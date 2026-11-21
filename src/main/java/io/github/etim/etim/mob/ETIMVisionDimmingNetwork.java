package io.github.etim.etim.mob;

import io.github.etim.etim.Tags;

import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.network.NetworkRegistry;
import net.minecraftforge.fml.common.network.simpleimpl.IMessage;
import net.minecraftforge.fml.common.network.simpleimpl.IMessageHandler;
import net.minecraftforge.fml.common.network.simpleimpl.MessageContext;
import net.minecraftforge.fml.common.network.simpleimpl.SimpleNetworkWrapper;
import net.minecraftforge.fml.relauncher.Side;

import io.netty.buffer.ByteBuf;

/**
 * B-55 — server → client mirror of R196 {@code vision_dimming}. R196 rode the
 * {@code Packet8UpdateHealth} float (NetClientHandler.java:894-895);
 * 1.12's health packet has no free float lane, so this small channel carries
 * the same value for the client overlay.
 *
 * <p>Registration split follows the FoodDebugNetwork precedent: both sides
 * register the discriminator here (server-loadable, client-free body), and
 * the client-side handler lives in {@code client/ClientNetworkHooks}.</p>
 */
public final class ETIMVisionDimmingNetwork {

    public static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(new ResourceLocation(Tags.MOD_ID, "vision_dim").toString());

    public static final byte PACKET_VISION_DIM = 0;

    private ETIMVisionDimmingNetwork() {
    }

    /** Server-side registration (call once from preInit). */
    public static void registerMessages() {
        CHANNEL.registerMessage(ServerNoopHandler.class, PacketVisionDim.class, PACKET_VISION_DIM, Side.SERVER);
    }

    public static void sync(EntityPlayerMP player, float value) {
        CHANNEL.sendTo(new PacketVisionDim(value), player);
    }

    public static class PacketVisionDim implements IMessage {
        public float value;

        public PacketVisionDim() {
        }

        PacketVisionDim(float value) {
            this.value = value;
        }

        @Override
        public void fromBytes(ByteBuf buf) {
            value = buf.readFloat();
        }

        @Override
        public void toBytes(ByteBuf buf) {
            buf.writeFloat(value);
        }
    }

    /** Never invoked (client-target packet); body stays client-free. */
    public static class ServerNoopHandler implements IMessageHandler<PacketVisionDim, IMessage> {
        @Override
        public IMessage onMessage(PacketVisionDim message, MessageContext ctx) {
            return null;
        }
    }
}
