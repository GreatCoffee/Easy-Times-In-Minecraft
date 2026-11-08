package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.EntityCreature;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathNavigate;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * B-25 — R196 {@code EntityAIGetOutOfLava} verbatim, the mirror twin of
 * B-22's {@link ETIMEntityAIGetOutOfWater} minus its two vetoes (the rider
 * cut and the livestock thirsty cut). R196 anchors:
 * <ul>
 *   <li>{@code shouldExecute :10-14} — the 1-in-16 scan roll
 *       ({@code RNG.chance_in_16}), then {@code handleLavaMovement()} =
 *       {@code world.isMaterialInBB(boundingBox.grow(-0.1, -0.4, -0.1),
 *       lava)} — 1.12's {@code Entity.isInLava()} is the same body verbatim
 *       (Entity :1463), so the carrier is the stock call.</li>
 *   <li>{@code getMovementPath :17-79} — 16 samples ({@code dx/dz ∈ ±16},
 *       {@code dy ∈ [-3,4]}), the ≤8-step ground-snap pair, the candidate
 *       door {@code airOrPassable(trial) ∧ solid ground below ∧ !occupied},
 *       a {@code getPathToXYZ(trial, 16)} whose final point revalidates the
 *       same two-sided door, shortest wins.</li>
 *   <li>{@code Cover face :72-74} — the R196 per-entity spawn-point
 *       fallback is C-grade parked (there is no 1.12 {@code spawn_x/y/z});
 *       the B-22 water twin parks it the same way.</li>
 *   <li>{@code continueExecuting :80-82} — the plain base
 *       {@code !stuck ∧ !noPath} (no override).</li>
 * </ul>
 * Seats (R196 : EntityDemonSpider :6 / EntityHellhound :20 — both 1.12
 * absent): the closest faithful 1.12 carrier is the nether pigman (real
 * vanilla gap — no lava-egress AI at all), seated by MixinEntityZombie's
 * pigman arm at priority 4, speed 1.0F. The Hellhound seat = the snow wolf
 * (dead code in any 1.12 world), C-grade unseated. Zero new cfg — the
 * family flag livestockNeedsR196 (the sixth reuse).
 *
 * Judge row: {@code [AILog] outoflava src=<kind> start speed=…} — one per
 * executed path, {@code mobDebugLog} gated (the B-22 outofwater row shape).
 */
public class ETIMEntityAIGetOutOfLava extends net.minecraft.entity.ai.EntityAIBase {

    private static final int MAX_PATH_LENGTH = 16; // R196 :4
    private static final int DOMAIN_SIZE = MAX_PATH_LENGTH * 2 + 1; // :21
    private static final int ATTEMPTS = 16; // :26

    private final EntityCreature owner;
    private final World world;
    private final float movementSpeed;

    // R196 EntityAIMovementTask :9-12 — the "has not moved" machinery
    private int lastX;
    private int lastZ;
    private int notMovedCounter;
    private int notMovedThreshold;

    // B-19/B-22/B-23 probe pattern: one row per 16 invocations (a
    // diagnostic, never a judge row).
    private int probeCounter = 0;

    // the LAVA walkable-hack: the saved EntityLiving LAVA path priority
    private float prevLavaPriority = 8.0F;

