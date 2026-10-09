package io.github.etim.etim.nutrition;

import io.github.etim.etim.Tags;
import net.minecraft.client.Minecraft;
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
 * Sync channel for the nutrition capability values (task 1.4: "存储与同步").
 *
 * <p>One packet carries the four values; the client handler mirrors them
 * into the client-side capability instance so resting HUD/UI consumers can
 * read nutrient state without anymore server chatter. Values stay
 * server-authoritative (the client instance is a display mirror).</p>
 */
public final class NutritionNetwork {

    private static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(new ResourceLocation(Tags.MOD_ID, "nutrition").toString());

    private static final byte PACKET_SYNC = 0;

    private NutritionNetwork() {
    }

    /** Registers the network messages (call from mod preInit, once). */
    public static void registerMessages() {
        CHANNEL.registerMessage(SyncHandler.class, PacketSyncNutrition.class, PACKET_SYNC, Side.CLIENT);
    }

    /** Server → client sync of the four nutrition values. */
    public static void toClient(EntityPlayerMP player, int protein, int fats, int phytonutrients, int insulinResistance) {
        CHANNEL.sendTo(new PacketSyncNutrition(protein, fats, phytonutrients, insulinResistance), player);
    }

    /** The sync packet: four ints + client-side mirror writer. */
    public static class PacketSyncNutrition implements IMessage {
        int protein;
        int essentialFats;
        int phytonutrients;
        int insulinResistance;

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

    /** Client-side handler: mirror values into the local capability instance. */
    public static class SyncHandler implements IMessageHandler<PacketSyncNutrition, IMessage> {
        @Override
        public IMessage onMessage(PacketSyncNutrition message, MessageContext ctx) {
            if (ctx.side != Side.CLIENT) {
                return null;
            }
            Minecraft.getMinecraft().addScheduledTask(() -> {
                EntityPlayer player = Minecraft.getMinecraft().player;
                NutritionSystem.INutrition capsule = player == null ? null : NutritionSystem.get(player);
                if (capsule == null) {
                    return;
                }
                capsule.setProtein(message.protein);
                capsule.setEssentialFats(message.essentialFats);
                capsule.setPhytonutrients(message.phytonutrients);
                capsule.setInsulinResistance(message.insulinResistance);
            });
            return null;
        }
    }
}
