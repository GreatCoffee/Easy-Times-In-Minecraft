package io.github.etim.etim.crafting;

import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.network.NetworkRegistry;
import net.minecraftforge.fml.common.network.simpleimpl.IMessage;
import net.minecraftforge.fml.common.network.simpleimpl.SimpleNetworkWrapper;
import net.minecraftforge.fml.relauncher.Side;
import io.netty.buffer.ByteBuf;

/**
 * Crafting-progress sync for the GUI arrow fill (stage 3, batch 2).
 *
 * <p>1.12.2 has no generic container-property channel (vanilla furnaces sync
 * through TileEntity packets; the workbench container has none), so the
 * server pushes {windowId, ticks, period} on every meaningful change
 * (start / reset / completion / damage / every 4 advancing ticks) and the
 * client stores the latest snapshot. The GUI mixins render the white
 * progress arrow from {@code ClientNetworkHooks.fraction}.</p>
 *
 * <p>Between pushes the client advances the displayed value itself at the
 * vanilla 50 ms tick cadence (display smoothing only, not a gameplay value);
 * a starve freeze or a paused timer simply keeps the last pushed position.
 * When the server pushes period=0 (GUI closed / timer gone) the arrow is
 * hidden via the fraction returning 0 for the mismatch/stale window.</p>
 *
 * <p>Side split: the packet and the server push live here (this class stays
 * server-loadable); the client snapshot and its handler live in
 * {@code client/ClientNetworkHooks} — 1.12's SimpleNetworkWrapper
 * instantiates the handler class at registration, so a shared-class handler
 * would drag {@code net.minecraft.client.*} bodies into the dedicated
 * server (run27 harness: NoSuchFieldError at HandSweep 17:09).</p>
 */
public final class CraftingProgressNetwork {

    public static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(
                    new ResourceLocation(Tags.MOD_ID, "crafting_progress").toString());

    public static final byte PACKET_PROGRESS = 0;

    private CraftingProgressNetwork() {
    }

    /** Registers the SERVER-side discriminator shard (no-op handler shard; see class javadoc). */
    public static void registerServerShard() {
        CHANNEL.registerMessage(ServerNoopHandler.class, PacketProgress.class, PACKET_PROGRESS, Side.SERVER);
    }

    /** Server → client push of one crafting timer readout (the open window id). */
    public static void push(EntityPlayerMP player, int ticks, int period, boolean active) {
        CHANNEL.sendTo(new PacketProgress(player.openContainer.windowId, ticks, period, active), player);
    }

    /** Push variant marking a window as non-crafting (arrow off). */
    public static void pushAbsent(EntityPlayerMP player, int windowId) {
        CHANNEL.sendTo(new PacketProgress(windowId, 0, 0, false), player);
    }

    /**
     * The result changed (new/other recipe): R196 clearCrafting — period is
     * known again but NOT started; the arrow stays at 0 until the take click.
     */
    public static void pushIdle(EntityPlayerMP player, int period) {
        push(player, 0, period, false);
    }

    // ------------------------------------------------------------- packet

    /** SERVER-side no-op handler: never invoked (client-target packet); body stays client-free. */
    public static class ServerNoopHandler
            implements net.minecraftforge.fml.common.network.simpleimpl.IMessageHandler<PacketProgress, IMessage> {
        @Override
        public IMessage onMessage(PacketProgress message, net.minecraftforge.fml.common.network.simpleimpl.MessageContext ctx) {
            return null;
        }
    }

    public static class PacketProgress implements IMessage {
        public int windowId;
        public int ticks;
        public int period;
        public boolean active;

        public PacketProgress() {
        }

        PacketProgress(int windowId, int ticks, int period, boolean active) {
            this.windowId = windowId;
            this.ticks = ticks;
            this.period = period;
            this.active = active;
        }

        @Override
        public void fromBytes(ByteBuf buf) {
            windowId = buf.readInt();
            ticks = buf.readInt();
            period = buf.readInt();
            active = buf.readBoolean();
        }

        @Override
        public void toBytes(ByteBuf buf) {
            buf.writeInt(windowId);
            buf.writeInt(ticks);
            buf.writeInt(period);
            buf.writeBoolean(active);
        }
    }
}
