package io.github.etim.etim.skill;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.netty.buffer.ByteBuf;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.network.NetworkRegistry;
import net.minecraftforge.fml.common.network.simpleimpl.IMessage;
import net.minecraftforge.fml.common.network.simpleimpl.IMessageHandler;
import net.minecraftforge.fml.common.network.simpleimpl.SimpleNetworkWrapper;
import net.minecraftforge.fml.relauncher.Side;

/**
 * Server-to-client mirror of the skill mask (C-1, batch B-45 follow-up).
 *
 * <p>The anvil preview runs {@link io.github.etim.etim.metal.ETIMAnvilRepair#plan} on the client, so the
 * client needs the same mask and the server's {@code skillsEnabled} switch.
 * The server remains authoritative: this packet only feeds the preview and
 * the fail=3 tooltip; learning and abandonment always round-trip through the
 * server command.</p>
 */
public final class ETIMSkillNetwork {

    public static final SimpleNetworkWrapper CHANNEL =
            NetworkRegistry.INSTANCE.newSimpleChannel(
                    new ResourceLocation(Tags.MOD_ID, "skills").toString());

    public static final byte PACKET_SYNC = 0;

    private ETIMSkillNetwork() {
    }

    /** Both sides register the discriminator; the server shard is a no-op. */
    public static void registerMessages() {
        CHANNEL.registerMessage(ServerNoopHandler.class, PacketSkillSync.class, PACKET_SYNC, Side.SERVER);
    }

    public static void sync(EntityPlayer player) {
        if (player instanceof EntityPlayerMP) {
            CHANNEL.sendTo(new PacketSkillSync(ETIMSkills.mask(player), ETIMConfig.skillsEnabled),
                    (EntityPlayerMP) player);
        }
    }

    /** SERVER-side no-op handler: the client-target packet never runs here. */
    public static class ServerNoopHandler
            implements IMessageHandler<PacketSkillSync, IMessage> {
        @Override
        public IMessage onMessage(PacketSkillSync message, net.minecraftforge.fml.common.network.simpleimpl.MessageContext ctx) {
            return null;
        }
    }

    public static class PacketSkillSync implements IMessage {
        public int mask;
        public boolean enabled;

        public PacketSkillSync() {
        }

        public PacketSkillSync(int mask, boolean enabled) {
            this.mask = mask;
            this.enabled = enabled;
        }

        @Override
        public void fromBytes(ByteBuf buf) {
            mask = buf.readInt();
            enabled = buf.readBoolean();
        }

        @Override
        public void toBytes(ByteBuf buf) {
            buf.writeInt(mask);
            buf.writeBoolean(enabled);
        }
    }
}
