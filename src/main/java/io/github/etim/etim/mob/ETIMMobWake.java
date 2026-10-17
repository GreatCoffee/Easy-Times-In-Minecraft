package io.github.etim.etim.mob;

import java.util.ArrayList;
import java.util.List;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.mixins.EntityLivingBaseAccessor;
import io.github.etim.etim.playerstate.ETIMBedSafety;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EnumCreatureType;
import net.minecraft.entity.monster.EntityEnderman;
import net.minecraft.entity.monster.EntitySlime;
import net.minecraft.entity.monster.IMob;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.util.text.TextComponentTranslation;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraft.world.biome.Biome;

/**
 * AI-01 — the R196 mobwake roll (mobs-ai verdict 裁 1/2/6, must-add A1/A3):
 * once per slept tick the batch night rolls 1/mobwakeRarity and paths a
 * nearby hostile to a sleeping player's bed to wake them (R196
 * WorldServer.java:551-578). The roll itself sits in
 * {@link io.github.etim.etim.playerstate.ETIMSleepClock} (A4: slept-tick
 * level, outer loop); this class owns the roll body:
 * <ol>
 *   <li>{@code pathNearbyMobToRandomSleepingPlayer} (:436-472) — expand the
 *       search AABB 16→64 (y compressed /4), collect IMobs, ≤16 random
 *       distinct attempts, path each to the bed;</li>
 *   <li>spawn fallback {@code tryPlaceNewSuitableMob} (:357-422) — 16
 *       sampled positions (rand.nextInt direct substitution for the R196 RNG
 *       tables, 裁 2), sink/float correction, distance/light gates, the ETIM
 *       spawn-table monster pick (裁 1) with the explicit Enderman/Slime
 *       reject (A1, continue the attempts);</li>
 *   <li>{@code tryPathMobToSleepingPlayer} (:474-531) — path to the bed,
 *       final-point √2 gate, last-8-points line-of-sight pick, teleport the
 *       mob onto the chosen point and record it as the wake cause;</li>
 *   <li>the hatch gate (A3, :565-568) — a spawned fallback mob hatches
 *       unconditionally on a successful path, else on a 1/2 roll;</li>
 *   <li>the wake (R196 :573-578) — extinguish the cause mob, eject the
 *       sleeper (1.12 has no entity parameter, C 级 裁 6), wakeMobs
 *       message, and the interrupt that ends the batch night.</li>
 * </ol>
 *
 * <p>[SleepLog] row (verdict §7, one per roll hit — the rarity=1 judge face
 * guarantees ≥1 row per night): {@code sleep-mobwake tick=<total>
 * day=<n> mob=<SimpleName> x,y,z=<mob> player=<name> source=path|spawn
 * outcome=waked|noPath|noSpawn}. The shipped {@code sleep-mobwake deferred}
 * line is gone (constraint 1).</p>
 *
 * <p>Registered C 级 deviations: {@code sync_last_tick_pos_on_next_update}
 * dropped (tracker packet-optimization face, 1.12 teleport packets cover it),
 * {@code checkForLineOfSight}/{@code getEntityPathToXYZ} mapped to the
 * vanilla {@code rayTraceBlocks}/{@code PathNavigate.getPathToXYZ} faces
 * (bed-entry M-series precedent — the navigator's own configured door/water
 * semantics carry the R196 flag arguments).</p>
 */
public final class ETIMMobWake {

    /**
     * The mob that reached the bed this roll (R196
     * {@code WorldServer.wake_causing_entity} :529/:574). Set only by a
     * successful {@link #tryPathMobToSleepingPlayer}; read back in the same
     * roll, so no cross-roll staleness reaches the wake or the row.
     */
    private static EntityLiving wakeCausing;

    private ETIMMobWake() {
    }

