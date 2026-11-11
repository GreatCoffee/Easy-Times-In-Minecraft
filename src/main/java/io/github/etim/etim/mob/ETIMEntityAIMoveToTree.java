package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.BlockLog;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * B-33 — R196 {@code EntityAIMoveToTree} + {@code EntityAIMovementTask}
 * verbatim: the burning zombie chases the tree a real player is perched in.
 * R196 seat = {@code EntityZombie.java:34} {@code addTask(3, new
 * EntityAIMoveToTree(this, 1.0F))} — the 1.12 zombie has no vanilla seat at
 * priority 3, so the booking rides the {@code MixinEntityZombie} stack
 * (五合一追加, B-31 family flag <b>livestockNeedsR196</b>).
 * <ul>
 *   <li>{@code shouldExecute :9-11} — the 1-in-40 roll ∧
 *       {@code isBurning()}.</li>
 *   <li>{@code getMovementPath :14-75} — R196
 *       {@code World.getNearestBlockCandidates :816-928} spiral scan
 *       (origin = {@code posY + height*0.75F}, horizontal 16, vertical 4,
 *       cap 8, block table = wood; the SeekNeedBase B-23 same shape,
 *       per-class inline here) then, per candidate in scan order, the
 *       player-in-tree filter {@code :47-58}: a real player (non-spectator
 *       — the isGhost carrier, C-note; the tournament check has no 1.12
 *       carrier and is omitted, C-note) alive, foot block Y in
 *       {@code (y+2, y+9)} and horizontal {@code dx²+dz² ≤ 32} at that
 *       tree; first qualifying candidate builds
 *       {@code getPathToXYZ(x,y,z)} and its final point must land within
 *       {@code < 2.0} of the tree — success arms
 *       {@code increased_chance_of_spreading_fire_countdown = 100}
 *       (R196 :65; consumer = the ETIMFireSpreadRules Entity hook).</li>
 *   <li>{@code EntityAIMovementTask :1-91} machinery — stuck counter
 *       (30+rand20), mutex 1, the path-validity arm
 *       {@code < 1.0} already-there cut; {@code swim_if_necessary=false}
 *       so the avoidsWater retry never fires; tree OVERRIDES the base
 *       continue/reset ({@code :78-80 continue = !noPath} only,
 *       {@code :83-85 reset = clearPath} only — no restore) and keeps the
 *       base updateTask ({@code :76-79 setSpeed + moved check}).</li>
 * </ul>
 * Judge rows: {@code [AILog] tree src=zombie probe-in inv=… burning=… flag=…}
 * (one per 16 invocations, never a judge row) and
 * {@code [AILog] tree src=zombie start target=(x,y,z) speed=1.0 countdown=100}
 * — one per executed path, {@code mobDebugLog} gated (the outofwater family
 * shape).
 */
public class ETIMEntityAIMoveToTree extends net.minecraft.entity.ai.EntityAIBase {

    private static final int MAX_DISTANCE = 16; // R196 :20
    private static final int MAX_CANDIDATES = 8; // :15

    private final EntityLiving owner;
    private final World world;
    private final float movementSpeed;

    // R196 EntityAIMovementTask :9-12 machinery (kept for the base
    // updateTask face; the tree continue does not read the stuck arm)
    private int lastX;
    private int lastZ;
    private int notMovedCounter;
    private int notMovedThreshold;

    // B-19 r4 continuing probe pattern — one row per 16 invocations
    private static int probeCounter = 0;

