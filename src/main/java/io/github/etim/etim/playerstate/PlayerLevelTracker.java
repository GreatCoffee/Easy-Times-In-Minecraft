package io.github.etim.etim.playerstate;

import net.minecraft.entity.player.EntityPlayer;

/**
 * Per-player tracked level used to detect level changes between ticks.
 * Stored in the player's persisted NBT (see {@link PlayerPersistedValues}).
 */
public final class PlayerLevelTracker {

    private static final String KEY_LEVEL = "etim:tracked_level";

    private PlayerLevelTracker() {
    }

    /** Returns the level that the caps were last applied for. */
    public static int getTracked(EntityPlayer player) {
        return PlayerPersistedValues.getInteger(player, KEY_LEVEL);
    }

    /** Records that the caps are now applied for the given level. */
    public static void setTracked(EntityPlayer player, int level) {
        PlayerPersistedValues.setInteger(player, KEY_LEVEL, level);
    }
}
