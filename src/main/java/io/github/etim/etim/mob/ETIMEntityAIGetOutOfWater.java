package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathNavigate;
import net.minecraft.pathfinding.PathNavigateGround;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * B-22 — R196 {@code EntityAIGetOutOfWater} + {@code EntityAIMovementTask}
 * verbatim, the twin seat of B-19's shelter-from-rain AI: the R196 livestock
 * ctor seats BOTH at priority 4 ({@code :23-24} — shelter then
 * get-out-of-water), the horse ctor the same pair ({@code :65-66}). The
 * carriers extend the SAME two mixins (zero new registrations; the family
 * flag stays <b>livestockNeedsR196</b>, the B-18 precedent).
 * <ul>
 *   <li>{@code shouldExecute :11-21} gated: a player rider vetoes
 *       ({@code riddenByEntity instanceof EntityPlayer} — 1.12 carrier =
 *       a passenger of that type), the 1-in-16 scan roll
 *       ({@code RNG.chance_in_16}), the livestock thirsty exclusion
 *       ({@code isThirsty()} = water &lt; 0.5F; the capability carries only
 *       the four livestock — null IS the non-Livestock branch), then the
 *       water face {@code breathesAir() && !canBreatheUnderwater() ?
 *       isInWater() : false} (carrier: {@code isInWater()} and NOT a
 *       {@code EntityWaterMob} — the air-breather field pair has no 1.12
 *       API, C-note).</li>
 *   <li>{@code getMovementPath :24-77} — 16 samples of
 *       {@code dx/dz ∈ [-16,16]} and {@code dy ∈ [-3,4]}, the ≤8-step
 *       ground-snap pair, the candidate door
 *       {@code airOrPassable ∧ SOLID ground below (!airOrPassable(below,
 *       true) — the double-flag face; 1.12 carrier = not air, not
 *       replaceable, not liquid) ∧ !occupied}, a {@code getPathToXYZ}
 *       per candidate whose final point revalidates the solid-ground face
 *       and re-ranks by the FINAL deltas; the R196 spawn-point cover
 *       face {@code :72-74} (MITE-only spawn fields; 1.12 carrier = the
 *       home position when set, otherwise null — C-note).</li>
 *   <li>{@code EntityAIMovementTask :47-91} — the stuck counter
 *       (30+rand20), the swim_if_necessary {@code canSwim} retry, the
 *       thirsty cut over {@code continueExecuting} (:80-82 =
 *       {@code isThirsty() ? false : super}), the restore-on-reset.</li>
 * </ul>
 * Judge row: {@code [AILog] outofwater src=<kind> start …} — one per
 * executed path, {@code mobDebugLog} gated (the foodseek row family).
 */
public class ETIMEntityAIGetOutOfWater extends net.minecraft.entity.ai.EntityAIBase {

    private static final int MAX_PATH_LENGTH = 16; // R196 :4
    private static final int DOMAIN_SIZE = MAX_PATH_LENGTH * 2 + 1; // :30
    private static final int ATTEMPTS = 16; // :32

    private final EntityLiving owner;
    private final World world;
    private final float movementSpeed;

    // R196 EntityAIMovementTask :9-12 — the "has not moved" machinery
    private int lastX;
    private int lastZ;
    private int notMovedCounter;
    private int notMovedThreshold;

