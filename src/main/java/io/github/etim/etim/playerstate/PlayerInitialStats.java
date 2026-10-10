package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.hunger.ETIMFoodStats;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.FoodStats;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.PlayerEvent;

/**
 * MITE-style starting stats for players (task 1.1, amended by 1.5).
 *
 * <p>In MITE R196 a player starts each life at the FULL caps of the current
 * level. For health that is {@code clamp(6 + level/5*2, 6, 20)} HP (task
 * 1.2 applies the attribute). For food the R196 model (task 1.5) fills BOTH
 * pools — satiation and nutrition — to that same level limit each, so a
 * level-0 player carries 12 pool points total (the vanilla bar shows the
 * sum, clamped to 20).</p>
 *
 * <p>Handled purely with server-side Forge events, no Mixin required:
 * vanilla recreates the player entity with full health/food on death respawn
 * (nothing is copied by {@code EntityPlayerMP#copyFrom} unless conqueredEnd),
 * so the stats are simply re-applied in {@link PlayerEvent.PlayerRespawnEvent}.</p>
 *
 * <p>This class is loaded on both sides but only touches common code,
 * so it is dedicated-server safe.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class PlayerInitialStats {

    /** Key of the init flag inside the player's persisted NBT. */
    private static final String FLAG_INITIAL_STATS_APPLIED = "etim:initial_stats_applied";

    private PlayerInitialStats() {
    }

    /**
     * First join of a player (including a player from a pre-ETIM world):
     * replace vanilla starting stats with the MITE ones.
     *
     * <p>The flag is stored in persisted NBT, which survives logout, death
     * and dimension change, so the stats are only applied once per life.</p>
     */
    @SubscribeEvent
    public static void onPlayerLoggedIn(PlayerEvent.PlayerLoggedInEvent event) {
        if (!isInitialised(event.player)) {
            applyStartingStats(event.player);
            markInitialised(event.player);
        }
    }

    /**
     * Death respawn starts a new life at the initial stats. Vanilla fills the
     * recreated player with full health/food before this event fires, so we
     * override it here.
     *
     * <p>Respawn after conquering the End is NOT a new life: the player exits
     * the End alive with current stats (vanilla copies health/food for that
     * respawn), so it must be excluded.</p>
     */
    @SubscribeEvent
    public static void onPlayerRespawn(PlayerEvent.PlayerRespawnEvent event) {
        if (!event.isEndConquered()) {
            applyStartingStats(event.player);
        }
    }

    private static void applyStartingStats(EntityPlayer player) {
        // Full caps of the current level (R196 semantics); the health cap
        // itself is applied by PlayerCapApplier (task 1.2).
        int cap = PlayerStatLimits.getHealthFoodCap(player.experienceLevel);
        player.setHealth(cap);
        if (ETIMConfig.foodModel) {
            // Task 1.5: both pools full every life (R196 FoodStats ctor :15).
            ETIMFoodStats.initFull(player);
        } else {
            // Legacy food model (task 1.1): full shared-cap bar.
            FoodStats food = player.getFoodStats();
            food.setFoodLevel(cap);
            food.setFoodSaturationLevel(cap);
        }
    }

    private static boolean isInitialised(EntityPlayer player) {
        return PlayerPersistedValues.getBoolean(player, FLAG_INITIAL_STATS_APPLIED);
    }

    private static void markInitialised(EntityPlayer player) {
        PlayerPersistedValues.setBoolean(player, FLAG_INITIAL_STATS_APPLIED, true);
    }
}
