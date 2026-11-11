package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

import java.util.UUID;

/**
 * B-34 — R196 {@code EntityAIWitchRoaming} (:1-37) verbatim — the night
 * roam AWAY from the spawn memo when no player is within 16 blocks of it.
 * The bare {@code EntityAIBase} (the R196 roam has no stuck/movement-task
 * machinery), seated by {@code MixinEntityWitch} only (R196
 * {@code EntityWitch :47} {@code tasks.addTask(3, …)}).
 *
 * <p>R196 shape:</p>
 * <ul>
 *   <li>{@code shouldExecute :12-16} — {@code !isDaytime &&
 *       !world.isPlayerNearby(spawn, 16.0) && getRNG().nextInt(100) <= 0}.</li>
 *   <li>{@code continueExecuting :19-26} — the four-face chain
 *       {@code !isDaytime && !(distSqToSpawn > 4096) && !isPlayerNearby &&
 *       nextInt(4000) != 0 ? !noPath() : false} (4096 = 64² leash).</li>
 *   <li>{@code startExecuting :29-31} —
 *       {@code setPath(findPathAwayFromXYZ(spawn, 16, 48, true), 1.0)}.</li>
 *   <li>{@code resetTask :34-36} — {@code clearPath}.</li>
 * </ul>
 *
 * <p>The spawn memo rides the B-30 IState faces (wanderback parity): a
 * witch without {@code spawnSet} never executes.</p>
 *
 * <p>Carriers:</p>
 * <ul>
 *   <li>{@code World.isPlayerNearby} (:5165-5174) — inline; the 1.12
 *       {@code isAnyPlayerWithinRangeAt (:3635)} uses a STRICT {@code <} on
 *       the range (C-note, ported with {@code <=}); the ghost face →
 *       {@code isSpectator}, the tournament face has no 1.12 carrier
 *       (skipped, C).</li>
 *   <li>{@code World.findEntityPathAwayFromXYZ} (:4795-4840) — the
 *       16-attempt sampler, inline: the RNG trial offsets (the R196
 *       {@code RNG.int_max} table → {@code rand.nextInt}, C-note), the
 *       ground-snap walk, the score = the distance² from the spawn ≥ 256
 *       AND strictly better, the final-point re-score; wrapped in the
 *       wanderback FOLLOW_RANGE boost idiom (the R196 max_path_length 48
 *       cap has no 1.12 API on {@code getPathToXYZ}).</li>
 *   <li>{@code World.isAirOrPassableBlock} (:5634-5652) — the y-bounds →
 *       TRUE quirk kept verbatim; {@code !blockExists → false}; air →
 *       true; liquid → false; else {@code !block.isPassable(world, pos)}
 *       (Block.java:424).</li>
 * </ul>
 *
 * <p>Judge rows: {@code [AILog] roam src=witch …} — unconditional at
 * {@code startExecuting} (the B-29 lesson), {@code mobDebugLog} gated;
 * probe = the 1/16 roll family. Flag seat = {@code livestockNeedsR196}
 * (the thirteenth reuse).</p>
 */
public class ETIMEntityAIWitchRoaming extends net.minecraft.entity.ai.EntityAIBase {

    private final EntityLiving owner;
    private final World world;

    /** getMovementPath 的 FOLLOW_RANGE 临时修正 UUID（固定 ID = 反复
     * apply/remove 不重挂重名行；与 wanderback 同法不同 ID）。 */
    private static final UUID BOOST_MODIFIER_ID =
            UUID.fromString("2c8d3a1f-6b4e-4f7e-a9c0-1d5b8e3f7a24");

    /** B-19 r4 probe pattern: one row per 16 shouldExecute calls. */
    private static int probeCounter = 0;

    public ETIMEntityAIWitchRoaming(EntityLiving owner) {
        this.owner = owner;
        this.world = owner.world;
        this.setMutexBits(1); // R196 :8
    }

