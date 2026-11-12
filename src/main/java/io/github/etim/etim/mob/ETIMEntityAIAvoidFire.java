package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathNavigateGround;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * B-36 — the R196 {@code EntityAIAvoidFire} face
 * (mite-src/decompile/src/net/minecraft/EntityAIAvoidFire.java:1-105).
 * 1.12 has no comparable AI (the vanilla animal/snowman table
 * {@code rfg EntityAnimal :22-40} / {@code EntitySnowman :51-55} lacks any
 * fire-avoid entry) — the animal/snowman mobs stand inside fires and burn.
 *
 * <p>The R196 base class {@code EntityAIMovementTask :1-91} is inlined here
 * (the B-33 tree precedent). {@code swim_if_necessary} is <b>true</b> for
 * both seats (R196 {@code EntityAnimal :10} / {@code EntitySnowman :16}
 * pass {@code 1.0F, true}), so the base {@code :67-70} retry arm is LIVE:
 * 1.12 {@code PathNavigateGround} has no avoidsWater pair (rfg :317-342),
 * the carrier is {@code setCanSwim/getCanSwim} with the inverted polarity
 * ({@code canSwim = !avoidsWater}; the B-35 repairseek precedent).</p>
 *
 * <p>C-level notes (摸底 §3): ① the RNG tables map to {@code rand} (the
 * B-32/B-34 precedent); ② the {@code isHarmedByFire} gate is omitted —
 * both hosts are {@code true} by default and the false-overrides
 * (MagmaCube/FireElemental/EarthElemental) carry no AvoidFire seat; ③ the
 * 4-arg {@code getPathToXYZ(..., max_path_length=8)} maps to the 1.12
 * 3-arg (the followRange 35 cap); ④ {@code Block.fire.blockID} maps to
 * the exact {@code Blocks.FIRE} singleton; ⑤ the
 * {@code candidate_distance_sq} out-param is dropped (AvoidFire never
 * reads it).</p>
 *
 * <p>Judge lines (工装发明判行, mobDebugLog-gated): {@code [AILog] avoidfire
 * src=<animal|snowman> probe-in ...} (1/16) and {@code [AILog] avoidfire
 * src=... start fires=<n> bestSq=<d> speed=1.0 entity=...}.</p>
 *
 * <p>Family flag <b>livestockNeedsR196</b> (the fifteenth reuse).</p>
 */
public class ETIMEntityAIAvoidFire extends net.minecraft.entity.ai.EntityAIBase {

    private static final int MAX_PATH_LENGTH = 8; // R196 :4
    private static final int MAX_FIRES = 16; // R196 :5

    private final EntityLiving owner;
    private final World world;
    private final float movementSpeed;
    private final boolean swimIfNecessary;

    // R196 EntityAIMovementTask :9-13 — the base bookkeeping (inlined)
    private boolean normallyCanSwim; // R196 normally_avoids_water (inverted carrier, C-note)
    private int lastOwnerX;
    private int lastOwnerZ;
    private int notMovedCounter;
    private int notMovedThreshold;
    private int randomNumberIndex; // R196 :20 — the table-stream seed (C: no observable face)

    // R196 :6-10 — the fire candidate table
    private int numFires;
    private final int[] fireX = new int[MAX_FIRES];
    private final int[] fireY = new int[MAX_FIRES];
    private final int[] fireZ = new int[MAX_FIRES];

    private static int probeCounter = 0; // 工装: 1/16 probe row face

