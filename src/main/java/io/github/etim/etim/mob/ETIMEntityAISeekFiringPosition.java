package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathNavigateGround;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

/**
 * B-37 — the R196 {@code EntityAISeekFiringPosition} face
 * (mite-src/decompile/src/net/minecraft/EntityAISeekFiringPosition.java:1-106).
 * 1.12 has no comparable AI: the vanilla skeleton combat table
 * {@code AbstractSkeleton.setCombatTask :223-248} adds only the bow-attack
 * task — skeletons never pre-position to an open sight line.
 *
 * <p>The R196 base class {@code EntityAIMovementTask :1-91} is inlined here
 * (the B-36 AvoidFire template). {@code swim_if_necessary} is <b>true</b>
 * (R196 {@code EntitySkeleton :257}), so the base retry arm is LIVE; the
 * canSwim polarity-flip carrier is the B-35/B-36 precedent.</p>
 *
 * <p>C-level notes (摸底 §3): ① the RNG tables map to {@code rand}; ② the
 * 4-arg {@code getPathToXYZ(..., max_path_length=16)} maps to the 1.12
 * 3-arg (the followRange 35 cap); ③ {@code canEntityBeSeenFrom} is
 * re-carved as {@code rayTraceBlocks(origin, center, false, false, true)
 * == null} + {@code AxisAlignedBB.getCenter()} (R196
 * {@code Entity :3065-3075}, the {@code for_vision(false_leaves)} face);
 * ④ the R196 player scan keeps <b>no</b> ghost filter (verbatim); ⑤ the
 * seat re-adds on every {@code setCombatTask} call (R196 {@code :257}
 * same semantics).</p>
 *
 * <p>Judge lines (工装发明判行, mobDebugLog-gated): {@code [AILog] firingpos
 * src=skeleton probe-in ...} (1/16) and {@code [AILog] firingpos
 * src=skeleton start players=<n> spot=(x,y,z) speed=1.0 entity=...}.</p>
 *
 * <p>Family flag <b>livestockNeedsR196</b> (the sixteenth reuse).</p>
 */
public class ETIMEntityAISeekFiringPosition extends net.minecraft.entity.ai.EntityAIBase {

    private static final int MAX_PATH_LENGTH = 16; // R196 :4
    private static final int MAX_PLAYERS = 16; // R196 :5
    private static final double SIGHT_RANGE_SQ = 900.0; // R196 :26/:66 — 30²
    private static final int ATTEMPTS_PER_PLAYER = 4; // R196 :48

    private final EntityLiving owner;
    private final World world;
    private final float movementSpeed;
    private final boolean swimIfNecessary;

    // R196 EntityAIMovementTask :9-13 — the base bookkeeping (inlined)
    private boolean normallyCanSwim;
    private int lastOwnerX;
    private int lastOwnerZ;
    private int notMovedCounter;
    private int notMovedThreshold;
    private int randomNumberIndex; // R196 base :20 — the table-stream seed (C: no observable face)

    // R196 :5-6 — the hidden-player candidate table
    private final EntityPlayer[] candidatePlayers = new EntityPlayer[MAX_PLAYERS];
    private int numCandidatePlayers;

    private static int probeCounter = 0; // 工装: 1/16 probe row face

