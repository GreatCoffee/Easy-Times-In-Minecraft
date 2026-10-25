package io.github.etim.etim.world;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.DimensionType;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraft.world.storage.WorldSavedData;
import net.minecraftforge.common.DimensionManager;

/**
 * M1-01/08/11 + M2-13 — the underworld dimension skeleton.
 *
 * <p>R196 one-hand: {@code World.java:96-99} {@code DIMENSION_ID_UNDERWORLD=-2};
 * the underworld is a full server world ({@code server/MinecraftServer.java:182}),
 * so the 1.12 carrier is a real {@link DimensionType} (R196 has no such class,
 * B-1 ✓) registered in preInit — the A-5 hard constraint: the TYPE must exist
 * BEFORE {@link DimensionManager#registerDimension}, or the startup loop
 * ({@code MinecraftServer.java:336-348}) hot-loads the dimension instead.</p>
 *
 * <p>B-2 裁定 (provider 自带): the underworld y-offset face does NOT live here
 * — it is an instance getter on {@link ETIMWorldProviderUnderworld} (R196's
 * {@code Y_OFFSET_FOR_UNDERWORLD} dead constant is exactly the anti-pattern
 * being avoided; consumers read {@code world.provider}).</p>
 *
 * <p>M2-13 visited face: R196 persists {@code underworldHasBeenVisited} on the
 * worldInfo ({@code ServerPlayer.java:1022-1032}); 1.12 has no such field, so
 * it rides a {@link WorldSavedData} on the overworld's map storage (persists
 * into level.dat, set on first player arrival via the provider's
 * {@code onPlayerAdded} hook).</p>
 */
public final class ETIMDimensions {

    public static final int UNDERWORLD = -2;

    /** DimensionType registered in preInit (A-5: before registerDimension). */
    public static DimensionType UNDERWORLD_TYPE;

    private static final String VISIT_DATA_NAME = "etim_underworld";

    /** M1-01/08 — preInit face: type first, then the dimension id (A-5). */
    public static void register() {
        UNDERWORLD_TYPE = DimensionType.register("Underworld", "_underworld", UNDERWORLD,
                ETIMWorldProviderUnderworld.class, false);
        DimensionManager.registerDimension(UNDERWORLD, UNDERWORLD_TYPE);
        dimLog("dim-register id=-2 type=Underworld");
    }

    /** M1-11 — the getWorld(-2) lookup face (probe 判行锚). */
    public static WorldServer underworldOrNull(MinecraftServer server) {
        for (WorldServer w : DimensionManager.getWorlds()) {
            if (w.provider.getDimension() == UNDERWORLD) {
                return w;
            }
        }
        return null;
    }

    public static boolean isUnderworld(World world) {
        return world.provider.getDimension() == UNDERWORLD;
    }

    // ------------------- M2-13 visited (WorldSavedData on the overworld) -------------------

    /** Marks the underworld visited (provider.onPlayerAdded face; R196 ServerPlayer:1030-1032). */
    public static void markUnderworldVisited(WorldServer underworld) {
        MinecraftServer server = underworld.getMinecraftServer();
        WorldServer overworld = server.getWorld(0);
        VisitData data = (VisitData) overworld.getMapStorage()
                .getOrLoadData(VisitData.class, VISIT_DATA_NAME);
        if (data == null) {
            data = new VisitData(VISIT_DATA_NAME);
            overworld.getMapStorage().setData(VISIT_DATA_NAME, data);
        }
        if (!data.visited) {
            data.visited = true;
            data.markDirty();
            dimLog("visit set dim=-2");
        }
    }

    public static boolean underworldVisited(MinecraftServer server) {
        VisitData data = (VisitData) server.getWorld(0).getMapStorage()
                .getOrLoadData(VisitData.class, VISIT_DATA_NAME);
        return data != null && data.visited;
    }

    /**
     * M1-12 — R196 {@code WorldServer.shouldTimeProgress :136-160}, underworld
     * branch: visited ∧ non-ghost players in overworld‖nether‖underworld.
     * Ghost → spectator/dead/health≤0 (audit19 #6 直映射先例).
     */
    public static boolean shouldUnderworldTimeProgress(WorldServer underworld) {
        if (!underworldVisited(underworld.getMinecraftServer())) {
            return false;
        }
        return hasNonGhostPlayers(0) || hasNonGhostPlayers(-1) || hasNonGhostPlayers(UNDERWORLD);
    }

    private static boolean hasNonGhostPlayers(int dimension) {
        for (WorldServer w : DimensionManager.getWorlds()) {
            if (w.provider.getDimension() == dimension) {
                for (net.minecraft.entity.player.EntityPlayer p : w.playerEntities) {
                    if (!p.isSpectator() && !p.isDead && p.getHealth() > 0.0F) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // ------------------- [DimLog] channel (D-9: underworldDebugLog) -------------------

    public static void dimLog(String row) {
        if (ETIMConfig.underworldDebugLog) {
            ETIM.LOGGER.info("[DimLog] " + row + " [server]");
        }
    }

    /** M2-13 — the persisted visited flag (WorldSavedData = level.dat bound). */
    public static class VisitData extends WorldSavedData {
        public boolean visited;

        public VisitData(String name) {
            super(name);
        }

        @Override
        public void readFromNBT(NBTTagCompound nbt) {
            this.visited = nbt.getBoolean("visited");
        }

        @Override
        public NBTTagCompound writeToNBT(NBTTagCompound nbt) {
            nbt.setBoolean("visited", this.visited);
            return nbt;
        }
    }

    private ETIMDimensions() {
    }
}
