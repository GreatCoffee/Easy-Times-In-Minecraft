package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.EntityLiving;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathNavigate;
import net.minecraft.pathfinding.PathNavigateGround;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * B-23 — the shared base of the R196 needs-quest movement arms
 * {@code EntityAISeekFoodIfHungry} + {@code EntityAISeekWaterIfThirsty}
 * (both verbatim bodies live in R196's {@code EntityLivestock} need faces).
 * The base carries the movement-task machinery (R196
 * {@code EntityAIMovementTask :15-91}, the B-19/B-22 same shape) plus the
 * two R196 search primitives the arms share:
 * <ul>
 *   <li>{@code World.getNearestBlockCandidates :816-928} — the spiral
 *       whole-region scan: the center column first (the [minY..maxY] range),
 *       then four run-rings ({@code x++ ×run → z++ ×run → (run++) 后 x−− ×run
 *       → z−− ×run}), every cell scans its column hit-tests the need's block
 *       table and the first {@code max_candidates} hits fill the candidate
 *       arrays (early return on fill); the tail {@code x++ < run} closes the
 *       spiral. Candidates rank by
 *       {@code getDistanceSqFromDeltas(cell - (origin−0.5))}.</li>
 *   <li>{@code World.findEntityPathAwayFromXYZ :1318} (via
 *       {@code EntityLiving.findPathAwayFromXYZ :1318}) — the 16-attempt
 *       ESCAPE sampler: {@code dx/dz = int_max % (max_path_length*2+1) -
 *       max_path_length} ({@code ±max_path_length}), {@code dy =
 *       RNG.int_7_minus_3} (the {@code (rand&7)-3} shape, {@code −3..4}),
 *       the ≤8-step ground-snap pair, the trial gate
 *       {@code distSq(trial, xyz) ≥ min_distance² ∧ > furthest}, and a
 *       {@code getPathToXYZ(trial, max_path_length)} per alive trial whose
 *       final point re-ranks the same way — the FURTHEST wins.</li>
 * </ul>
 * Root scan: the arm filters R196's per-candidate validation as
 * {@code nav.getPathToXYZ(candidate, max_distance)} + the need's own
 * adjacency check on the FINAL point, first hit returns the path; when no
 * candidate pans out (or the scan is empty) the R196 fallback is the escape
 * sampler above with {@code min_distance 16, max_path_length 32}.
 *
 * <p>The hook set (each concrete arm names its own):
 * {@link #needLevel()} = the hunger/thirst meter read,
 * {@link #satedLevel()} = the {@code > 0.95F} continue cut,
 * {@link #needLow()}, {@link #needUrgent()}, {@link #needDesperate()} =
 * the 0.5/0.25/0.05 thresholds,
 * {@link #nearSelf()} = the 3×(height+1)×3 adjacency wedge,
 * {@link #near(int,int,int)} = the same scan at candidate coordinates,
 * {@link #targetBlockAt(World,int,int,int)} = the need's block table, and
 * {@link #edgeLabel()} = the two-shape wedge the arms differ in (food vs
 * water tail wording differs by one comparison in the R196 decompile; both
 * wedges no-op when the adjacency holds).</p>
 *
 * <p>Seats: the four livestock ctor {@code :19-20} — both arms addTask(2,
 * speed 1.0F); the food arm's {@code swim_if_necessary=true}, the water
 * arm's {@code =false} (R196 ctor args). Family flag = livestockNeedsR196
 * (the B-18 precedent); judge rows {@code [AILog] seekfood/seekwater start …}
 * ({@code mobDebugLog} gate).</p>
 */
public abstract class ETIMEntityAISeekNeedBase extends net.minecraft.entity.ai.EntityAIBase {

    private static final int ESCAPE_ATTEMPTS = 16; // R196 findEntityPathAwayFromXYZ :1318
    private static final int ESCAPE_MIN_DISTANCE = 16; // R196 getMovementPath fallback args
    private static final int ESCAPE_MAX_PATH = 32;

    protected final EntityLiving owner;
    protected final World world;
    protected final float movementSpeed;
    private final boolean swimIfNecessary;

    // R196 EntityAIMovementTask :9-12 machinery
    private int lastX;
    private int lastZ;
    private int notMovedCounter;
    private int notMovedThreshold;

    // B-19 r4 continuing probe pattern — one row per 16 invocations, never a judge row
    private static int probeCounter = 0;

    protected ETIMEntityAISeekNeedBase(EntityLiving owner, float movementSpeed, boolean swimIfNecessary) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.swimIfNecessary = swimIfNecessary;
        this.setMutexBits(1); // R196 :21
    }

    // -------------------------------------------------------- arm hooks

    /** the need meter (food/water 0..1) driving THIS arm. */
    protected abstract float needLevel();

    /** the satiation cut for continueExecuting (R196 {@code > 0.95F}). */
    protected abstract float satedLevel();

    /** R196 isHungry/isThirsty — the 0.5F face. */
    protected abstract boolean needLow();

    /** R196 isVeryHungry/isVeryThirsty — the 0.25F face. */
    protected abstract boolean needUrgent();

    /** R196 isDesperateForFood/isDesperateForWater — the 0.05F face. */
    protected abstract boolean needDesperate();

    /** R196 isNearFood()/isNearWaterSource() at the owner's own cell. */
    protected abstract boolean nearSelf();

    /** R196 isNearFood(x,y,z)/isNearWaterSource(x,y,z) at arbitrary coords. */
    protected abstract boolean near(int x, int y, int z);

    /** R196 getFoodBlockIDs/getWaterBlockIDs — the need's block predicate. */
    protected abstract boolean targetBlockAt(World w, int x, int y, int z);

    /** the face label inside the judge row ({@code seekfood}/{@code seekwater}). */
    protected abstract String edgeLabel();

    // -------------------------------------------------------- shouldExecute

    @Override
    public boolean shouldExecute() { // R196 EntityAISeekFoodIfHungry :11-17
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        if (!ETIMConfig.livestockNeedsR196) { // D-1 — the family flag seat
            return false;
        }
        if (ETIMConfig.mobDebugLog) {
            int idx = (probeCounter = probeCounter + 1) % 16;
            if (idx == 0) {
                ETIMLivestock.IState sp = ETIMLivestock.get(this.owner);
                ETIM.LOGGER.info("[AILog] " + edgeLabel() + " probe-in inv=" + probeCounter
                        + " need=" + String.format(java.util.Locale.ROOT, "%.4f", needLevel())
                        + " near=" + nearSelf()
                        + " flag=" + ETIMConfig.livestockNeedsR196
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (!needLow()) {
            return false; // R196 :12 — !isHungry / !isThirsty
        }
        if (nearSelf()) {
            return true; // R196 :14 — already adjacent
        }
        int scale = needDesperate() ? 10 : (needUrgent() ? 40 : 120);
        return this.owner.getRNG().nextInt(scale) <= 0; // R196 :15-16 — the desperate/very/idle roll
    }

    // -------------------------------------------------------- the search

    /**
     * R196 getMovementPath :21-63 — the candidate array walk + first-hit
     * return + the escape fallback.
     */
    private Path searchNeed() {
        boolean urgent = needUrgent();
        boolean desperate = needDesperate();
        int maxCandidates = desperate ? 24 : (urgent ? 16 : 8);
        int maxDistance = desperate ? 48 : (urgent ? 32 : 16);
        int[] candX = new int[maxCandidates];
        int[] candY = new int[maxCandidates];
        int[] candZ = new int[maxCandidates];
        int candidates = getNearestBlockCandidatesAt(
                this.owner.posX,
                this.owner.posY + this.owner.height * 0.75F, // R196 :36 — the chest-line origin
                this.owner.posZ,
                maxDistance,
                maxDistance / 8,
                maxCandidates,
                candX, candY, candZ);

        PathNavigate nav = this.owner.getNavigator();
        for (int i = 0; i < candidates; i++) {
            Path path = nav.getPathToXYZ(candX[i], candY[i], candZ[i]); // R196 :45-49 — the radius arg rides 1.12 follow-range
            if (path == null) {
                continue;
            }
            PathPoint fp = path.getFinalPathPoint();
            if (near(fp.x, fp.y, fp.z)) {
                return path; // R196 :50 — first hit wins (no shortest re-rank in this arm)
            }
        }
        return findPathAwayFromXYZ(
                MathHelper.floor(this.owner.posX),
                MathHelper.floor(this.owner.posY),
                MathHelper.floor(this.owner.posZ),
                ESCAPE_MIN_DISTANCE, ESCAPE_MAX_PATH, true); // R196 :57-63 — the escape fallback
    }

    /**
     * R196 {@code World.getNearestBlockCandidates :816-928} verbatim — the
     * origin floats sit 0.5 lower/higher for the distance rank; the center
     * column scans first; the four-run spiral follows; the cap fills early.
     */
    private int getNearestBlockCandidatesAt(
            double originX, double originY, double originZ,
            int horizontalRadius, int verticalRadius, int maxCandidates,
            int[] outX, int[] outY, int[] outZ) {
        int x = MathHelper.floor(originX);
        int y = MathHelper.floor(originY);
        int z = MathHelper.floor(originZ);
        originX -= 0.5; // R196 :826-828 — the rank offset
        originY -= 0.5;
        originZ -= 0.5;
        int width = horizontalRadius * 2 + 1;
        int run = 1;
        int minY = y - verticalRadius;
        int maxY = y + verticalRadius;
        int next = 0;

        // the center column first
        for (int cy = minY; cy <= maxY; cy++) {
            if (targetBlockAt(this.world, x, cy, z)) {
                outX[next] = x;
                outY[next] = cy;
                outZ[next] = z;
                if (++next == maxCandidates) {
                    return maxCandidates;
                }
            }
        }

        while (run < width) {
            for (int i = 1; i <= run; i++) {
                x++;
                for (int cy = minY; cy <= maxY; cy++) {
                    if (targetBlockAt(this.world, x, cy, z)) {
                        outX[next] = x;
                        outY[next] = cy;
                        outZ[next] = z;
                        if (++next == maxCandidates) {
                            return maxCandidates;
                        }
                    }
                }
            }
            for (int i = 1; i <= run; i++) {
                z++;
                for (int cy = minY; cy <= maxY; cy++) {
                    if (targetBlockAt(this.world, x, cy, z)) {
                        outX[next] = x;
                        outY[next] = cy;
                        outZ[next] = z;
                        if (++next == maxCandidates) {
                            return maxCandidates;
                        }
                    }
                }
            }
            run++;
            for (int i = 1; i <= run; i++) {
                x--;
                for (int cy = minY; cy <= maxY; cy++) {
                    if (targetBlockAt(this.world, x, cy, z)) {
                        outX[next] = x;
                        outY[next] = cy;
                        outZ[next] = z;
                        if (++next == maxCandidates) {
                            return maxCandidates;
                        }
                    }
                }
            }
            for (int i = 1; i <= run; i++) {
                z--;
                for (int cy = minY; cy <= maxY; cy++) {
                    if (targetBlockAt(this.world, x, cy, z)) {
                        outX[next] = x;
                        outY[next] = cy;
                        outZ[next] = z;
                        if (++next == maxCandidates) {
                            return maxCandidates;
                        }
                    }
                }
            }
            run++;
        }

        // R196 :921-941 — the tail drift closes the spiral
        for (int i = 1; i < run; i++) {
            x++;
            for (int cy = minY; cy <= maxY; cy++) {
                if (targetBlockAt(this.world, x, cy, z)) {
                    outX[next] = x;
                    outY[next] = cy;
                    outZ[next] = z;
                    if (++next == maxCandidates) {
                        return maxCandidates;
                    }
                }
            }
        }
        return next;
    }

    /**
     * R196 {@code World.findEntityPathAwayFromXYZ :1318} verbatim (via
     * {@code EntityLiving.findPathAwayFromXYZ :1318}) — the desperate-arm
     * escape sampler.
     */
    private Path findPathAwayFromXYZ(int fromX, int fromY, int fromZ, int minDistance, int maxPathLength, boolean useNavigator) {
        int vx = MathHelper.floor(this.owner.posX);
        int vy = MathHelper.floor(this.owner.posY);
        int vz = MathHelper.floor(this.owner.posZ);
        int minDistanceSq = minDistance * minDistance;
        double furthestSq = (vx - fromX) * (vx - fromX) + (vy - fromY) * (vy - fromY) + (vz - fromZ) * (vz - fromZ);
        Path selected = null;

        for (int attempt = 0; attempt < ESCAPE_ATTEMPTS; attempt++) {
            int dx = this.owner.getRNG().nextInt(maxPathLength * 2 + 1) - maxPathLength;
            int dy = this.owner.getRNG().nextInt(8) - 3; // RNG.int_7_minus_3 carrier
            int dz = this.owner.getRNG().nextInt(maxPathLength * 2 + 1) - maxPathLength;
            int trialX = vx + dx;
            int trialY = vy + dy;
            int trialZ = vz + dz;

            int i = 0;
            while (i < 8 && isAirOrPassable(trialX, trialY - 1, trialZ)) { trialY--; i++; }
            i = 0;
            while (i < 8 && !isAirOrPassable(trialX, trialY, trialZ)) { trialY++; i++; }

            double distanceSq = (trialX - fromX) * (trialX - fromX) + (trialY - fromY) * (trialY - fromY)
                    + (trialZ - fromZ) * (trialZ - fromZ);
            if (distanceSq >= minDistanceSq && distanceSq > furthestSq) {
                Path path = useNavigator
                        ? this.owner.getNavigator().getPathToXYZ(trialX, trialY, trialZ)
                        : null; // R196 :1349 else-branch — the non-living nav path never applies here
                if (path != null) {
                    PathPoint fp = path.getFinalPathPoint();
                    distanceSq = (fp.x - fromX) * (fp.x - fromX) + (fp.y - fromY) * (fp.y - fromY)
                            + (fp.z - fromZ) * (fp.z - fromZ);
                    if (distanceSq >= minDistanceSq && distanceSq > furthestSq) {
                        furthestSq = distanceSq;
                        selected = path;
                    }
                }
            }
        }
        return selected;
    }

    /** R196 {@code World.isAirOrPassableBlock(x,y,z,false)} — B-22 carrier note. */
    private boolean isAirOrPassable(int x, int y, int z) {
        net.minecraft.block.state.IBlockState st = this.world.getBlockState(new BlockPos(x, y, z));
        net.minecraft.block.material.Material m = st.getMaterial();
        return m == net.minecraft.block.material.Material.AIR || m.isReplaceable();
    }

    // -------------------------------------------------------- the motion task

    @Override
    public void startExecuting() { // R196 EntityAIMovementTask :47-73
        this.lastX = MathHelper.floor(this.owner.posX);
        this.lastZ = MathHelper.floor(this.owner.posZ);
        this.notMovedCounter = 0;
        this.notMovedThreshold = 30 + this.owner.getRNG().nextInt(20); // :51
        PathNavigate nav = this.owner.getNavigator();
        boolean canSwim = nav instanceof PathNavigateGround
                ? ((PathNavigateGround) nav).getCanSwim() : false;
        Path path = validPath(searchNeed());
        if (path == null && !canSwim && this.swimIfNecessary && nav instanceof PathNavigateGround) {
            ((PathNavigateGround) nav).setCanSwim(true); // :67-70 — the swim_if_necessary retry
            path = validPath(searchNeed());
        }
        if (path != null) {
            nav.setPath(path, this.movementSpeed); // :72
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] " + edgeLabel() + " start speed=" + this.movementSpeed
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
        return (dx * dx + dy * dy + dz * dz) < 1.0 ? null : path;
    }

    @Override
    public boolean shouldContinueExecuting() { // R196 food :72-80 / water :81-89
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        if (satedLevel() > 0.95F) {
            return false; // R196 — the sated cut
        }
        if (nearSelf()) {
            this.resetTask();
            return true; // R196 — the adjacency wedge: hold still, let the wellness tick feed
        }
        return !this.owner.getNavigator().noPath(); // the base !stuck ∧ !noPath face
    }

    @Override
    public void updateTask() { // :76-79
        this.owner.getNavigator().setSpeed(this.movementSpeed);
        checkOwnerHasMoved();
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

    private boolean taskOwnerIsStuck() {
        return this.notMovedCounter > this.notMovedThreshold;
    }

    @Override
    public void resetTask() { // :87-89
        this.owner.getNavigator().clearPath();
        if (this.owner.getNavigator() instanceof PathNavigateGround) {
            ((PathNavigateGround) this.owner.getNavigator()).setCanSwim(false);
        }
    }
}