    public ETIMEntityAIGetOutOfWater(EntityLiving owner, float movementSpeed) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.setMutexBits(1); // R196 EntityAIMovementTask :21
    }

    // B-19 r4 probe pattern: the invocation counter — one row per 16
    // shouldExecute calls so the gate chain stays observable without
    // flooding the log (the probe row never counts as a judge row).
    private static int probeCounter = 0;

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
                ETIM.LOGGER.info("[AILog] outofwater src=" + ETIMLivestockEvents.kind(this.owner)
                        + " probe-in inv=" + probeCounter
                        + " inWater=" + this.owner.isInWater()
                        + " thirst=" + (sp == null ? "null" : sp.getWater())
                        + " ridden=" + this.owner.isBeingRidden()
                        + " flag=" + flagGate
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (!flagGate) {
            return false;
        }
        for (Entity passenger : this.owner.getPassengers()) {
            if (passenger instanceof net.minecraft.entity.player.EntityPlayer) {
                return false; // R196 :12 — ridden by a player
            }
        }
        if (this.owner.getRNG().nextInt(16) != 0) {
            return false; // R196 :14 — chance_in_16 scan roll
        }
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s != null && s.getWater() < 0.5F) {
            return false; // R196 :16 — a thirsty livestock ignores the water
        }
        if (this.owner instanceof net.minecraft.entity.passive.EntityWaterMob) {
            return false; // R196 :19 — canBreatheUnderwater branch (C-note carrier)
        }
        return this.owner.isInWater(); // R196 :19 — the air-breather in-water face
    }

    @Override
    public void startExecuting() { // R196 EntityAIMovementTask :47-73 verbatim
        this.lastX = MathHelper.floor(this.owner.posX);
        this.lastZ = MathHelper.floor(this.owner.posZ);
        this.notMovedCounter = 0;
        this.notMovedThreshold = 30 + this.owner.getRNG().nextInt(20); // :51
        PathNavigate nav = this.owner.getNavigator();
        boolean canSwim = nav instanceof PathNavigateGround
                ? ((PathNavigateGround) nav).getCanSwim() : false;
        Path path = validPath(chooseShorePath());
        if (path == null && !canSwim && nav instanceof PathNavigateGround) {
            ((PathNavigateGround) nav).setCanSwim(true); // :67-70 — the swim_if_necessary retry (ctor true)
            path = validPath(chooseShorePath());
        }
        if (path != null) {
            nav.setPath(path, this.movementSpeed); // :72
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] outofwater src=" + ETIMLivestockEvents.kind(this.owner)
                        + " start speed=" + this.movementSpeed
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
    }

    /** R196 EntityAIMovementTask :55-65 — the path-validity arm (B-19 same shape). */
    private Path validPath(Path path) {
        if (path == null || path.isFinished()) {
            return null;
        }
        PathPoint fp = path.getFinalPathPoint();
        double dx = this.owner.posX - fp.x;
        double dy = this.owner.posY - fp.y;
        double dz = this.owner.posZ - fp.z;
        return (dx * dx + dy * dy + dz * dz) < 1.0 ? null : path; // :60-62 — already there = invalid
    }

    /** R196 EntityAIGetOutOfWater :24-77 verbatim. */
    private Path chooseShorePath() {
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
            while (i < 8 && isAirOrPassable(tx, ty - 1, tz)) { ty--; i++; }
            i = 0;
            while (i < 8 && !isAirOrPassable(tx, ty, tz)) { ty++; i++; }
            if (isAirOrPassable(tx, ty, tz)
                    && isSolidGround(tx, ty - 1, tz) // :49 — !isAirOrPassable(below, true)
                    && !isOccupied(tx, ty, tz)) {
                double dist = dx * dx + dy * dy + dz * dz; // :51 — the TRIAL deltas
                if (best == null || dist < bestDist) {
                    Path path = this.owner.getNavigator().getPathToXYZ(tx, ty, tz); // :53
                    if (path != null) {
                        PathPoint fp = path.getFinalPathPoint();
                        if (isSolidGround(fp.x, fp.y - 1, fp.z) // :56 — the final-point revalidation
                                && !isOccupied(fp.x, fp.y, fp.z)) {
                            dx = fp.x - startX;
                            dy = fp.y - startY;
                            dz = fp.z - startZ;
                            dist = dx * dx + dy * dy + dz * dz; // :58-62 — re-ranked by the FINAL point
                            if (best == null || dist < bestDist) {
                                bestDist = dist;
                                best = path;
                            }
                        }
                    }
                }
            }
        }
        if (best == null) {
            best = spawnCoverPath(); // R196 :72-74 — the spawn-point cover face
        }
        return best;
    }

    /** R196 :72-74 carrier — the MITE spawn-point fields have no 1.12 API;
     *  the EntityCreature home face (when set) is the nearest-stop carrier. */
    private Path spawnCoverPath() {
        if (this.owner instanceof net.minecraft.entity.EntityCreature) {
            net.minecraft.entity.EntityCreature creature = (net.minecraft.entity.EntityCreature) this.owner;
            if (creature.hasHome()) {
                BlockPos home = creature.getHomePosition();
                return this.owner.getNavigator().getPathToXYZ(
                        home.getX() + 0.5D, home.getY() + 0.5D, home.getZ() + 0.5D);
            }
        }
        return null;
    }

    /** R196 {@code isAirOrPassableBlock(x,y,z,false)} — air or a
     *  walk-through free body (the B-19 shelter helper face). */
    private boolean isAirOrPassable(int x, int y, int z) {
        net.minecraft.block.state.IBlockState st = this.world.getBlockState(new BlockPos(x, y, z));
        net.minecraft.block.material.Material m = st.getMaterial();
        return m == net.minecraft.block.material.Material.AIR || m.isReplaceable();
    }

    /** R196 {@code !isAirOrPassableBlock(below, true)} — solid ground below:
     *  not air, not replaceable, NOT liquid (the double-flag face runs its
     *  liquid-exclusion arm here, the 1.12 double-flag has no API — C-note). */
    private boolean isSolidGround(int x, int y, int z) {
        net.minecraft.block.state.IBlockState st = this.world.getBlockState(new BlockPos(x, y, z));
        net.minecraft.block.material.Material m = st.getMaterial();
        return m != net.minecraft.block.material.Material.AIR
                && !m.isReplaceable()
                && !m.isLiquid();
    }

    /** R196 {@code occupiedByLivingEntity(x,y,z)} — any living entity
     *  inside the trial cell. */
    private boolean isOccupied(int x, int y, int z) {
        AxisAlignedBB box = new AxisAlignedBB(x, y, z, x + 1.0, y + 1.0, z + 1.0);
        return !this.world.getEntitiesWithinAABB(EntityLivingBase.class, box).isEmpty();
    }

    @Override
    public boolean shouldContinueExecuting() { // R196 :80-82 + base :82-83
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s != null && s.getWater() < 0.5F) {
            return false; // R196 :81 — a thirsty mid-run cut
        }
        return !taskOwnerIsStuck() && !this.owner.getNavigator().noPath();
    }

    /** R196 EntityAIMovementTask :24-38 — the per-tick moved check. */
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
    public void resetTask() { // :87-89
        this.owner.getNavigator().clearPath();
        if (this.owner.getNavigator() instanceof PathNavigateGround) {
            // EntityAIMovementTask :89 restore — 1.12 carrier = the canSwim flag
            ((PathNavigateGround) this.owner.getNavigator()).setCanSwim(false);
        }
    }
}
