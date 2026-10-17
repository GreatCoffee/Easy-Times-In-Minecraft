package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.monster.IMob;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

import java.util.Collections;
import java.util.List;

/**
 * bed-entry (playground/audit/bed-entry-slice-comparison.md, verdict批文 all
 * sections carried):
 *
 * <ul>
 *   <li>S1 — the R196 NOT_SAFE pathable face ({@code EntityPlayer.java
 *       :1347-1384}: IMob + navigator path reaching the bed) replaces the
 *       vanilla EntityMob AABB probe via the MixinEntityPlayer redirect
 *       (M3: {@code EntityLiving}+IMob — 1.12 vanilla's EntityMob query
 *       misses the Ghast/Slime/Shulker IMob families). M2: the distance
 *       gate (:1367) precedes the path gate (:1368) in the candidate loop.</li>
 *   <li>S1 — the R196 notSheltered face ({@code World.java:5658-5879}
 *       isOutdoors, 37-window rain-height scan) ported verbatim below;
 *       the hasNoSky gate fronts on {@code provider.hasSkyLight()} (1.12
 *       has no no-sky field, verdict M-registry face).</li>
 *   <li>S2 — the R196 lie-side per-tick sentinel ({@code EntityPlayer.java
 *       :402-430}). M1 (强制): this runs from the REAL per-player tick
 *       (ETIMFoodStatsEvents.onPlayerTick) and NEVER through the
 *       {@code ETIMFoodStats.tickBedGate} body — the sleepForward batch
 *       loop calls tickBedGate directly per slept tick (~22k times per
 *       night) and must not drag the hostile-probe face along.</li>
 *   <li>M6 — the three custom lang keys (tile.bed.notSheltered/obstructed/
 *       poisoned) live in the ETIM lang files with the R196 en originals.</li>
 * </ul>
 *
 * <p>[SleepLog] rows (verdict §6): {@code bed-refuse reason=... x,y,z=...},
 * {@code bed-occupied-cleared x,y,z=...}, {@code bed-wake reason=... sleeper=
 * true|false x,y,z=... tick=...} — edge-deduped on reason|pos|stage-of-tick.</p>
 */
public final class ETIMBedSafety {

    /** Edge-dedupe key of the last emitted bed row (no gameplay role). */
    private static String lastBedLogKey = "";

    private ETIMBedSafety() {
    }

    /**
     * R196 getHostileEntityNearBed (:1347-1384). The AABB spine is the bed
     * position (vanilla :1697 builds it as x±8 / y±5 around the bed).
     */
    public static List<EntityLiving> pathableHostilesNearBed(World world, AxisAlignedBB aabb) {
        int bedX = MathHelper.floor((aabb.minX + aabb.maxX) / 2.0D);
        int bedY = MathHelper.floor((aabb.minY + aabb.maxY) / 2.0D);
        int bedZ = MathHelper.floor((aabb.minZ + aabb.maxZ) / 2.0D);
        EntityLiving nearest = null;
        double nearestDistSq = 1000.0;
        for (EntityLiving entity : world.getEntitiesWithinAABB(EntityLiving.class, aabb)) {
            if (!(entity instanceof IMob)) { // R196 :1360 (M3), xminer world query stays EntityLiving
                continue;
            }
            int dx = MathHelper.floor(entity.posX) - bedX; // R196 :1362-1366
            int dy = MathHelper.floor(entity.posY) - bedY;
            int dz = MathHelper.floor(entity.posZ) - bedZ;
            double distSq = dx * dx + dy * dy + dz * dz;
            if (nearest != null && distSq >= nearestDistSq) {
                continue; // M2: the closer-only path probe gate （R196 :1367 before :1368)
            }
            // R196 :1368 cap=24 has no 1.12 overload; PathNavigate gains its own
            // search-range cap (C-level equivalence, batch M-registry note).
            Path path = entity.getNavigator().getPathToXYZ(bedX, bedY, bedZ);
            if (path == null) {
                continue;
            }
            PathPoint finalPoint = path.getFinalPathPoint(); // R196 :1370, 1.12 Path:49
            if (finalPoint == null) {
                continue;
            }
            if (Math.abs(finalPoint.x - bedX) <= 1 // R196 :1371-1374 ±1 tolerance
                    && Math.abs(finalPoint.y - bedY) <= 1
                    && Math.abs(finalPoint.z - bedZ) <= 1) {
                nearest = entity;
                nearestDistSq = distSq;
            }
        }
        return nearest == null ? Collections.<EntityLiving>emptyList() : Collections.singletonList(nearest);
    }

