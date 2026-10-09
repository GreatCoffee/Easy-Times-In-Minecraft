package io.github.etim.etim.playerstate;

import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.PlayerEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

/**
 * Drives the level-scaled systems (task 1.2):
 * caps on login/respawn/tick and the level hard cap on XP gain.
 *
 * <p>Per-player level cache lives in persisted NBT via
 * {@link PlayerLevelTracker} (survives death/dimension change).</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class PlayerLevelEvents {

    private PlayerLevelEvents() {
    }

    @SubscribeEvent
    public static void onPlayerLoggedIn(PlayerEvent.PlayerLoggedInEvent event) {
        applyAndTrack(event.player);
    }

    @SubscribeEvent
    public static void onPlayerRespawn(PlayerEvent.PlayerRespawnEvent event) {
        // Death respawn re-applies starting stats (task 1.1) AND the level caps,
        // the End-conquered respawn keeps the current life untouched.
        if (!event.isEndConquered()) {
            applyAndTrack(event.player);
        }
    }

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase == TickEvent.Phase.END && event.player.world != null && !event.player.world.isRemote) {
            PlayerCapApplier.onServerPlayerTick(event.player);
            // Hunger diagnostic sync (development facility, display-only) every
            // half second so the HUD row shows the server-original truth.
            if (event.player instanceof EntityPlayerMP && event.player.ticksExisted % 10 == 0) {
                FoodDebugNetwork.sync((EntityPlayerMP) event.player);
            }
        }
    }

    private static void applyAndTrack(EntityPlayer player) {
        PlayerCapApplier.applyCaps(player);
        PlayerLevelTracker.setTracked(player, player.experienceLevel);
    }
}