    public ETIMEntityAIAvoidFire(EntityLiving owner, float movementSpeed, boolean swimIfNecessary) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.swimIfNecessary = swimIfNecessary;
        this.randomNumberIndex = owner.getRNG().nextInt(); // R196 base :20
        this.setMutexBits(1); // R196 base :21
    }

    private static String src(EntityLiving owner) {
        return owner instanceof net.minecraft.entity.monster.EntitySnowman ? "snowman" : "animal";
    }

    @Override
    public boolean shouldExecute() {
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        if (!ETIMConfig.livestockNeedsR196) { // the family flag — the fifteenth reuse
            return false;
        }
        boolean burning = this.owner.isBurning(); // rfg Entity :2533
        if (ETIMConfig.mobDebugLog) { // the 1/16 probe row face
            int inv = ++probeCounter;
            if (inv % 16 == 0) {
                ETIM.LOGGER.info("[AILog] avoidfire src=" + src(this.owner)
                        + " probe-in inv=" + inv + " burning=" + burning
                        + " flag=" + ETIMConfig.livestockNeedsR196
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (this.owner.getRNG().nextInt(10) > 0) { // R196 :18 — the 1/10 gate
            return false;
        }
        // R196 :21-22 — isHarmedByFire omitted (C-note: both hosts are true)
        // R196 :23-26 — the fire block nearby gate (horizontal 8, vertical 2)
        return blockTypeIsNearTo(
                MathHelper.floor(this.owner.posX),
                MathHelper.floor(this.owner.posY),
                MathHelper.floor(this.owner.posZ),
                MAX_PATH_LENGTH, MAX_PATH_LENGTH / 4);
    }

    /** R196 World.blockTypeIsNearTo :465-537 verbatim (the early-return spiral; block face = exact FIRE). */
    private boolean blockTypeIsNearTo(int originX, int originY, int originZ, int horizontalRadius, int verticalRadius) {
        int x = originX;
        int y = originY;
        int z = originZ;
        int width = horizontalRadius * 2 + 1;
        int run = 1;
        int minY = originY - verticalRadius;
        int maxY = originY + verticalRadius;

        for (int cy = minY; cy <= maxY; cy++) {
            if (fireAt(x, cy, z)) {
                return true;
            }
        }

        while (run < width) {
            for (int i = 1; i <= run; i++) {
                x++;
                for (int cy = minY; cy <= maxY; cy++) {
                    if (fireAt(x, cy, z)) {
                        return true;
                    }
                }
            }
            for (int i = 1; i <= run; i++) {
                z++;
                for (int cy = minY; cy <= maxY; cy++) {
                    if (fireAt(x, cy, z)) {
                        return true;
                    }
                }
            }
            run++;
            for (int i = 1; i <= run; i++) {
                x--;
                for (int cy = minY; cy <= maxY; cy++) {
                    if (fireAt(x, cy, z)) {
                        return true;
                    }
                }
            }
            for (int i = 1; i <= run; i++) {
                z--;
                for (int cy = minY; cy <= maxY; cy++) {
                    if (fireAt(x, cy, z)) {
                        return true;
                    }
                }
            }
            run++;
        }

        for (int i = 1; i < run; i++) {
            x++;
            for (int cy = minY; cy <= maxY; cy++) {
                if (fireAt(x, cy, z)) {
                    return true;
                }
            }
        }
        return false;
    }

    /** R196 Block.fire.blockID equality → 1.12 exact Blocks.FIRE (C-note ④). */
    private boolean fireAt(int x, int y, int z) {
        IBlockState state = this.world.getBlockState(new BlockPos(x, y, z));
        return state.getBlock() == Blocks.FIRE;
    }

    /** R196 World.getDistanceSqFromDeltas :438-447 — the plain square-sum face. */
    private static double distanceSqFromDeltas(double dx, double dy, double dz) {
        return dx * dx + dy * dy + dz * dz;
    }

    /** R196 :30-41 — the min fire-distance² over the candidate table. */
    private double getDistanceSqToNearestFire(int x, int y, int z) {
        double nearest = Double.MAX_VALUE;
        for (int i = 0; i < this.numFires; i++) {
            double d = distanceSqFromDeltas(x - this.fireX[i], y - this.fireY[i], z - this.fireZ[i]);
            if (d < nearest) {
                nearest = d;
            }
        }
        return nearest;
    }

    /** R196 :44-104 verbatim (the spiral scan + the 16-attempt random retreat). */
    private Path getMovementPath() {
        int candidates = getNearestBlockCandidatesAt(
                this.owner.posX,
                this.owner.posY + this.owner.height * 0.75F, // R196 :49
                this.owner.posZ,
                MAX_PATH_LENGTH * 2, MAX_PATH_LENGTH / 2, MAX_FIRES, // :51-53 — horizontal 16, vertical 4, max 16
                this.fireX, this.fireY, this.fireZ);
        this.numFires = candidates;
        if (this.numFires == 0) { // R196 :60-62
            return null;
        }

        int x = MathHelper.floor(this.owner.posX);
        int y = MathHelper.floor(this.owner.posY);
        int z = MathHelper.floor(this.owner.posZ);
        double longestDistanceSqToNearestFire = this.getDistanceSqToNearestFire(x, y, z); // R196 :67
        Path selectedPath = null;

        for (int attempt = 0; attempt < 16; attempt++) { // R196 :70
            int dx = this.owner.getRNG().nextInt(17) - 8; // R196 :71 (C-note ①)
            int dy = this.owner.getRNG().nextInt(7) - 3; // R196 :72 (C-note ①)
            int dz = this.owner.getRNG().nextInt(17) - 8; // R196 :73 (C-note ①)
            int trialX = x + dx;
            int trialY = y + dy;
            int trialZ = z + dz;

            // R196 :78-80 — the down anchor (≤8 steps)
            for (int i = 0; i < 8 && isAirOrPassable(trialX, trialY - 1, trialZ); i++) {
                trialY--;
            }
            // R196 :82-84 — the up anchor (≤8 steps)
            for (int i = 0; i < 8 && !isAirOrPassable(trialX, trialY, trialZ); i++) {
                trialY++;
            }

            double distanceSqToNearestFire = this.getDistanceSqToNearestFire(trialX, trialY, trialZ); // R196 :86
            if (distanceSqToNearestFire > longestDistanceSqToNearestFire) { // R196 :87
                Path path = this.owner.getNavigator().getPathToXYZ(trialX, trialY, trialZ); // R196 :88 (C-note ③)
                if (path != null) { // R196 :89
                    PathPoint fp = path.getFinalPathPoint(); // 1.12: x/y/z public final (B-33 lesson)
                    trialX = fp.x; // R196 :91-93
                    trialY = fp.y;
                    trialZ = fp.z;
                    distanceSqToNearestFire = this.getDistanceSqToNearestFire(trialX, trialY, trialZ); // R196 :94
                    if (distanceSqToNearestFire > longestDistanceSqToNearestFire) { // R196 :95
                        longestDistanceSqToNearestFire = distanceSqToNearestFire;
                        selectedPath = path;
                    }
                }
            }
        }
        return selectedPath; // R196 :103
    }

    /** R196 World.getNearestBlockCandidates :844-968 verbatim (the spiral; distance_sq out-param dropped, C-note ⑤). */
    private int getNearestBlockCandidatesAt(
            double originX, double originY, double originZ,
            int horizontalRadius, int verticalRadius, int maxCandidates,
            int[] outX, int[] outY, int[] outZ) {
        int x = MathHelper.floor(originX);
        int y = MathHelper.floor(originY);
        int z = MathHelper.floor(originZ);
        originX -= 0.5; // R196 :860-862 — the rank offset
        originY -= 0.5;
        originZ -= 0.5;
        int width = horizontalRadius * 2 + 1;
        int run = 1;
        int minY = y - verticalRadius;
        int maxY = y + verticalRadius;
        int next = 0;

        for (int cy = minY; cy <= maxY; cy++) {
            if (fireAt(x, cy, z)) {
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
                    if (fireAt(x, cy, z)) {
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
                    if (fireAt(x, cy, z)) {
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
                    if (fireAt(x, cy, z)) {
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
                    if (fireAt(x, cy, z)) {
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

        for (int i = 1; i < run; i++) {
            x++;
            for (int cy = minY; cy <= maxY; cy++) {
                if (fireAt(x, cy, z)) {
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

    /** R196 World.isAirOrPassableBlock :5634-5652 — the y-bounds → TRUE quirk kept (the B-34 roam same shape). */
    private boolean isAirOrPassable(int x, int y, int z) {
        if (y < 0 || y > 255) {
            return true;
        }
        BlockPos pos = new BlockPos(x, y, z);
        if (!this.world.isBlockLoaded(pos)) {
            return false; // R196 !blockExists → false
        }
        IBlockState state = this.world.getBlockState(pos);
        Block block = state.getBlock();
        if (state.getMaterial() == net.minecraft.block.material.Material.AIR) { // R196 :5641-5642 id==0
            return true;
        }
        if (state.getMaterial().isLiquid()) { // R196 :5648 include_liquid=false
            return false;
        }
        return !block.isPassable(this.world, pos); // R196 :5648 !isSolid — the 1.12 passable carrier
    }

    /** R196 EntityAIMovementTask :47-73 — the base startExecuting with the LIVE canSwim retry arm. */
    @Override
    public void startExecuting() {
        this.lastOwnerX = MathHelper.floor(this.owner.posX); // :48
        this.lastOwnerZ = MathHelper.floor(this.owner.posZ); // :49
        this.notMovedCounter = 0; // :50
        this.notMovedThreshold = 30 + this.owner.getRNG().nextInt(20); // :51
        this.normallyCanSwim = this.owner.getNavigator() instanceof PathNavigateGround // :52 (inverted carrier)
                ? ((PathNavigateGround) this.owner.getNavigator()).getCanSwim()
                : false;
        Path path = this.getMovementPath(); // :53
        boolean pathIsValid = true;
        if (path != null && !path.isFinished()) { // :55
            PathPoint fp = path.getFinalPathPoint();
            double distanceFromFinalPoint = distanceSqFromDeltas( // :57-59
                    this.owner.posX - fp.x, this.owner.posY - fp.y, this.owner.posZ - fp.z);
            if (distanceFromFinalPoint < 1.0) { // :60
                pathIsValid = false;
            }
        } else {
            pathIsValid = false; // :64
        }
        if (!pathIsValid && !this.normallyCanSwim && this.swimIfNecessary // :67 (canSwim = !avoidsWater)
                && this.owner.getNavigator() instanceof PathNavigateGround) {
            ((PathNavigateGround) this.owner.getNavigator()).setCanSwim(true); // :68
            path = this.getMovementPath(); // :69
        }
        this.owner.getNavigator().setPath(path, this.movementSpeed); // :72 — unconditional (null clears)
        if (path != null && ETIMConfig.mobDebugLog) {
            int x = MathHelper.floor(this.owner.posX);
            int y = MathHelper.floor(this.owner.posY);
            int z = MathHelper.floor(this.owner.posZ);
            ETIM.LOGGER.info("[AILog] avoidfire src=" + src(this.owner)
                    + " start fires=" + this.numFires
                    + " bestSq=" + String.format("%.1f", this.getDistanceSqToNearestFire(x, y, z))
                    + " speed=" + this.movementSpeed
                    + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
    }

    /** R196 base :82-83 — the stuck arm is LIVE here (unlike the tree). */
    @Override
    public boolean shouldContinueExecuting() {
        return !taskOwnerIsStuck() && !this.owner.getNavigator().noPath();
    }

    /** R196 base :76-79. */
    @Override
    public void updateTask() {
        this.owner.getNavigator().setSpeed(this.movementSpeed);
        checkOwnerHasMoved();
    }

    /** R196 base :87-90 — clearPath + the canSwim restore. */
    @Override
    public void resetTask() {
        this.owner.getNavigator().clearPath();
        if (this.owner.getNavigator() instanceof PathNavigateGround) {
            ((PathNavigateGround) this.owner.getNavigator()).setCanSwim(this.normallyCanSwim);
        }
    }

    /** R196 base :24-34. */
    private void checkOwnerHasMoved() {
        int x = MathHelper.floor(this.owner.posX);
        int z = MathHelper.floor(this.owner.posZ);
        if (x == this.lastOwnerX && z == this.lastOwnerZ) {
            this.notMovedCounter++;
        } else {
            this.lastOwnerX = x;
            this.lastOwnerZ = z;
            this.notMovedCounter = 0;
        }
    }

    /** R196 base :36-38. */
    private boolean taskOwnerIsStuck() {
        return this.notMovedCounter > this.notMovedThreshold;
    }
}