    /**
     * R196 :552-578 — one roll body (the 1/1000 gate itself stays at the
     * ETIMSleepClock call site, A4). Returns true when a sleeper was woken
     * (the batch-night interrupt face).
     */
    public static boolean tryMobWake(WorldServer world) {
        long total = world.getWorldInfo().getWorldTotalTime();
        String mobName = "-";
        String mobPos = "-";
        String source = "path";
        String outcome;
        EntityPlayer target = pathNearbyMobToRandomSleepingPlayer(world);
        if (target != null) {
            outcome = "waked";
            if (wakeCausing != null) {
                mobName = wakeCausing.getClass().getSimpleName();
                mobPos = MathHelper.floor(wakeCausing.posX) + "," + MathHelper.floor(wakeCausing.posY)
                        + "," + MathHelper.floor(wakeCausing.posZ);
            }
        } else {
            EntityPlayer player = randomAlivePlayer(world);
            if (player == null) {
                outcome = "noSpawn";
            } else {
                source = "spawn";
                EntityLiving mob = tryPlaceNewSuitableMob(world, player, 8, 48);
                if (mob == null) {
                    outcome = "noSpawn";
                } else {
                    mobName = mob.getClass().getSimpleName();
                    mobPos = MathHelper.floor(mob.posX) + "," + MathHelper.floor(mob.posY)
                            + "," + MathHelper.floor(mob.posZ);
                    ((EntityLivingBaseAccessor) mob).etim$setIdleTime(-2400); // R196 :560 refreshDespawnCounter(-2400)
                    boolean patted = tryPathMobToSleepingPlayer(world, mob, player, 32);
                    if (patted) {
                        target = player;
                    }
                    // A3 — R196 :565-568 hatch gate: a successful path hatches
                    // the spawned mob unconditionally, a failed one on a 1/2
                    // roll (the new mob is never wasted on a silent discard).
                    if (target != null || world.rand.nextInt(2) == 0) {
                        mob.onInitialSpawn(world.getDifficultyForLocation(new BlockPos(mob)), null); // R196 :566 onSpawnWithEgg(null)
                        world.spawnEntity(mob); // R196 :567
                    }
                    outcome = target != null ? "waked" : "noPath";
                }
            }
        }
        if (target != null) {
            wakeCausing.extinguish(); // R196 :574
            target.wakeUpPlayer(true, true, false); // R196 :575, C 级 裁 6 (no entity param in 1.12)
            target.sendStatusMessage(new TextComponentTranslation("tile.bed.wakeMobs"), true); // R196 :576
        }
        ETIM.LOGGER.info("[SleepLog] sleep-mobwake tick=" + total + " day=" + (total / 24000L + 1L)
                + " mob=" + mobName + " x,y,z=" + mobPos
                + " player=" + (target != null ? target.getName() : "-")
                + " source=" + source + " outcome=" + outcome);
        return target != null;
    }

    /**
     * R196 :436-472. The player pick inside is
     * {@code getRandomNonGhostPlayer(true)} (World.java:5885-5904 — the
     * flag is must_be_alive, verified 待核 1): non-spectator + alive, the
     * sleep-01 :539 filter mapping. At the roll site the !woke gate holds,
     * so every candidate is still asleep.
     */
    private static EntityPlayer pathNearbyMobToRandomSleepingPlayer(WorldServer world) {
        EntityPlayer player = randomAlivePlayer(world);
        if (player == null) {
            return null;
        }
        List<EntityLiving> mobs = new ArrayList<>();
        int distance = 0;
        while (distance < 64) {
            distance += 16;
            mobs.clear();
            AxisAlignedBB aabb = player.getEntityBoundingBox().expand(distance, distance / 4.0D, distance); // R196 :447
            for (EntityLiving entity : world.getEntitiesWithinAABB(EntityLiving.class, aabb)) {
                if (entity instanceof IMob) { // R196 collects IMob.class; 1.12 class-filter API needs a class, the set is identical
                    mobs.add(entity);
                }
            }
            if (mobs.size() >= 16) { // R196 :448-450
                break;
            }
        }
        boolean[] tried = new boolean[mobs.size()];
        int attempts = Math.min(mobs.size(), 16); // R196 :454
        for (int attempt = 0; attempt < attempts; attempt++) {
            int index = world.rand.nextInt(mobs.size());
            if (tried[index]) {
                continue;
            }
            EntityLiving mob = mobs.get(index);
            // R196 :460-463 — ticksExisted/IMob re-checks are collection
            // guarantees here; the Enderman exclusion is the live gate.
            if (mob.ticksExisted > 0 && mob instanceof IMob && !(mob instanceof EntityEnderman)
                    && tryPathMobToSleepingPlayer(world, mob, player, distance)) {
                return player;
            }
            tried[index] = true; // R196 :467
        }
        return null;
    }

