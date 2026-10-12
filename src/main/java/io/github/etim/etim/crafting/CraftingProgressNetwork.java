package io.github.etim.etim.crafting;

import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.network.NetworkRegistry;
import net.minecraftforge.fml.common.network.simpleimpl.IMessage;
import net.minecraftforge.fml.common.network.simpleimpl.IMessageHandler;
import net.minecraftforge.fml.common.network.simpleimpl.MessageContext;
import net.minecraftforge.fml.common.network.simpleimpl.SimpleNetworkWrapper;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;
import io.netty.buffer.ByteBuf;

/**
 * Crafting-progress sync for the GUI arrow fill (stage 3, batch 2).
 *
 * <p>1.12.2 has no generic container-property channel (vanilla furnaces sync
 * through TileEntity packets; the workbench container has none), so the
 * server pushes {windowId, ticks, period} on every meaningful change
 * (start / reset / completion / damage / every 4 advancing ticks) and the
 * client stores the latest snapshot. The GUI mixins render the white
 * progress arrow from {@link #fraction(int)}.</p>
 *
 * <p>Between pushes the client advances the displayed value itself at the
 * vanilla 50 ms tick cadence (display smoothing only, not a gameplay value);
 * a starve freeze or a paused timer simply keeps the last pushed position.
 * When the server pushes period=0 (GUI closed / timer gone) the arrow is
 * hidden via the fraction returning 0 for the mismatch/stale window.</p>
 */
public final class CraftingProgressNetwork {

    private static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(new ResourceLocation(Tags.MOD_ID, "crafting_progress").toString());

    private static final byte PACKET_PROGRESS = 0;

    private CraftingProgressNetwork() {
    }

    /** Registers the network message (call from mod preInit, once). */
    public static void registerMessages() {
        CHANNEL.registerMessage(SyncHandler.class, PacketProgress.class, PACKET_PROGRESS, Side.CLIENT);
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

    // ------------------------------------------------------------- client view

    @SideOnly(Side.CLIENT)
    private static volatile Snapshot CLIENT_SNAPSHOT = null;

    @SideOnly(Side.CLIENT)
    private static final class Snapshot {
        int windowId = -1;
        int ticks;
        int period;
        boolean active;
        long updatedNanos = System.nanoTime();
    }

    /**
     * Progress 0..1 for the given window id; 0 when the snapshot is for
     * another window, the craft is not armed yet (R196 click-to-start), or
     * the period is empty (arrow off). Between server pushes the value
     * advances at the 50 ms tick cadence up to the period — ONLY while the
     * craft is actually running on the server (active), so an armed
     * recompute (period known, not started) can never walk a phantom bar.
     */
    @SideOnly(Side.CLIENT)
    public static float fraction(int windowId) {
        Snapshot snapshot = CLIENT_SNAPSHOT;
        if (snapshot == null || snapshot.windowId != windowId || snapshot.period <= 0
                || !snapshot.active) {
            return 0.0F;
        }
        long elapsedTicks = (System.nanoTime() - snapshot.updatedNanos) / 50_000_000L;
        int ticks = snapshot.ticks + (int) Math.min(elapsedTicks, snapshot.period);
        return Math.min(ticks, snapshot.period) / (float) snapshot.period;
    }

    // ------------------------------------------------------------- packet

    public static class PacketProgress implements IMessage {
        int windowId;
        int ticks;
        int period;
        boolean active;

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

    @SideOnly(Side.CLIENT)
    public static class SyncHandler implements IMessageHandler<PacketProgress, IMessage> {
        @Override
        public IMessage onMessage(PacketProgress message, MessageContext ctx) {
            if (ctx.side != Side.CLIENT) {
                return null;
            }
            Snapshot snapshot = new Snapshot();
            snapshot.windowId = message.windowId;
            snapshot.ticks = message.ticks;
            snapshot.period = message.period;
            snapshot.active = message.active;
            CLIENT_SNAPSHOT = snapshot;
            return null;
        }
    }
}