    public ETIMEntityAISeekFiringPosition(EntityLiving owner, float movementSpeed, boolean swimIfNecessary) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.swimIfNecessary = swimIfNecessary;
        this.randomNumberIndex = owner.getRNG().nextInt(); // R196 base :20
        this.setMutexBits(1); // R196 base :21
    }

    /** R196 :3065-3075 — {@code canEntityBeSeenFrom} re-carved (C-note ③). */
    private static boolean canEntityBeSeenFrom(World world, double x, double y, double z, EntityPlayer target, boolean ignoreLeaves) {
        Vec3d origin = new Vec3d(x, y, z);
        Vec3d center = new Vec3d(
                (target.getEntityBoundingBox().minX + target.getEntityBoundingBox().maxX) * 0.5,
                (target.getEntityBoundingBox().minY + target.getEntityBoundingBox().maxY) * 0.5,
                (target.getEntityBoundingBox().minZ + target.getEntityBoundingBox().maxZ) * 0.5); // getCenter() absent in this RFG tree — inline midpoint (crash 2026-11-12 17:21)
        if (origin.squareDistanceTo(center) > SIGHT_RANGE_SQ) { // R196 :3072
            return false;
        }
        return world.rayTraceBlocks(origin, center, false, true, false) == null; // R196 :3074 for_vision — 5th arg false (the vanilla canEntityBeSeen face; true = MISS marker on clean rays = the r7-r10 zero-start bug)
    }

    /** R196 World.occupiedByLivingEntity :4517-4520 — the cell-living-entity probe. */
    private boolean occupiedByLivingEntity(int x, int y, int z) {
        return !this.world.getEntitiesWithinAABB(
                EntityLiving.class,
                new AxisAlignedBB(x, y, z, x + 1, y + 1, z + 1)).isEmpty();
    }

    /** R196 World.isAirOrPassableBlock :5634-5652 — the B-36 same shape (y-bounds → TRUE quirk kept). */
    private boolean isAirOrPassable(int x, int y, int z) {
        if (y < 0 || y > 255) {
            return true;
        }
        net.minecraft.util.math.BlockPos pos = new net.minecraft.util.math.BlockPos(x, y, z);
        if (!this.world.isBlockLoaded(pos)) {
            return false; // R196 !blockExists → false
        }
        net.minecraft.block.state.IBlockState state = this.world.getBlockState(pos);
        net.minecraft.block.Block block = state.getBlock();
        if (state.getMaterial() == net.minecraft.block.material.Material.AIR) {
            return true;
        }
        if (state.getMaterial().isLiquid()) {
            return false;
        }
        return block.isPassable(this.world, pos); // R196 :5648 not-solid → passable-true; the polarity was flipped until B-37 (self-masked in B-34/B-36 windows — see C-B37 register)
    }

    @Override
    public boolean shouldExecute() {
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        if (!ETIMConfig.livestockNeedsR196) { // the family flag — the sixteenth reuse
            return false;
        }
        if (ETIMConfig.mobDebugLog) { // the 1/16 probe row face
            int inv = ++probeCounter;
            if (inv % 16 == 0) {
                ETIM.LOGGER.info("[AILog] firingpos src=skeleton probe-in inv=" + inv
                        + " players=" + this.numCandidatePlayers
                        + " flag=" + ETIMConfig.livestockNeedsR196
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (this.owner.getAttackTarget() != null) { // R196 :14-16
            return false;
        }
        if (this.owner.getRNG().nextInt(16) != 0) { // R196 :18 — the 1/16 gate (chance_in_16, C-note ①)
            return false;
        }

        this.numCandidatePlayers = 0; // R196 :22
        for (int i = 0; i < this.world.playerEntities.size() && this.numCandidatePlayers < this.candidatePlayers.length; i++) {
            EntityPlayer player = (EntityPlayer) this.world.playerEntities.get(i);
            if (!(this.owner.getDistanceSq(player) > SIGHT_RANGE_SQ)) { // R196 :26 — distSq ≤ 900
                if (this.owner.getEntitySenses().canSee(player)) { // R196 :27 — any visible player = stand fast
                    return false;
                }
                this.candidatePlayers[this.numCandidatePlayers++] = player; // R196 :31 (no ghost filter, C-note ④)
            }
        }
        return this.numCandidatePlayers > 0; // R196 :35
    }

    /** R196 :39-82 verbatim — the per-player 4-attempt vantage hunt. */
    private Path getMovementPath() {
        int ownerX = MathHelper.floor(this.owner.posX); // :40
        int ownerY = MathHelper.floor(this.owner.posY); // :41
        int ownerZ = MathHelper.floor(this.owner.posZ); // :42
        int domainSize = this.MAX_PATH_LENGTH * 2 + 1; // :43 — 33

        for (int candidateIndex = 0; candidateIndex < this.numCandidatePlayers; candidateIndex++) { // :45
            EntityPlayer target = this.candidatePlayers[candidateIndex]; // :46

            for (int attempt = 0; attempt < ATTEMPTS_PER_PLAYER; attempt++) { // :48
                int dx = this.owner.getRNG().nextInt(domainSize) - MAX_PATH_LENGTH; // :49 (C-note ①)
                int dy = this.owner.getRNG().nextInt(7) - 3; // :50 (C-note ①)
                int dz = this.owner.getRNG().nextInt(domainSize) - MAX_PATH_LENGTH; // :51 (C-note ①)
                int trialX = ownerX + dx; // :52
                int trialY = ownerY + dy; // :53
                int trialZ = ownerZ + dz; // :54

                for (int i = 0; i < 8 && this.isAirOrPassable(trialX, trialY - 1, trialZ); i++) { // :56-58 — down anchor
                    trialY--;
                }
                for (int i = 0; i < 8 && !this.isAirOrPassable(trialX, trialY, trialZ); i++) { // :60-62 — up anchor
                    trialY++;
                }

                if (this.isAirOrPassable(trialX, trialY, trialZ) // :64
                        && !this.occupiedByLivingEntity(trialX, trialY, trialZ) // :65
                        && canEntityBeSeenFrom(this.world,
                                trialX + 0.5F, trialY + this.owner.getEyeHeight(), trialZ + 0.5F,
                                target, false)) { // :66
                    Path path = this.owner.getNavigator().getPathToXYZ(trialX, trialY, trialZ); // :67 (C-note ②)
                    if (path != null) { // :68
                        PathPoint finalPoint = path.getFinalPathPoint(); // :69 (1.12: x/y/z public final — the B-33 lesson)
                        if (canEntityBeSeenFrom(this.world,
                                finalPoint.x + 0.5F, finalPoint.y + this.owner.getEyeHeight(), finalPoint.z + 0.5F,
                                target, false) // :70-71
                                && !this.occupiedByLivingEntity(finalPoint.x, finalPoint.y, finalPoint.z)) { // :73
                            return path; // :74
                        }
                    }
                }
            }
        }
        return null; // :81
    }

    /** R196 EntityAIMovementTask :47-73 — the base startExecuting with the LIVE canSwim retry arm (B-36 template). */
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
            double distanceFromFinalPoint = this.owner.posX - fp.x;
            distanceFromFinalPoint = distanceFromFinalPoint * distanceFromFinalPoint
                    + (this.owner.posY - fp.y) * (this.owner.posY - fp.y)
                    + (this.owner.posZ - fp.z) * (this.owner.posZ - fp.z);
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
            PathPoint fp = path.getFinalPathPoint();
            ETIM.LOGGER.info("[AILog] firingpos src=skeleton"
                    + " start players=" + this.numCandidatePlayers
                    + " spot=(" + fp.x + "," + fp.y + "," + fp.z + ")"
                    + " speed=" + this.movementSpeed
                    + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
    }

    /** R196 :85-99 — the target gate + the 1/16 visibility rescan + the base stuck arm (LIVE, like AvoidFire). */
    @Override
    public boolean shouldContinueExecuting() {
        if (this.owner.getAttackTarget() != null) { // :86-88
            return false;
        }
        if (this.owner.getRNG().nextInt(16) == 0) { // :90 — the 1/16 rescan (C-note ①)
            for (int candidateIndex = 0; candidateIndex < this.numCandidatePlayers; candidateIndex++) { // :91
                if (this.owner.getEntitySenses().canSee(this.candidatePlayers[candidateIndex])) { // :92
                    return false;
                }
            }
        }
        return !taskOwnerIsStuck() && !this.owner.getNavigator().noPath(); // :98 — the base :82-83
    }

    /** R196 base :76-79. */
    @Override
    public void updateTask() {
        this.owner.getNavigator().setSpeed(this.movementSpeed);
        checkOwnerHasMoved();
    }

    /** R196 :102-105 — super reset (clearPath + canSwim restore) + the candidate-table clear. */
    @Override
    public void resetTask() {
        this.owner.getNavigator().clearPath();
        if (this.owner.getNavigator() instanceof PathNavigateGround) {
            ((PathNavigateGround) this.owner.getNavigator()).setCanSwim(this.normallyCanSwim);
        }
        this.numCandidatePlayers = 0; // :104
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
