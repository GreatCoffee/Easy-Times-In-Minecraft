package io.github.etim.etim.nutrition;

import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.network.NetworkRegistry;
import net.minecraftforge.fml.common.network.simpleimpl.IMessage;
import net.minecraftforge.fml.common.network.simpleimpl.SimpleNetworkWrapper;
import net.minecraftforge.fml.relauncher.Side;
import io.netty.buffer.ByteBuf;

/**
 * Sync channel for the nutrition capability values (task 1.4: "存储与同步").
 *
 * <p>One packet carries the four values; the client handler mirrors them
 * into the client-side capability instance so resting HUD/UI consumers can
 * read nutrient state without anymore server chatter. Values stay
 * server-authoritative (the client instance is a display mirror).</p>
 *
 * <p>Side split: the packet and the server push live here; the client
 * handler lives in {@code client/ClientNetworkHooks} — 1.12's
 * SimpleNetworkWrapper instantiates the handler class at registration, so a
 * shared-class handler would drag {@code net.minecraft.client.*} bodies
 * into the dedicated server (run27 harness sweep).</p>
 */
public final class NutritionNetwork {

    public static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(
                    new ResourceLocation(Tags.MOD_ID, "nutrition").toString());

    public static final byte PACKET_SYNC = 0;

    private NutritionNetwork() {
    }

    /** Registers the network messages (SERVER-side no-op shard; see class javadoc). */
    public static void registerMessages() {
        // BOTH SIDES register the discriminator; the server-side handler is
        // a client-free no-op shard (see FoodDebugNetwork note).
        CHANNEL.registerMessage(ServerNoopHandler.class, PacketSyncNutrition.class, PACKET_SYNC, Side.SERVER);
    }

    /** SERVER-side no-op handler: never invoked (client-target packet); body stays client-free. */
    public static class ServerNoopHandler
            implements net.minecraftforge.fml.common.network.simpleimpl.IMessageHandler<PacketSyncNutrition, IMessage> {
        @Override
        public IMessage onMessage(PacketSyncNutrition message, net.minecraftforge.fml.common.network.simpleimpl.MessageContext ctx) {
            return null;
        }
    }

    /** Server → client sync of the four nutrition values. */
    public static void toClient(EntityPlayerMP player, int protein, int fats, int phytonutrients, int insulinResistance) {
        CHANNEL.sendTo(new PacketSyncNutrition(protein, fats, phytonutrients, insulinResistance), player);
    }

    /** The sync packet: four ints + client-side mirror writer. */
    public static class PacketSyncNutrition implements IMessage {
        public int protein;
        public int essentialFats;
        public int phytonutrients;
        public int insulinResistance;

        public PacketSyncNutrition() {
        }

        public PacketSyncNutrition(int protein, int essentialFats, int phytonutrients, int insulinResistance) {
            this.protein = protein;
            this.essentialFats = essentialFats;
            this.phytonutrients = phytonutrients;
            this.insulinResistance = insulinResistance;
        }

        @Override
        public void fromBytes(ByteBuf buf) {
            protein = buf.readInt();
            essentialFats = buf.readInt();
            phytonutrients = buf.readInt();
            insulinResistance = buf.readInt();
        }

        @Override
        public void toBytes(ByteBuf buf) {
            buf.writeInt(protein);
            buf.writeInt(essentialFats);
            buf.writeInt(phytonutrients);
            buf.writeInt(insulinResistance);
        }
    }
}