    /** R196 isOutdoors public entry (World.java:5877-5879). */
    public static boolean isOutdoors(World world, int x, int y, int z) {
        return isOutdoors(world, x, y, z, true);
    }

    /** R196 World.java:5658-5875 verbatim; hasNoSky gate = hasSkyLight(). */
    private static boolean isOutdoors(World world, int x, int y, int z, boolean initialCall) {
        if (!world.provider.hasSkyLight()) {
            return false;
        }

        boolean[] checkBlock = new boolean[49];
        if (initialCall && isAirOrPassableBlock(world, x, y + 1, z)) {
            if (isOutdoors(world, x, y + 1, z, false)) {
                return true;
            }
            if (isAirOrPassableBlock(world, x, y + 2, z) && isOutdoors(world, x, y + 2, z, false)) {
                return true;
            }
        }

        if (isAirOrPassableBlock(world, x, y, z) && world.getPrecipitationHeight(new BlockPos(x, 0, z)).getY() <= y) {
            return true;
        }

        if (isAirOrPassableBlock(world, x + 1, y, z)) {
            if (world.getPrecipitationHeight(new BlockPos(x + 1, 0, z)).getY() <= y) {
                return true;
            }
            checkBlock[18] = true;
            checkBlock[26] = true;
            checkBlock[32] = true;
        }

        if (isAirOrPassableBlock(world, x - 1, y, z)) {
            if (world.getPrecipitationHeight(new BlockPos(x - 1, 0, z)).getY() <= y) {
                return true;
            }
            checkBlock[16] = true;
            checkBlock[22] = true;
            checkBlock[30] = true;
        }

        if (isAirOrPassableBlock(world, x, y, z + 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x, 0, z + 1)).getY() <= y) {
                return true;
            }
            checkBlock[30] = true;
            checkBlock[38] = true;
            checkBlock[32] = true;
        }

        if (isAirOrPassableBlock(world, x, y, z - 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x, 0, z - 1)).getY() <= y) {
                return true;
            }
            checkBlock[16] = true;
            checkBlock[10] = true;
            checkBlock[18] = true;
        }

        if (checkBlock[18] && isAirOrPassableBlock(world, x + 1, y, z - 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x + 1, 0, z - 1)).getY() <= y) {
                return true;
            }
            checkBlock[11] = true;
            checkBlock[19] = true;
        }

        if (checkBlock[32] && isAirOrPassableBlock(world, x + 1, y, z + 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x + 1, 0, z + 1)).getY() <= y) {
                return true;
            }
            checkBlock[33] = true;
            checkBlock[39] = true;
        }

        if (checkBlock[30] && isAirOrPassableBlock(world, x - 1, y, z + 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x - 1, 0, z + 1)).getY() <= y) {
                return true;
            }
            checkBlock[29] = true;
            checkBlock[37] = true;
        }

        if (checkBlock[16] && isAirOrPassableBlock(world, x - 1, y, z - 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x - 1, 0, z - 1)).getY() <= y) {
                return true;
            }
            checkBlock[9] = true;
            checkBlock[15] = true;
        }

        if (checkBlock[26] && isAirOrPassableBlock(world, x + 2, y, z)) {
            if (world.getPrecipitationHeight(new BlockPos(x + 2, 0, z)).getY() <= y) {
                return true;
            }
            checkBlock[19] = true;
            checkBlock[27] = true;
            checkBlock[33] = true;
        }

        if (checkBlock[38] && isAirOrPassableBlock(world, x, y, z + 2)) {
            if (world.getPrecipitationHeight(new BlockPos(x, 0, z + 2)).getY() <= y) {
                return true;
            }
            checkBlock[37] = true;
            checkBlock[39] = true;
            checkBlock[45] = true;
        }

        if (checkBlock[22] && isAirOrPassableBlock(world, x - 2, y, z)) {
            if (world.getPrecipitationHeight(new BlockPos(x - 2, 0, z)).getY() <= y) {
                return true;
            }
            checkBlock[15] = true;
            checkBlock[21] = true;
            checkBlock[29] = true;
        }

        if (checkBlock[10] && isAirOrPassableBlock(world, x, y, z - 2)) {
            if (world.getPrecipitationHeight(new BlockPos(x, 0, z - 2)).getY() <= y) {
                return true;
            }
            checkBlock[3] = true;
            checkBlock[9] = true;
            checkBlock[11] = true;
        }

        if (checkBlock[11] && isAirOrPassableBlock(world, x + 1, y, z - 2)) {
            if (world.getPrecipitationHeight(new BlockPos(x + 1, 0, z - 2)).getY() <= y) {
                return true;
            }
            checkBlock[12] = true;
        }

        if (checkBlock[19] && isAirOrPassableBlock(world, x + 2, y, z - 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x + 2, 0, z - 1)).getY() <= y) {
                return true;
            }
            checkBlock[12] = true;
        }

        if (checkBlock[33] && isAirOrPassableBlock(world, x + 2, y, z + 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x + 2, 0, z + 1)).getY() <= y) {
                return true;
            }
            checkBlock[40] = true;
        }

        if (checkBlock[39] && isAirOrPassableBlock(world, x + 1, y, z + 2)) {
            if (world.getPrecipitationHeight(new BlockPos(x + 1, 0, z + 2)).getY() <= y) {
                return true;
            }
            checkBlock[40] = true;
        }

        if (checkBlock[37] && isAirOrPassableBlock(world, x - 1, y, z + 2)) {
            if (world.getPrecipitationHeight(new BlockPos(x - 1, 0, z + 2)).getY() <= y) {
                return true;
            }
            checkBlock[36] = true;
        }

        if (checkBlock[29] && isAirOrPassableBlock(world, x - 2, y, z + 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x - 2, 0, z + 1)).getY() <= y) {
                return true;
            }
            checkBlock[36] = true;
        }

        if (checkBlock[15] && isAirOrPassableBlock(world, x - 2, y, z - 1)) {
            if (world.getPrecipitationHeight(new BlockPos(x - 2, 0, z - 1)).getY() <= y) {
                return true;
            }
            checkBlock[8] = true;
        }

        if (checkBlock[9] && isAirOrPassableBlock(world, x - 1, y, z - 2)) {
            if (world.getPrecipitationHeight(new BlockPos(x - 1, 0, z - 2)).getY() <= y) {
                return true;
            }
            checkBlock[8] = true;
        }

        if (checkBlock[12] && isAirOrPassableBlock(world, x + 2, y, z - 2)
                && world.getPrecipitationHeight(new BlockPos(x + 2, 0, z - 2)).getY() <= y) {
            return true;
        } else if (checkBlock[40] && isAirOrPassableBlock(world, x + 2, y, z + 2)
                && world.getPrecipitationHeight(new BlockPos(x + 2, 0, z + 2)).getY() <= y) {
            return true;
        } else if (checkBlock[36] && isAirOrPassableBlock(world, x - 2, y, z + 2)
                && world.getPrecipitationHeight(new BlockPos(x - 2, 0, z + 2)).getY() <= y) {
            return true;
        } else if (checkBlock[8] && isAirOrPassableBlock(world, x - 2, y, z - 2)
                && world.getPrecipitationHeight(new BlockPos(x - 2, 0, z - 2)).getY() <= y) {
            return true;
        } else if (checkBlock[27] && isAirOrPassableBlock(world, x + 3, y, z)
                && world.getPrecipitationHeight(new BlockPos(x + 3, 0, z)).getY() <= y) {
            return true;
        } else if (checkBlock[45] && isAirOrPassableBlock(world, x, y, z + 3)
                && world.getPrecipitationHeight(new BlockPos(x, 0, z + 3)).getY() <= y) {
            return true;
        } else {
            return checkBlock[21] && isAirOrPassableBlock(world, x - 3, y, z)
                    && world.getPrecipitationHeight(new BlockPos(x - 3, 0, z)).getY() <= y
                    ? true
                    : checkBlock[3] && isAirOrPassableBlock(world, x, y, z - 3)
                            && world.getPrecipitationHeight(new BlockPos(x, 0, z - 3)).getY() <= y;
        }
    }

    /**
     * R196 isAirOrPassableBlock (World.java:5634-5652), the includeLiquid=
     * false vertex used by isOutdoors. Solid face = {@code blocksMovement()}
     * (R196 block.isSolid parity — fences/glass count solid), liquid excluded.
     * Public: the obstructed entry gate reuses the same face.
     */
    public static boolean isAirOrPassableBlock(World world, int x, int y, int z) {
        if (y < 0 || y > 255) {
            return true;
        }
        BlockPos pos = new BlockPos(x, y, z);
        if (!world.isBlockLoaded(pos)) {
            return false;
        }
        IBlockState state = world.getBlockState(pos);
        Material material = state.getMaterial();
        if (material.isLiquid()) {
            return false;
        }
        return !material.blocksMovement();
    }

    /**
     * S2 — R196 lie-side per-tick sentinel (:402-430). The vanilla inBed-break
     * face is its own (:249-253); vanilla's per-tick time face (:255-258) is
     * running and untouched. Config gate: bedSentryWake.
     */
    public static void tickSentry(EntityPlayer player) {
        if (!ETIMConfig.bedSentryWake || player.world.isRemote || !player.isPlayerSleeping()) {
            return;
        }
        BlockPos bed = player.bedLocation; // EntityPlayer.java:144, public
        if (bed == null) {
            return;
        }
        // R196 :405-412 hostile-to-bed face (digging face :413 deferred with the
        // zombie dig-AI slice; hunger face :421 stays in the shipped tickBedGate).
        AxisAlignedBB aabb = new AxisAlignedBB(
                bed.getX() - 8.0D, bed.getY() - 5.0D, bed.getZ() - 8.0D,
                bed.getX() + 8.0D, bed.getY() + 5.0D, bed.getZ() + 8.0D);
        List<EntityLiving> hostiles = pathableHostilesNearBed(player.world, aabb);
        if (!hostiles.isEmpty()) {
            boolean slept = player.isPlayerFullyAsleep(); // R196 :406 sleeper-vs-lying split
            player.sendStatusMessage(new net.minecraft.util.text.TextComponentTranslation(
                    "tile.bed." + (slept ? "wakeMobs" : "notSafe")), true);
            logBedWake(player.world, "notSafe", slept, bed);
            player.wakeUpPlayer(true, true, false); // R196 :412 eject face (look-at face has no 1.12 param, C-level)
        }
    }

    /** bed-refuse row, verbatim log face (positions/coordinates + time self-contained). */
    public static void logBedRefuse(World world, String reason, BlockPos bed) {
        long total = world.getWorldInfo().getWorldTotalTime();
        String key = reason + "|" + bed + "|gate|" + total;
        if (key.equals(lastBedLogKey)) {
            return;
        }
        lastBedLogKey = key;
        ETIM.LOGGER.info("[SleepLog] bed-refuse reason=" + reason
                + " x,y,z=" + bed.getX() + "," + bed.getY() + "," + bed.getZ()
                + " adjusted=" + ETIMSleepClock.adjustedTimeOfDay(world)
                + " day=" + (total / 24000L + 1L));
    }

    /** bed-refuse row overload resolving the bed spine from the R196 :1697 AABB. */
    public static void logBedRefuse(World world, String reason, AxisAlignedBB aabb) {
        logBedRefuse(world, reason, new BlockPos(
                MathHelper.floor((aabb.minX + aabb.maxX) / 2.0D),
                MathHelper.floor((aabb.minY + aabb.maxY) / 2.0D),
                MathHelper.floor((aabb.minZ + aabb.maxZ) / 2.0D)));
    }

    /** bed-occupied-cleared row (vanilla-native stale-flag self-clear observed at the座 face). */
    public static void logOccupiedCleared(World world, BlockPos bed) {
        String key = "cleared|" + bed + "|gate|" + world.getWorldInfo().getWorldTotalTime();
        if (key.equals(lastBedLogKey)) {
            return;
        }
        lastBedLogKey = key;
        ETIM.LOGGER.info("[SleepLog] bed-occupied-cleared x,y,z="
                + bed.getX() + "," + bed.getY() + "," + bed.getZ());
    }

    /** bed-wake row (lie-side sentinel refusal). */
    private static void logBedWake(World world, String reason, boolean slept, BlockPos bed) {
        ETIM.LOGGER.info("[SleepLog] bed-wake reason=" + reason
                + " sleeper=" + slept
                + " x,y,z=" + bed.getX() + "," + bed.getY() + "," + bed.getZ()
                + " tick=" + world.getWorldTime());
    }
}