    public ETIMEntityAIMoveToTree(EntityLiving owner, float movementSpeed) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.setMutexBits(1); // R196 EntityAIMovementTask :21
    }

    @Override
    public boolean shouldExecute() { // R196 :9-11
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        boolean flagGate = ETIMConfig.livestockNeedsR196;
        if (ETIMConfig.mobDebugLog) {
            int idx = (probeCounter = probeCounter + 1) % 16;
            if (idx == 0) {
                ETIM.LOGGER.info("[AILog] tree src=zombie probe-in inv=" + probeCounter
                        + " burning=" + this.owner.isBurning()
                        + " flag=" + flagGate
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (!flagGate) {
            return false;
        }
        return this.owner.getRNG().nextInt(40) == 0 && this.owner.isBurning(); // :10
    }

    @Override
    public void startExecuting() { // R196 EntityAIMovementTask :47-73 verbatim
        this.lastX = MathHelper.floor(this.owner.posX);
        this.lastZ = MathHelper.floor(this.owner.posZ);
        this.notMovedCounter = 0;
        this.notMovedThreshold = 30 + this.owner.getRNG().nextInt(20); // :51
        // swim_if_necessary = false (R196 MoveToTree ctor :5) — the avoidsWater
        // retry arm :67-70 never fires; the avoidsWater save/restore bookkeeping
        // is dead state here and stays unported (C-note).
        Path path = this.getMovementPath();
        boolean pathIsValid = true;
        if (path != null && !path.isFinished()) {
            PathPoint fp = path.getFinalPathPoint();
            double dx = this.owner.posX - fp.x;
            double dy = this.owner.posY - fp.y;
            double dz = this.owner.posZ - fp.z;
            if (dx * dx + dy * dy + dz * dz < 1.0) { // :60
                pathIsValid = false;
            }
        } else {
            pathIsValid = false;
        }
        if (!pathIsValid) {
            path = null; // no swim retry for the tree face
        }
        this.owner.getNavigator().setPath(path, this.movementSpeed); // base :72 — unconditional (null path clears)
    }

    /** R196 MoveToTree :14-75 verbatim. */
    private Path getMovementPath() {
        int[] candidateX = new int[MAX_CANDIDATES];
        int[] candidateY = new int[MAX_CANDIDATES];
        int[] candidateZ = new int[MAX_CANDIDATES];
        int candidates = getNearestBlockCandidatesAt(
                this.owner.posX,
                this.owner.posY + this.owner.height * 0.75F, // :26
                this.owner.posZ,
                MAX_DISTANCE, MAX_DISTANCE / 4, MAX_CANDIDATES,
                candidateX, candidateY, candidateZ);
        if (candidates == 0) {
            return null;
        }
        for (int i = 0; i < candidates; i++) {
            int x = candidateX[i];
            int y = candidateY[i];
            int z = candidateZ[i];
            for (EntityPlayer player : this.world.playerEntities) {
                int footY = MathHelper.floor(player.posY + 1.0E-4); // R196 getFootBlockPosY ≡ 1.12 EntityLivingBase:2371-2373
                if (player.isSpectator() // isGhost carrier (C-note)
                        || !player.isEntityAlive() // :51-52 isDead/health faces
                        || footY <= y + 2
                        || footY >= y + 9) {
                    continue;
                }
                int dx = MathHelper.floor(player.posX) - x;
                int dz = MathHelper.floor(player.posZ) - z;
                if (dx * dx + dz * dz <= 32) { // :58
                    Path path = this.owner.getNavigator().getPathToXYZ(x, y, z); // :59-61
                    if (path != null) {
                        PathPoint fp = path.getFinalPathPoint();
                        double ddx = fp.x - x;
                        double ddy = fp.y - y;
                        double ddz = fp.z - z;
                        if (ddx * ddx + ddy * ddy + ddz * ddz < 2.0) { // :64
                            ETIMFireSpreadRules.setCountdown(this.owner, 100); // :65
                            if (ETIMConfig.mobDebugLog) {
                                ETIM.LOGGER.info("[AILog] tree src=zombie start target=(" + x + "," + y + "," + z + ")"
                                        + " speed=" + this.movementSpeed + " countdown=100"
                                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
                            }
                            return path;
                        }
                    }
                }
            }
        }
        return null;
    }

    /** R196 :78-80 — the tree continue: no stuck arm (base :82-83 overridden). */
    @Override
    public boolean shouldContinueExecuting() {
        return !this.owner.getNavigator().noPath();
    }

    /** R196 EntityAIMovementTask :76-79 — the base updateTask (not overridden). */
    @Override
    public void updateTask() {
        this.owner.getNavigator().setSpeed(this.movementSpeed);
        checkOwnerHasMoved();
    }

    /** R196 MoveToTree :83-85 — clearPath only; the base restore arm is overridden out. */
    @Override
    public void resetTask() {
        this.owner.getNavigator().clearPath();
    }

    /** R196 EntityAIMovementTask :24-34. */
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

    /**
     * R196 {@code World.getNearestBlockCandidates :816-928} verbatim — the
     * spiral scan (the SeekNeedBase B-23 same shape); the block table here is
     * the wood face: R196 {@code Block.wood.blockID} → 1.12
     * {@code BlockLog} family (C-note — the MITE single-ID wood face).
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

        for (int cy = minY; cy <= maxY; cy++) {
            if (woodAt(x, cy, z)) {
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
                    if (woodAt(x, cy, z)) {
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
                    if (woodAt(x, cy, z)) {
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
                    if (woodAt(x, cy, z)) {
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
                    if (woodAt(x, cy, z)) {
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
                if (woodAt(x, cy, z)) {
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

    /** The wood block table (R196 block_ids = [Block.wood.blockID]). */
    private boolean woodAt(int x, int y, int z) {
        IBlockState st = this.world.getBlockState(new BlockPos(x, y, z));
        return st.getBlock() instanceof BlockLog;
    }
}