    /** R196 getRandomNonGhostPlayer(true) (World.java:5885-5904), ETIM filter face. */
    private static EntityPlayer randomAlivePlayer(WorldServer world) {
        List<EntityPlayer> candidates = new ArrayList<>();
        for (EntityPlayer player : world.playerEntities) {
            if (!player.isSpectator() && player.getHealth() > 0.0F) {
                candidates.add(player);
            }
        }
        return candidates.isEmpty() ? null : candidates.get(world.rand.nextInt(candidates.size()));
    }

    /**
     * R196 :357-422 (裁 1/2 mapping). {@code maxDistance} scales the dx/dz
     * window exactly like the R196 {@code int_max} table modulo
     * {@code (max*2+1) - max}; dy keeps the {@code int_7_minus_3} ∈ [-3,3]
     * spread. The Enderman/Slime reject (A1) continues the 16 attempts in
     * the R196 :397-403 order.
     */
    private static EntityLiving tryPlaceNewSuitableMob(WorldServer world, EntityPlayer player,
            int minDistance, int maxDistance) {
        int x = MathHelper.floor(player.posX);
        int y = MathHelper.floor(player.posY);
        int z = MathHelper.floor(player.posZ);
        int minDistanceSq = minDistance * minDistance;
        int maxDistanceSq = maxDistance * maxDistance;
        for (int attempt = 0; attempt < 16; attempt++) {
            int trialX = x + world.rand.nextInt(maxDistance * 2 + 1) - maxDistance; // R196 :364
            int trialY = y + world.rand.nextInt(7) - 3; // R196 :365 (int_7_minus_3)
            int trialZ = z + world.rand.nextInt(maxDistance * 2 + 1) - maxDistance; // R196 :367
            for (int i = 0; i < 8 && ETIMBedSafety.isAirOrPassableBlock(world, trialX, trialY - 1, trialZ, false); i++) {
                trialY--; // R196 :372-374
            }
            for (int i = 0; i < 8 && !ETIMBedSafety.isAirOrPassableBlock(world, trialX, trialY, trialZ, false); i++) {
                trialY++; // R196 :376-378
            }
            double distanceSq = distanceSqToNearestPlayer(world, trialX, trialY, trialZ);
            if (distanceSq < minDistanceSq || distanceSq > maxDistanceSq) { // R196 :381-382
                continue;
            }
            BlockPos trial = new BlockPos(trialX, trialY, trialZ);
            if (!world.isBlockLoaded(trial) || !world.isBlockLoaded(trial.down()) || !world.isBlockLoaded(trial.up())) {
                continue; // R196 :383-385 blockExists ×3
            }
            if (ETIMBedSafety.isAirOrPassableBlock(world, trialX, trialY - 1, trialZ, true)
                    || !ETIMBedSafety.isAirOrPassableBlock(world, trialX, trialY, trialZ, false)
                    || !ETIMBedSafety.isAirOrPassableBlock(world, trialX, trialY + 1, trialZ, false)) {
                continue; // R196 :386-388 — the foot must stand on a real solid (include_liquid=true vertex)
            }
            boolean outdoors = ETIMBedSafety.isOutdoors(world, trialX, trialY, trialZ);
            if (world.getLightBrightness(trial) > (outdoors ? 0.4F : 0.1F)) { // R196 :389-393
                continue;
            }
            double landingY = ETIMSpawnCycle.spawnLandingY(world, EnumCreatureType.MONSTER, trialX, trialY, trialZ); // R196 :395
            if (landingY < 0.0D) {
                continue;
            }
            Biome.SpawnListEntry entry = ETIMSpawnTables.pickSpawn(world, EnumCreatureType.MONSTER, trial); // R196 :396, 裁 1
            if (entry == null) {
                continue;
            }
            // A1 — R196 :397-403 explicit class reject, continue the attempts.
            if (entry.entityClass == EntityEnderman.class || entry.entityClass == EntitySlime.class) {
                continue;
            }
            EntityLiving mob = ETIMSpawnCycle.admitMonster(world, entry, trial, landingY, EnumCreatureType.MONSTER); // R196 :404-414
            if (mob != null) {
                return mob;
            }
        }
        return null;
    }

