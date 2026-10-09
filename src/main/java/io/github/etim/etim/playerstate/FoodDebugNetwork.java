package io.github.etim.etim.playerstate;

import io.github.etim.etim.Tags;
import io.github.etim.etim.mixins.FoodStatsAccessor;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.FoodStats;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.network.NetworkRegistry;
import net.minecraftforge.fml.common.network.simpleimpl.IMessage;
import net.minecraftforge.fml.common.network.simpleimpl.IMessageHandler;
import net.minecraftforge.fml.common.network.simpleimpl.MessageContext;
import net.minecraftforge.fml.common.network.simpleimpl.SimpleNetworkWrapper;
import net.minecraftforge.fml.relauncher.Side;
import io.netty.buffer.ByteBuf;

/**
 * Development-facility sync of the vanilla hunger chain (server-original) so
 * the HUD hunger row can show the server truth. Display only; nothing here
 * mutates gameplay.
 */
public final class FoodDebugNetwork {

    private static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(new ResourceLocation(Tags.MOD_ID, "food_debug").toString());

    private static final byte PACKET_FOOD_DEBUG = 0;

    /** Server-authoritative readout mirrored on the client for display. */
    public static volatile int foodLevel;
    public static volatile float saturation;
    public static volatile float exhaustion;

    private FoodDebugNetwork() {
    }

    /** Registers the network message (call from mod preInit, once). */
    public static void registerMessages() {
        CHANNEL.registerMessage(SyncHandler.class, PacketFoodDebug.class, PACKET_FOOD_DEBUG, Side.CLIENT);
    }

    /** Server → client push of the food/saturation/exhaustion triple. */
    public static void sync(EntityPlayerMP player) {
        FoodStats stats = player.getFoodStats();
        float exhausted = ((FoodStatsAccessor) (Object) stats).etim$getFoodExhaustion();
        CHANNEL.sendTo(new PacketFoodDebug(stats.getFoodLevel(), stats.getSaturationLevel(), exhausted), player);
    }

    /** The diagnostic packet. */
    public static class PacketFoodDebug implements IMessage {
        int food;
        float saturation;
        float exhaustion;

        public PacketFoodDebug() {
        }

        public PacketFoodDebug(int food, float saturation, float exhaustion) {
            this.food = food;
            this.saturation = saturation;
            this.exhaustion = exhaustion;
        }

        @Override
        public void fromBytes(ByteBuf buf) {
            food = buf.readInt();
            saturation = buf.readFloat();
            exhaustion = buf.readFloat();
        }

        @Override
        public void toBytes(ByteBuf buf) {
            buf.writeInt(food);
            buf.writeFloat(saturation);
            buf.writeFloat(exhaustion);
        }
    }

    /** Client-side handler: publish for the overlay. */
    public static class SyncHandler implements IMessageHandler<PacketFoodDebug, IMessage> {
        @Override
        public IMessage onMessage(PacketFoodDebug message, MessageContext ctx) {
            if (ctx.side != Side.CLIENT) {
                return null;
            }
            foodLevel = message.food;
            saturation = message.saturation;
            exhaustion = message.exhaustion;
            return null;
        }
    }
}
