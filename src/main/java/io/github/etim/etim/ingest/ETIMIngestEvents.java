package io.github.etim.etim.ingest;

import io.github.etim.etim.Tags;
import net.minecraft.client.Minecraft;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraftforge.fml.common.gameevent.PlayerEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

/**
 * Task 2.4: bookkeeping for the ingestion routing.
 *
 * <p>Client: watches the left-control key every tick and reports changes
 * through {@link ETIMIngestNetwork} — R196 reads the control state inside its
 * shared {@code onPlayerRightClick}; 1.12.2 server entities cannot, so this
 * mirror feeds {@code MixinItemEgg}'s eat/throw fork on the server side.
 * Server: drops the mirror entry on logout (the map is UUID-keyed, respawn
 * identities survive).</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class ETIMIngestEvents {

    private ETIMIngestEvents() {
    }

    private static Boolean lastReported = null;

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }
        EntityPlayer player = Minecraft.getMinecraft().player;
        if (player == null) {
            lastReported = null; // world swap/relogin: force a fresh report on the first tick after join
            return;
        }
        boolean held = ETIMIngestibles.isCtrlHeld(player);
        if (lastReported == null || lastReported.booleanValue() != held) {
            lastReported = held;
            ETIMIngestNetwork.toServer(held);
        }
    }

    @SubscribeEvent
    public static void onPlayerLoggedIn(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.player.world.isRemote) {
            lastReported = null; // the tick watcher re-reports the actual state right away
        }
    }

    @SubscribeEvent
    public static void onPlayerLoggedOut(PlayerEvent.PlayerLoggedOutEvent event) {
        if (!event.player.world.isRemote) {
            ETIMIngestibles.forgetCtrl(event.player.getUniqueID());
        }
    }
}
