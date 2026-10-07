package io.github.etim.etim.playerstate;

import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.FoodStats;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.PlayerEvent;

/**
 * MITE-style starting stats for players (task 1.1).
 *
 * <p>In MITE R196 a player starts each life at the FULL caps of the current
 * level, which for level 0 are 6 HP (3 hearts) and 6 food points (3 shanks)
 * plus 6 saturation (MITE's "satiation" slot, the hidden buffer behind the
 * hunger bar). Level 0 caps are 6 because the cap formula is
 * {@code clamp(6 + level/5*2, 6, 20)} (task 1.2 will implement it).</p>
 *
 * <p>Note: the task doc's "3 点饥饿值" reads "3 格" as 3 points, but by the
 * same conversion the doc uses for health (3 hearts = 6 HP), 3 hunger shanks
 * = 6 food points. R196 sources confirm the 6.</p>
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

    /** Starting health in HP points (3 hearts). */
    public static final float STARTING_HEALTH = 6.0F;
    /** Starting hunger in food points (3 shanks on the hunger bar). */
    public static final int STARTING_HUNGER = 6;
    /** Starting saturation, mirroring MITE's full "satiation" slot. */
    public static final float STARTING_SATURATION = 6.0F;

    /** Key of the init flag inside the player's persisted NBT ({@link EntityPlayer#PERSISTED_NBT_TAG}). */
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
        player.setHealth(STARTING_HEALTH);
        FoodStats food = player.getFoodStats();
        food.setFoodLevel(STARTING_HUNGER);
        food.setFoodSaturationLevel(STARTING_SATURATION);
    }

    private static boolean isInitialised(EntityPlayer player) {
        return getPersistedData(player).hasKey(FLAG_INITIAL_STATS_APPLIED);
    }

    private static void markInitialised(EntityPlayer player) {
        NBTTagCompound entityData = player.getEntityData();
        // getCompoundTag returns a detached compound for a missing key,
        // so it must be written back to the entity data explicitly.
        NBTTagCompound persisted = entityData.getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
        persisted.setBoolean(FLAG_INITIAL_STATS_APPLIED, true);
        entityData.setTag(EntityPlayer.PERSISTED_NBT_TAG, persisted);
    }

    private static NBTTagCompound getPersistedData(EntityPlayer player) {
        return player.getEntityData().getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
    }
}
