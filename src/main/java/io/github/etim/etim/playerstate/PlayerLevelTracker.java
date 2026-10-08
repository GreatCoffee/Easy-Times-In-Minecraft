package io.github.etim.etim.playerstate;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.nbt.NBTTagCompound;

/**
 * Per-player level cache used to detect level changes between ticks.
 *
 * <p>Stored in the player's persisted NBT ("PlayerPersisted"), which
 * survives logout, death and dimension changes (same carrier as the
 * task 1.1 init flag). The saved level is used as the "seen" marker:
 * whenever {@code player.experienceLevel} differs from the stored value,
 * the caps are re-applied.</p>
 */
public final class PlayerLevelTracker {

    private static final String KEY_LEVEL = "etim:tracked_level";

    private PlayerLevelTracker() {
    }

    /** Returns the level that the caps were last applied for. */
    public static int getTracked(EntityPlayer player) {
        NBTTagCompound persisted = player.getEntityData().getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
        return persisted.hasKey(KEY_LEVEL) ? persisted.getInteger(KEY_LEVEL) : -1;
    }

    /** Records that the caps are now applied for the given level. */
    public static void setTracked(EntityPlayer player, int level) {
        NBTTagCompound persisted = player.getEntityData().getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
        persisted.setInteger(KEY_LEVEL, level);
        // getCompoundTag returns a detached compound for a missing key,
        // like in task 1.1 it must be written back explicitly.
        player.getEntityData().setTag(EntityPlayer.PERSISTED_NBT_TAG, persisted);
    }
}
