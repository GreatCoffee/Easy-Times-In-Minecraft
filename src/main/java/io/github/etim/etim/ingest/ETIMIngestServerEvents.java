package io.github.etim.etim.ingest;

import io.github.etim.etim.Tags;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.PlayerEvent;
import net.minecraftforge.fml.relauncher.Side;

/**
 * Server-side shard of the ingestion control mirror (see ETIMIngestEvents for
 * the client tick half): drops the UUID-keyed mirror entry on logout so the
 * map never grows stale across respawns (server-side identity survives, the
 * entry is simply refreshed by the client watcher on the next session). This
 * class is the dedicated-server-safe annotation shard split out of the
 * mixed-side original (stage harness round: server boot reached PREINIT with
 * the client tick route touching {@code Minecraft.getMinecraft()}).
 */
@Mod.EventBusSubscriber(value = Side.SERVER, modid = Tags.MOD_ID)
public final class ETIMIngestServerEvents {

    private ETIMIngestServerEvents() {
    }

    @SubscribeEvent
    public static void onPlayerLoggedOut(PlayerEvent.PlayerLoggedOutEvent event) {
        if (!event.player.world.isRemote) {
            ETIMIngestibles.forgetCtrl(event.player.getUniqueID());
        }
    }
}