    public ETIMEntityAIGetOutOfLava(EntityCreature owner, float movementSpeed) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.setMutexBits(1); // R196 EntityAIMovementTask :21
    }

    @Override
    public boolean shouldExecute() {
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        if (!ETIMConfig.livestockNeedsR196) { // D-1 — the family flag seat
            return false;
        }
        if (ETIMConfig.mobDebugLog) {
            int idx = (this.probeCounter = this.probeCounter + 1) % 16;
            if (idx == 0) {
                ETIM.LOGGER.info("[AILog] outoflava src=" + ETIMLivestockEvents.kind(this.owner)
                        + " probe-in inv=" + this.probeCounter
                        + " inLava=" + this.owner.isInLava()
                        + " flag=" + ETIMConfig.livestockNeedsR196
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (this.owner.getRNG().nextInt(16) != 0) {
            return false; // R196 :12 — chance_in_16
        }
        return this.owner.isInLava(); // R196 :14 — handleLavaMovement() carrier
    }

    @Override
    public void startExecuting() { // R196 EntityAIMovementTask :47-73 (via the B-22 base shape)
        this.lastX = MathHelper.floor(this.owner.posX);
        this.lastZ = MathHelper.floor(this.owner.posZ);
        this.notMovedCounter = 0;
        this.notMovedThreshold = 30 + this.owner.getRNG().nextInt(20); // :51
        // 1.12 carrier: the vanilla pathfinder marks LAVA as a damaged node
        // (the EntityLiving default priority is 8.0F) and refuses to route
        // from a start-node inside lava — R196's finder walks lava freely.
        // Zero the owner's LAVA priority for this search (and the walk it
        // starts); restored on resetTask (and defensively at each attempt).
        this.prevLavaPriority = this.owner.getPathPriority(net.minecraft.pathfinding.PathNodeType.LAVA);
        this.owner.setPathPriority(net.minecraft.pathfinding.PathNodeType.LAVA, 0.0F);
        PathNavigate nav = this.owner.getNavigator();
        Path path = validPath(choosePath());
        if (path != null) {
            nav.setPath(path, this.movementSpeed); // :72
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] outoflava src=" + ETIMLivestockEvents.kind(this.owner)
                        + " start speed=" + this.movementSpeed
                        + " dist=" + String.format("%.2f", Math.sqrt(this.owner.getDistanceSq(
                                path.getFinalPathPoint().x + 0.5, path.getFinalPathPoint().y, path.getFinalPathPoint().z + 0.5)))
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
    }

    /** R196 EntityAIMovementTask :55-65 — the path-validity arm. */
    private Path validPath(Path path) {
        if (path == null || path.isFinished()) {
            return null;
        }
        PathPoint fp = path.getFinalPathPoint();
        double dx = this.owner.posX - fp.x;
        double dy = this.owner.posY - fp.y;
        double dz = this.owner.posZ - fp.z;
        return (dx * dx + dy * dy + dz * dz) < 1.0 ? null : path; // :60-62
    }

    /** R196 EntityAIGetOutOfLava :17-79 verbatim. */
    private Path choosePath() {
        int startX = MathHelper.floor(this.owner.posX);
        int startY = MathHelper.floor(this.owner.posY);
        int startZ = MathHelper.floor(this.owner.posZ);
        Path best = null;
        double bestDist = 0.0;
        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            int dx = this.owner.getRNG().nextInt(DOMAIN_SIZE) - MAX_PATH_LENGTH;
            int dy = this.owner.getRNG().nextInt(8) - 3; // RNG.int_7_minus_3 carrier
            int dz = this.owner.getRNG().nextInt(DOMAIN_SIZE) - MAX_PATH_LENGTH;
            int tx = startX + dx;
            int ty = startY + dy;
            int tz = startZ + dz;
            int i = 0;
            while (i < 8 && isAirOrPassable(tx, ty - 1, tz)) { ty--; i++; } // pull to ground
            i = 0;
            while (i < 8 && !isAirOrPassable(tx, ty, tz)) { ty++; i++; }   // un-stick
            if (isAirOrPassable(tx, ty, tz)
                    && !isAirOrPassable(tx, ty - 1, tz) // the solid-ground-below door :38
                    && !isOccupied(tx, ty, tz)) {
                double dist = dx * dx + dy * dy + dz * dz;
                if (best == null || dist < bestDist) {
                    Path path = this.owner.getNavigator().getPathToXYZ(tx, ty, tz); // :46
                    if (path != null) {
                        PathPoint fp = path.getFinalPathPoint();
                        if (!isAirOrPassable(fp.x, fp.y - 1, fp.z) // :49 — the final-point court
                                && !isOccupied(fp.x, fp.y, fp.z)) {
                            dx = fp.x - startX;
                            dy = fp.y - startY;
                            dz = fp.z - startZ;
                            dist = dx * dx + dy * dy + dz * dz; // final-point re-rank
                            if (best == null || dist < bestDist) {
                                bestDist = dist;
                                best = path;
                            }
                        }
                    }
                }
            }
        }
        // R196 :72-74 — the spawn-point fallback is C-grade parked (no
        // 1.12 carrier for the per-entity spawn fields; B-22 twin parked).
        return best;
    }

    /** R196 {@code World.isAirOrPassableBlock(x,y,z,false)} — the B-22 carrier. */
    private boolean isAirOrPassable(int x, int y, int z) {
        net.minecraft.block.state.IBlockState st = this.world.getBlockState(new BlockPos(x, y, z));
        net.minecraft.block.material.Material m = st.getMaterial();
        return m == net.minecraft.block.material.Material.AIR || m.isReplaceable();
    }

    /** R196 {@code World.occupiedByLivingEntity(x,y,z)} — the B-22 carrier. */
    private boolean isOccupied(int x, int y, int z) {
        AxisAlignedBB box = new AxisAlignedBB(x, y, z, x + 1.0, y + 1.0, z + 1.0);
        return !this.world.getEntitiesWithinAABB(EntityLivingBase.class, box).isEmpty();
    }

    @Override
    public boolean shouldContinueExecuting() { // R196 :80-82 — the plain base continuation
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        return !taskOwnerIsStuck() && !this.owner.getNavigator().noPath();
    }

    /** R196 EntityAIMovementTask :24-38. */
    private void checkOwnerHasMoved() {
        int x = MathHelper.floor(this.owner.posX);
        int z = MathHelper.floor(this.owner.posZ);
        if (x == this.lastX && z == this.lastZ) {
            this.notMovedCounter++;
        } else {
            this.lastX = x;
            this.lastZ = z;
            this.notMovedCounter = 0;
        }
    }

    private boolean taskOwnerIsStuck() { // :36-38
        return this.notMovedCounter > this.notMovedThreshold;
    }

    @Override
    public void updateTask() { // :76-79
        this.owner.getNavigator().setSpeed(this.movementSpeed);
        checkOwnerHasMoved();
    }

    @Override
    public void resetTask() { // R196 :26-28 = the EntityAIMovementTask :87-89 restore
        this.owner.getNavigator().clearPath();
        this.owner.setPathPriority(net.minecraft.pathfinding.PathNodeType.LAVA, this.prevLavaPriority);
    }
}
