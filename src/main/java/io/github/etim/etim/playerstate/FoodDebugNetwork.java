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

    public static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(new ResourceLocation(Tags.MOD_ID, "food_debug").toString());

    public static final byte PACKET_FOOD_DEBUG = 0;

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
        // BOTH SIDES register the discriminator (the 1.12 codec encodes by
        // discriminator table on whichever JVM renders the packet; a missed
        // SERVER registration torpedoes the login sync — run27 17:27).
        // The server-side HANDLER is a no-op shard (never invoked — the
        // packet is client-target); its body must stay client-free so the
        // dedicated server can load it at SimpleNetworkWrapper.instantiate.
        CHANNEL.registerMessage(ServerNoopHandler.class, PacketFoodDebug.class, PACKET_FOOD_DEBUG, Side.SERVER);
    }

    /** Server → client push of the food-model readout. */
    public static void sync(EntityPlayerMP player) {
        CHANNEL.sendTo(new PacketFoodDebug(player), player);
    }

    /** The diagnostic packet. */
    public static class PacketFoodDebug implements IMessage {
        public int food;
        public float saturation;
        public float exhaustion;
        public int satiation;
        public int nutrition;
        public float hungerPool;

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

    /** Server-side no-op handler: never invoked (client-target packet); body stays client-free. */
    public static class ServerNoopHandler implements IMessageHandler<PacketFoodDebug, IMessage> {
        @Override
        public IMessage onMessage(PacketFoodDebug message, MessageContext ctx) {
            return null;
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