    /** R196 World.getDistanceSqToNearestPlayer (:5191-5208), block-coordinate face, spectator mapping. */
    private static double distanceSqToNearestPlayer(WorldServer world, int x, int y, int z) {
        double nearest = Double.MAX_VALUE;
        for (EntityPlayer player : world.playerEntities) {
            if (player.isSpectator()) {
                continue;
            }
            double dx = x - MathHelper.floor(player.posX);
            double dy = y - MathHelper.floor(player.posY);
            double dz = z - MathHelper.floor(player.posZ);
            double distanceSq = dx * dx + dy * dy + dz * dz;
            if (distanceSq < nearest) {
                nearest = distanceSq;
            }
        }
        return nearest;
    }

    /**
     * R196 :474-531. The sync_last_tick_pos flag is dropped (C 级); the
     * navigator path call loses R196's max-length/flag arguments (C 级
     * bed-entry M precedent — getPathToXYZ carries the navigator's own
     * configured semantics).
     */
    private static boolean tryPathMobToSleepingPlayer(WorldServer world, EntityLiving mob,
            EntityPlayer player, int maxPathLength) {
        BlockPos bed = player.bedLocation;
        if (bed == null) {
            return false;
        }
        Path path = mob.getNavigator().getPathToXYZ(bed.getX(), bed.getY(), bed.getZ()); // R196 :476-486
        if (path == null) {
            return false;
        }
        PathPoint finalPoint = path.getFinalPathPoint();
        if (finalPoint == null) {
            return false;
        }
        double dx = finalPoint.x - bed.getX(); // R196 :492-497 — the √2 final-point gate
        double dy = finalPoint.y - bed.getY();
        double dz = finalPoint.z - bed.getZ();
        if (dx * dx + dy * dy + dz * dz > 2.0D) {
            return false;
        }
        // R196 :499-518 — the first of the LAST 8 path points that sees the
        // bed (eye at +1.5 above the bed spine), else the first of them.
        int startIndex = Math.max(path.getCurrentPathLength() - 8, 0);
        Vec3d bedPos = new Vec3d(bed.getX() + 0.5D, bed.getY() + 1.5D, bed.getZ() + 0.5D);
        PathPoint chosen = null;
        for (int i = startIndex; i < path.getCurrentPathLength(); i++) {
            PathPoint point = path.getPathPointFromIndex(i);
            Vec3d eyePos = new Vec3d(point.x + 0.5D, point.y + mob.getEyeHeight(), point.z + 0.5D);
            if (lineOfSight(world, eyePos, bedPos)) {
                chosen = point;
                break;
            }
        }
        if (chosen == null) {
            chosen = path.getPathPointFromIndex(startIndex);
        }
        // R196 :521-527 — land on the supporting block's top face when there
        // is one below the chosen point (R196 block_below.maxY face).
        double landY = chosen.y;
        BlockPos below = new BlockPos(chosen.x, chosen.y - 1, chosen.z);
        if (world.getBlockState(below).getMaterial() != net.minecraft.block.material.Material.AIR) {
            landY = chosen.y - 1 + world.getBlockState(below).getBoundingBox(world, below).maxY;
        }
        mob.setPosition(chosen.x + 0.5D, landY, chosen.z + 0.5D);
        wakeCausing = mob; // R196 :529
        return true;
    }

    /** R196 checkForLineOfSight face → the vanilla canEntityBeSeen ray (C 级 equivalence). */
    private static boolean lineOfSight(World world, Vec3d from, Vec3d to) {
        RayTraceResult hit = world.rayTraceBlocks(from, to, false, true, false);
        return hit == null || hit.typeOfHit == RayTraceResult.Type.MISS;
    }
}
