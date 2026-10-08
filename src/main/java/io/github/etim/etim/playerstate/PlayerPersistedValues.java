package io.github.etim.etim.playerstate;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.nbt.NBTTagCompound;

/**
 * Access to the per-player persisted NBT compound
 * ({@link EntityPlayer#PERSISTED_NBT_TAG} inside the entity "ForgeData" tag).
 *
 * <p>This compound survives logout, death and dimension change (vanilla
 * copies it in {@code EntityPlayerMP#copyFrom}), so it is the carrier for
 * all ETIM per-player state until the capability system of task 1.4.</p>
 *
 * <p>Guest methods that mutate the compound must always write it back:
 * {@code getCompoundTag} returns a DETACHED compound for a missing key.</p>
 */
public final class PlayerPersistedValues {

    private PlayerPersistedValues() {
    }

    public static float getFloat(EntityPlayer player, String key) {
        NBTTagCompound persisted = player.getEntityData().getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
        return persisted.hasKey(key) ? persisted.getFloat(key) : 0.0F;
    }

    public static void setFloat(EntityPlayer player, String key, float value) {
        NBTTagCompound persisted = player.getEntityData().getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
        persisted.setFloat(key, value);
        player.getEntityData().setTag(EntityPlayer.PERSISTED_NBT_TAG, persisted);
    }

    public static int getInteger(EntityPlayer player, String key) {
        NBTTagCompound persisted = player.getEntityData().getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
        return persisted.hasKey(key) ? persisted.getInteger(key) : -1;
    }

    public static void setInteger(EntityPlayer player, String key, int value) {
        NBTTagCompound persisted = player.getEntityData().getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
        persisted.setInteger(key, value);
        player.getEntityData().setTag(EntityPlayer.PERSISTED_NBT_TAG, persisted);
    }

    public static boolean getBoolean(EntityPlayer player, String key) {
        NBTTagCompound persisted = player.getEntityData().getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
        return persisted.hasKey(key) && persisted.getBoolean(key);
    }

    public static void setBoolean(EntityPlayer player, String key, boolean value) {
        NBTTagCompound persisted = player.getEntityData().getCompoundTag(EntityPlayer.PERSISTED_NBT_TAG);
        persisted.setBoolean(key, value);
        player.getEntityData().setTag(EntityPlayer.PERSISTED_NBT_TAG, persisted);
    }
}
