package io.github.etim.etim.ingest;

import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayer;
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
 * Task 2.4: client → server channel for the ingestion control-key state.
 *
 * <p>R196 keeps {@code hasIngestionPriority(ctrl)} inside the shared player
 * code; 1.12.2 splits client/server player entities, so the egg's eat/throw
 * fork needs the server to know whether the client's left-control key is
 * down. {@link ETIMIngestEvents} reports the state on every change (plus the
 * login default); the server mirrors it per-UUID in
 * {@link ETIMIngestibles#setCtrlHeld}.</p>
 */
public final class ETIMIngestNetwork {

    private static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(new ResourceLocation(Tags.MOD_ID, "ingest").toString());

    private static final byte PACKET_CTRL = 0;

    private ETIMIngestNetwork() {
    }

    /** Registers the network messages (call from mod preInit, once). */
    public static void registerMessages() {
        CHANNEL.registerMessage(CtrlHandler.class, PacketIngestModifier.class, PACKET_CTRL, Side.SERVER);
    }

    /** Client → server control state report. */
    public static void toServer(boolean ctrlHeld) {
        CHANNEL.sendToServer(new PacketIngestModifier(ctrlHeld));
    }

    /** The report packet: one boolean. */
    public static class PacketIngestModifier implements IMessage {
        boolean ctrlHeld;

        public PacketIngestModifier() {
        }

        public PacketIngestModifier(boolean ctrlHeld) {
            this.ctrlHeld = ctrlHeld;
        }

        @Override
        public void fromBytes(ByteBuf buf) {
            ctrlHeld = buf.readBoolean();
        }

        @Override
        public void toBytes(ByteBuf buf) {
            buf.writeBoolean(ctrlHeld);
        }
    }

    /** Server-side handler: refresh the UUID mirror. */
    public static class CtrlHandler implements IMessageHandler<PacketIngestModifier, IMessage> {
        @Override
        public IMessage onMessage(PacketIngestModifier message, MessageContext ctx) {
            if (ctx.side != Side.SERVER) {
                return null;
            }
            EntityPlayerMP sender = ctx.getServerHandler().player;
            ETIMIngestibles.setCtrlHeld(sender.getUniqueID(), message.ctrlHeld);
            return null;
        }
    }
}
