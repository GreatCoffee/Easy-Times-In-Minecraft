package io.github.etim.etim.playerstate;

import io.github.etim.etim.Tags;
import io.github.etim.etim.hunger.ETIMFoodStats;
import io.github.etim.etim.mixins.FoodStatsAccessor;
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
 * Development-facility sync of the food-model side (server-original) so the
 * HUD hunger row can show the server truth. Display only; nothing here
 * mutates gameplay. Since task 1.5 the packet carries the dual pools and the
 * hunger pool alongside the vanilla bar triple.
 */
public final class FoodDebugNetwork {

    private static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(new ResourceLocation(Tags.MOD_ID, "food_debug").toString());

    private static final byte PACKET_FOOD_DEBUG = 0;

    /** Server-authoritative readout mirrored on the client for display. */
    public static volatile int foodLevel;
    public static volatile float saturation;
    public static volatile float exhaustion;
    public static volatile int satiation;
    public static volatile int nutrition;
    public static volatile float hungerPool;

    private FoodDebugNetwork() {
    }

    /** Registers the network message (call from mod preInit, once). */
    public static void registerMessages() {
        CHANNEL.registerMessage(SyncHandler.class, PacketFoodDebug.class, PACKET_FOOD_DEBUG, Side.CLIENT);
    }

    /** Server → client push of the food-model readout. */
    public static void sync(EntityPlayerMP player) {
        CHANNEL.sendTo(new PacketFoodDebug(player), player);
    }

    /** The diagnostic packet. */
    public static class PacketFoodDebug implements IMessage {
        int food;
        float saturation;
        float exhaustion;
        int satiation;
        int nutrition;
        float hungerPool;

        public PacketFoodDebug() {
        }

        PacketFoodDebug(EntityPlayerMP player) {
            this.food = player.getFoodStats().getFoodLevel();
            this.saturation = player.getFoodStats().getSaturationLevel();
            this.exhaustion = ((FoodStatsAccessor) (Object) player.getFoodStats()).etim$getFoodExhaustion();
            ETIMFoodStats.IFoodState state = ETIMFoodStats.get(player);
            this.satiation = state != null ? state.getSatiation() : 0;
            this.nutrition = state != null ? state.getNutrition() : 0;
            this.hungerPool = state != null ? state.getHungerPool() : 0.0F;
        }

        @Override
        public void fromBytes(ByteBuf buf) {
            food = buf.readInt();
            saturation = buf.readFloat();
            exhaustion = buf.readFloat();
            satiation = buf.readInt();
            nutrition = buf.readInt();
            hungerPool = buf.readFloat();
        }

        @Override
        public void toBytes(ByteBuf buf) {
            buf.writeInt(food);
            buf.writeFloat(saturation);
            buf.writeFloat(exhaustion);
            buf.writeInt(satiation);
            buf.writeInt(nutrition);
            buf.writeFloat(hungerPool);
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
            satiation = message.satiation;
            nutrition = message.nutrition;
            hungerPool = message.hungerPool;
            return null;
        }
    }
}