    @Override
    public boolean shouldExecute() {
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        boolean flagGate = ETIMConfig.livestockNeedsR196; // D-1 — the family flag seat
        if (ETIMConfig.mobDebugLog) {
            int idx = (probeCounter = probeCounter + 1) % 16;
            if (idx == 0) {
                ETIMLivestock.IState sp = ETIMLivestock.get(this.owner);
                ETIM.LOGGER.info("[AILog] roam src=witch probe-in inv=" + probeCounter
                        + " spawnSet=" + (sp != null && sp.getSpawnSet())
                        + " day=" + this.world.isDaytime()
                        + " flag=" + flagGate
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (!flagGate) {
            return false;
        }
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s == null || !s.getSpawnSet()) {
            return false; // no spawn memo — the R196 ctor seed absent
        }
        if (this.world.isDaytime()) {
            return false; // R196 :12 — the night gate
        }
        if (isPlayerNearbySpawn(s, 16.0D)) {
            return false; // R196 :13 — a player near the spawn blocks the roam
        }
        return this.owner.getRNG().nextInt(100) <= 0; // R196 :14 — the 1-in-100 roll
    }

    /** R196 World.isPlayerNearby :5165-5174 inline — the spawn-memo anchor. */
    private boolean isPlayerNearbySpawn(ETIMLivestock.IState s, double range) {
        double rangeSq = range * range;
        for (EntityPlayer p : this.world.playerEntities) {
            if (p.isSpectator()) {
                continue; // R196 !isGhost (C: the 1.12 carrier = the spectator face)
            }
            double dx = p.posX - s.getSpawnX();
            double dy = p.posY - s.getSpawnY();
            double dz = p.posZ - s.getSpawnZ();
            if (dx * dx + dy * dy + dz * dz <= rangeSq) {
                return true;
            }
        }
        return false;
    }

    /** R196 :19-26 — the four-face chain ? !noPath() : false. */
    @Override
    public boolean shouldContinueExecuting() {
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s == null || !s.getSpawnSet()) {
            return false; // never started without a memo — keep the arm inert
        }
        boolean keep = !this.world.isDaytime() // :20
                && !(distSqTo(s) > 4096.0D) // :20 — the 64-block leash
                && !isPlayerNearbySpawn(s, 16.0D) // :21
                && this.owner.getRNG().nextInt(4000) != 0; // :22 — the 1/4000 abort roll
        return keep ? !this.owner.getNavigator().noPath() : false; // :23-25
    }

    /** R196 :29-31 — {@code setPath(findPathAwayFromXYZ(spawn, 16, 48, true), 1.0)}. */
    @Override
    public void startExecuting() {
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        Path path = null;
        double distSq = 0.0D;
        if (s != null && s.getSpawnSet()) {
            distSq = distSqTo(s);
            path = findPathAwayFromSpawn(s, 16.0D, 48);
        }
        if (path != null) {
            this.owner.getNavigator().setPath(path, 1.0F); // R196 :31
        }
        // The judge row lands UNCONDITIONALLY (the B-29 r2/r4 lesson — the
        // path face is a VALUE, never a gate).
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] roam src=witch start"
                    + " dist=" + String.format("%.2f", Math.sqrt(Math.max(distSq, 0.0D)))
                    + " path=" + (path != null)
                    + " spawn=" + (s != null && s.getSpawnSet()
                            ? "(" + s.getSpawnX() + "," + s.getSpawnY() + "," + s.getSpawnZ() + ")" : "null")
                    + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
    }

    /** R196 :34-36 — clearPath. */
    @Override
    public void resetTask() {
        this.owner.getNavigator().clearPath();
    }

