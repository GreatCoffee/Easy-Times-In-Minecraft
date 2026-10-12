package io.github.etim.etim.client;

import io.github.etim.etim.crafting.CraftingProgressNetwork;
import io.github.etim.etim.nutrition.NutritionNetwork;
import io.github.etim.etim.nutrition.NutritionSystem;
import io.github.etim.etim.playerstate.FoodDebugNetwork;
import net.minecraft.client.Minecraft;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraftforge.fml.common.network.simpleimpl.IMessage;
import net.minecraftforge.fml.common.network.simpleimpl.IMessageHandler;
import net.minecraftforge.fml.common.network.simpleimpl.MessageContext;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * CLIENT-side registration shard of the two sync networks whose handlers
 * carry {@code net.minecraft.client.*} bodies (crafting progress snapshot /
 * nutrition mirror). The 1.12 {@code SimpleNetworkWrapper} instantiates
 * the handler class at registration time, so these two handlers must live
 * in a server-never-loaded enclosing class (run27 harness sweep:
 * NoClassDefFoundError / NoSuchFieldError on the dedicated server).
 * Call {@link #register()} from the client side of preInit.
 *
 * <p>Each JVM registers only its own side's handler — the client never
 * receives SERVER-target packets, the server never registers these
 * CLIENT-target packets. FoodDebugNetwork keeps its own registration
 * (server-loadable outer, side-gated internally).</p>
 */
@SideOnly(Side.CLIENT)
public final class ClientNetworkHooks {

    private ClientNetworkHooks() {
    }

    public static void register() {
        CraftingProgressNetwork.CHANNEL.registerMessage(
                ProgressSyncHandler.class,
                CraftingProgressNetwork.PacketProgress.class,
                CraftingProgressNetwork.PACKET_PROGRESS,
                Side.CLIENT);
        NutritionNetwork.CHANNEL.registerMessage(
                NutritionSyncHandler.class,
                NutritionNetwork.PacketSyncNutrition.class,
                NutritionNetwork.PACKET_SYNC,
                Side.CLIENT);
        FoodDebugNetwork.CHANNEL.registerMessage(
                FoodDebugSyncHandler.class,
                FoodDebugNetwork.PacketFoodDebug.class,
                FoodDebugNetwork.PACKET_FOOD_DEBUG,
                Side.CLIENT);
    }

    /** CLIENT-side handler for the food-model HUD mirror (see FoodDebugNetwork). */
    static final class FoodDebugSyncHandler
            implements IMessageHandler<FoodDebugNetwork.PacketFoodDebug, IMessage> {
        @Override
        public IMessage onMessage(FoodDebugNetwork.PacketFoodDebug message, MessageContext ctx) {
            if (ctx.side != Side.CLIENT) {
                return null;
            }
            FoodDebugNetwork.foodLevel = message.food;
            FoodDebugNetwork.saturation = message.saturation;
            FoodDebugNetwork.exhaustion = message.exhaustion;
            FoodDebugNetwork.satiation = message.satiation;
            FoodDebugNetwork.nutrition = message.nutrition;
            FoodDebugNetwork.hungerPool = message.hungerPool;
            return null;
        }
    }

    /** CLIENT-side sync handler writing the progress snapshot. */
    static final class ProgressSyncHandler
            implements IMessageHandler<CraftingProgressNetwork.PacketProgress, IMessage> {
        @Override
        public IMessage onMessage(CraftingProgressNetwork.PacketProgress message, MessageContext ctx) {
            if (ctx.side != Side.CLIENT) {
                return null;
            }
            ProgressSnapshot s = new ProgressSnapshot(message.windowId, message.ticks, message.period, message.active);
            CLIENT_SNAPSHOT = s;
            return null;
        }
    }

    /** Client-side progress snapshot (moved out of the shared network class). */
    private static volatile ProgressSnapshot CLIENT_SNAPSHOT = null;

    private static final class ProgressSnapshot {
        final int windowId;
        final int ticks;
        final int period;
        final boolean active;
        final long updatedNanos = System.nanoTime();

        private ProgressSnapshot(int windowId, int ticks, int period, boolean active) {
            this.windowId = windowId;
            this.ticks = ticks;
            this.period = period;
            this.active = active;
        }
    }

    /**
     * Progress 0..1 for the given window id; 0 when the snapshot is for
     * another window, the craft is not armed yet (R196 click-to-start), or
     * the period is empty (arrow off). Between server pushes the value
     * advances at the 50 ms tick cadence up to the period — ONLY while the
     * craft is actually running on the server (active), so an armed
     * recompute (period known, not started) can never walk a phantom bar.
     */
    public static float fraction(int windowId) {
        ProgressSnapshot s = CLIENT_SNAPSHOT;
        if (s == null || s.windowId != windowId || s.period <= 0 || !s.active) {
            return 0.0F;
        }
        long elapsedTicks = (System.nanoTime() - s.updatedNanos) / 50_000_000L;
        int ticks = s.ticks + (int) Math.min(elapsedTicks, s.period);
        return Math.min(ticks, s.period) / (float) s.period;
    }

    /** CLIENT-side handler for the nutrition capability mirror. */
    static final class NutritionSyncHandler
            implements IMessageHandler<NutritionNetwork.PacketSyncNutrition, IMessage> {
        @Override
        public IMessage onMessage(NutritionNetwork.PacketSyncNutrition message, MessageContext ctx) {
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