    private double distSqTo(ETIMLivestock.IState s) {
        double dx = this.owner.posX - s.getSpawnX();
        double dy = this.owner.posY - s.getSpawnY();
        double dz = this.owner.posZ - s.getSpawnZ();
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * R196 World.findEntityPathAwayFromXYZ :4795-4840 inline — the
     * 16-attempt sampler. The trial offsets ride {@code getRNG()} (C: the
     * R196 {@code RNG.int_max} table → {@code rand.nextInt}); the ground
     * snap walks down while the below block is air/passable then up while
     * the block itself is NOT; the score = the distance² from the spawn,
     * accepted at ≥ 256 AND strictly better than the current best; the
     * final path point re-scores before the commit. The wanderback
     * FOLLOW_RANGE boost idiom wraps the attempts (the R196
     * max_path_length 48 cap has no 1.12 API).
     */
    private Path findPathAwayFromSpawn(ETIMLivestock.IState s, double minDistance, int maxPathLength) {
        double minDistanceSq = minDistance * minDistance; // R196 :4797 — 256
        int entityX = MathHelper.floor(this.owner.posX);
        int entityY = MathHelper.floor(this.owner.posY);
        int entityZ = MathHelper.floor(this.owner.posZ);
        double furthest = distSqTo(s); // R196 :4799 — the current distance² from the spawn
        Path bestPath = null;
        java.util.Random rng = this.owner.getRNG();
        net.minecraft.entity.ai.attributes.IAttributeInstance range = this.owner
                .getEntityAttribute(net.minecraft.entity.SharedMonsterAttributes.FOLLOW_RANGE);
        double dist = MathHelper.sqrt(furthest);
        net.minecraft.entity.ai.attributes.AttributeModifier boost =
                new net.minecraft.entity.ai.attributes.AttributeModifier(BOOST_MODIFIER_ID,
                        "etim witchroam path search boost", dist + 8.0D - range.getBaseValue(), 0 /* ADDITION */);
        range.applyModifier(boost);
        try {
            for (int attempt = 0; attempt < 16; attempt++) { // R196 :4803 — 16 attempts
                int trialX = entityX + rng.nextInt(97) - 48; // :4805 (C — the RNG.int_max %97 face → rand)
                int trialZ = entityZ + rng.nextInt(97) - 48; // :4806
                int trialY = entityY + rng.nextInt(7) - 3;   // :4807 (C — int_7_minus_3 → rand)
                // The ground snap — R196 :4810-4823: walk DOWN while the block
                // below is air/passable (≤8), then UP while the block is not (≤8).
                int y = trialY;
                int steps = 0;
                while (y > 0 && steps < 8 && isAirOrPassable(trialX, y - 1, trialZ)) {
                    y--;
                    steps++;
                }
                steps = 0;
                while (y < 255 && steps < 8 && !isAirOrPassable(trialX, y, trialZ)) {
                    y++;
                    steps++;
                }
                double score = (trialX - s.getSpawnX()) * (double) (trialX - s.getSpawnX())
                        + (y - s.getSpawnY()) * (double) (y - s.getSpawnY())
                        + (trialZ - s.getSpawnZ()) * (double) (trialZ - s.getSpawnZ());
                if (score >= minDistanceSq && score > furthest) { // R196 :4826 — strictly better
                    // :4830 — getPathToXYZ(trial, max_path_length=48); the 1.12
                    // getPathToXYZ has no length param (C) — the boost idiom carries it.
                    Path p = this.owner.getNavigator().getPathToXYZ(
                            trialX + 0.5D, y + 0.5D, trialZ + 0.5D);
                    if (p != null) {
                        PathPoint fp = p.getFinalPathPoint();
                        if (fp != null) {
                            double fscore = (fp.x - s.getSpawnX()) * (double) (fp.x - s.getSpawnX())
                                    + (fp.y - s.getSpawnY()) * (double) (fp.y - s.getSpawnY())
                                    + (fp.z - s.getSpawnZ()) * (double) (fp.z - s.getSpawnZ());
                            if (fscore >= minDistanceSq && fscore > furthest) { // :4834-4838 — the final re-score
                                furthest = fscore;
                                bestPath = p;
                            }
                        }
                    }
                }
            }
        } finally {
            range.removeModifier(boost); // the wanderback finally-restore parity
        }
        return bestPath;
    }

    /** R196 World.isAirOrPassableBlock :5634-5652 — the y-bounds → TRUE quirk kept. */
    private boolean isAirOrPassable(int x, int y, int z) {
        if (y < 0 || y > 255) {
            return true; // the R196 quirk (out-of-world counts as passable)
        }
        BlockPos pos = new BlockPos(x, y, z);
        if (!this.world.isBlockLoaded(pos)) {
            return false; // R196 !blockExists → false
        }
        IBlockState state = this.world.getBlockState(pos);
        Block block = state.getBlock();
        if (state.getMaterial() == Material.AIR) {
            return true; // R196 id == 0
        }
        if (state.getMaterial().isLiquid()) {
            return false;
        }
        return !block.isPassable(this.world, pos); // 1.12 carrier (Block.java:424)
    }
}
