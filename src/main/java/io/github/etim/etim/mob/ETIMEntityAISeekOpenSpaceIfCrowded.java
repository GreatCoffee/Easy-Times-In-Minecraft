package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
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
 * B-26 — R196 {@code EntityAISeekOpenSpaceIfCrowded} verbatim, seated on the
 * four livestock by the {@code MixinEntityAnimal} ctor TAIL
 * {@code addTask(3, …, 1.0F)} (R196 {@code EntityLivestock} ctor :21; no
 * horse/villager seat — the family-exclusive face line). Flag seat =
 * <b>livestockNeedsR196</b> (the B-18 family-flag chain). R196 anchors:
 * <ul>
 *   <li>{@code shouldExecute :15-21} — {@code freedom > 0.5 → false};
 *       otherwise {@code !isCrowded() ? true : roll(freedom < 0.25 ? 10 :
 *       40)} — the INVERTED style: the task EXECUTES whenever the mob is
 *       calm-ish (freedom ≤ 0.5), but only {@code startExecuting :83-88}
 *       navigates, and only while the crowd rule holds.</li>
 *   <li>{@code getShortestPathToFreedom :24-81} — attempts 4 (16 when
 *       freedom &lt; 0.25); even attempts sample {@code dx/dz ∈ [-8,7]}
 *       ({@code RNG.int_17_minus_8}, carrier {@code nextInt(17)-8}), odd
 *       attempts {@code [-16,16]} ({@code int_33_minus_16}); both
 *       {@code dy ∈ [-3,4]} ({@code int_7_minus_3}); the two ≤8 ground legs
 *       (pull down while the cell below is air/tall-grass, push up out of
 *       solid stone/dirt/grass); the candidate door = the ground below is
 *       NOT water AND the CELL is not crowded; up to {@code max_num_paths}
 *       (1, very-crowded 2) accepted paths, SHORTEST by
 *       {@code getCurrentPathLength} wins; the break faces AFTER the store
 *       (R196 :29 {@code if (++num_paths_found > max_num_paths) break;}).</li>
 *   <li>{@code isCrowded(x,y,z) :206-212} (the cell overload) = {@code
 *       !world.isOutdoors(x,y,z) ∨ AABB(x−2,y−0.5,z−2 → x+2,y+0.5,z+2)
 *       living count > 2}; the cell rain face carriers through the B-19
 *       {@code canSeeSky(cell.up())} sky-line proxy (C-note 2) — the
 *       wellness rail's entity-face {@code isCrowded(e)} stays on the
 *       settled B-10 value face (the events one, verbatim).</li>
 *   <li>{@code continueExecuting :76-82} — {@code freedom > 0.95 → false};
 *       {@code !isCrowded() → resetTask() + true}; else {@code !noPath()}.</li>
 *   <li>NO {@code updateTask} override — the R196 base has none (the speed
 *       is not re-pinned this arm — unlike the move-task base).</li>
 * </ul>
 * Judge row: {@code [AILog] seekopen src=<kind> start paths=… entity=…} —
 * one per executed path, {@code mobDebugLog} gated (the B-19 seek-row
 * family). Probe: one row per 16 invocations (a diagnostic, never a
 * judge row — the B-19 r4 pattern).
 */
public class ETIMEntityAISeekOpenSpaceIfCrowded extends net.minecraft.entity.ai.EntityAIBase {

    private final EntityLiving owner;
    private final World world;
    private final float movementSpeed;

    private int probeCounter = 0; // per-instance (the B-24 r2 static-shared lesson)

    public ETIMEntityAISeekOpenSpaceIfCrowded(EntityLiving owner, float movementSpeed) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.setMutexBits(3); // R196 :13 — the ONLY mutex-3 seat of the family
    }

    private ETIMLivestock.IState state() {
        return ETIMLivestock.get(this.owner);
    }

    @Override
    public boolean shouldExecute() {
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        if (!ETIMConfig.livestockNeedsR196) {
            return false; // D-1 — the family flag seat (B-18 precedent)
        }
        if (ETIMConfig.mobDebugLog) {
            int idx = (this.probeCounter = this.probeCounter + 1) % 16;
            if (idx == 0) {
                ETIMLivestock.IState s = state();
                ETIM.LOGGER.info("[AILog] seekopen src=" + ETIMLivestockEvents.kind(this.owner)
                        + " probe-in inv=" + this.probeCounter
                        + " freedom=" + (s == null ? "null" : s.getFreedom())
                        + " crowded=" + isCrowdedEntity()
                        + " flag=" + ETIMConfig.livestockNeedsR196
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        ETIMLivestock.IState s = state();
        if (s == null) {
            return false; // the R196 livestock family is the four; capability carries only them
        }
        if (s.getFreedom() > 0.5F) {
            return false; // R196 :16
        }
        return !isCrowdedEntity() ? true
                : this.owner.getRNG().nextInt(s.getFreedom() < 0.25F ? 10 : 40) == 0; // R196 :17-20
    }

    @Override
    public void startExecuting() { // R196 :83-88
        if (isCrowdedEntity()) {
            Path path = getShortestPathToFreedom();
            if (path != null) {
                this.owner.getNavigator().setPath(path, this.movementSpeed);
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[AILog] seekopen src=" + ETIMLivestockEvents.kind(this.owner)
                            + " start paths=" + path.getCurrentPathLength()
                            + " dist=" + String.format("%.2f", pathLengthDist(path))
                            + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
                }
            }
        }
    }

    @Override
    public boolean shouldContinueExecuting() { // R196 :76-82
        ETIMLivestock.IState s = state();
        if (s == null) {
            return false;
        }
        if (s.getFreedom() > 0.95F) {
            return false;
        }
        if (!isCrowdedEntity()) {
            this.resetTask();
            return true;
        }
        return !this.owner.getNavigator().noPath();
    }

    @Override
    public void resetTask() { // R196 :91-94
        this.owner.getNavigator().clearPath();
    }

    /** the entity-face crowd rule — the settled B-10 events face, verbatim. */
    private boolean isCrowdedEntity() {
        if (!this.world.canSeeSky(this.owner.getPosition())) {
            return true;
        }
        AxisAlignedBB box = this.owner.getEntityBoundingBox().grow(2.0, 0.5, 2.0);
        return this.world.getEntitiesWithinAABB(EntityLiving.class, box).size() > 2;
    }

    /** the cell-face crowd rule — R196 :206-212 with the B-19 sky proxy. */
    private boolean isCrowdedCell(int x, int y, int z) {
        if (!this.world.canSeeSky(new BlockPos(x, y + 1, z))) {
            return true;
        }
        AxisAlignedBB box = new AxisAlignedBB(x - 2, y - 0.5, z - 2, x + 2, y + 0.5, z + 2);
        return this.world.getEntitiesWithinAABB(EntityLiving.class, box).size() > 2;
    }

    /** R196 :24-81 verbatim — attempts 4 (very 16), max paths 1 (very 2). */
    private Path getShortestPathToFreedom() {
        ETIMLivestock.IState s = state();
        boolean veryCrowded = s != null && s.getFreedom() < 0.25F;
        int entityX = MathHelper.floor(this.owner.posX);
        int entityY = MathHelper.floor(this.owner.posY);
        int entityZ = MathHelper.floor(this.owner.posZ);
        Path shortestPath = null;
        int shortestPathLength = -1;
        int numPathsFound = 0;
        int maxNumPaths = veryCrowded ? 2 : 1;
        int attempts = veryCrowded ? 16 : 4;

        PathNavigate nav = this.owner.getNavigator();
        for (int attempt = 0; attempt < attempts; attempt++) {
            int dx;
            int dy;
            int dz;
            if (attempt % 2 == 0) {
                dx = this.owner.getRNG().nextInt(17) - 8;   // RNG.int_17_minus_8 carrier
                dy = this.owner.getRNG().nextInt(8) - 3;    // int_7_minus_3
                dz = this.owner.getRNG().nextInt(17) - 8;
            } else {
                dx = this.owner.getRNG().nextInt(33) - 16;  // RNG.int_33_minus_16 carrier
                dy = this.owner.getRNG().nextInt(8) - 3;
                dz = this.owner.getRNG().nextInt(33) - 16;
            }

            int x = entityX + dx;
            int y = entityY + dy;
            int z = entityZ + dz;

            // R196 :40-47 — pull down while the cell below is air or tall grass
            for (int i = 0; i < 8; i++) {
                Block below = this.world.getBlockState(new BlockPos(x, y - 1, z)).getBlock();
                if (below != net.minecraft.init.Blocks.AIR && below != net.minecraft.init.Blocks.TALLGRASS) {
                    break;
                }
                y--;
            }
            // R196 :49-56 — push up out of solid ground (stone/dirt/grass)
            for (int i = 0; i < 8; i++) {
                Block here = this.world.getBlockState(new BlockPos(x, y, z)).getBlock();
                if (here != net.minecraft.init.Blocks.STONE && here != net.minecraft.init.Blocks.DIRT
                        && here != net.minecraft.init.Blocks.GRASS) {
                    break;
                }
                y++;
            }

            // R196 :58-59 — the ground must not be water + the cell must be open
            BlockPos belowPos = new BlockPos(x, y - 1, z);
            Block belowBlock = this.world.getBlockState(belowPos).getBlock();
            boolean groundWatered = belowBlock == net.minecraft.init.Blocks.WATER
                    || belowBlock == net.minecraft.init.Blocks.FLOWING_WATER;
            if (!groundWatered && !isCrowdedCell(x, y, z)) {
                Path path = nav.getPathToXYZ(x, y, z);
                if (path != null) {
                    PathPoint fp = path.getFinalPathPoint();
                    if (!isCrowdedCell(fp.x, fp.y, fp.z)) {
                        int pathLength = path.getCurrentPathLength();
                        if (shortestPath == null || pathLength < shortestPathLength) {
                            shortestPath = path;
                            shortestPathLength = pathLength;
                            if (++numPathsFound > maxNumPaths) {
                                break;
                            }
                        }
                    }
                }
            }
        }
        return shortestPath;
    }

    private double pathLengthDist(Path path) {
        PathPoint sp = path.getPathPointFromIndex(0);
        PathPoint fp = path.getFinalPathPoint();
        if (sp == null || fp == null) {
            return 0.0;
        }
        double dx = fp.x - sp.x;
        double dy = fp.y - sp.y;
        double dz = fp.z - sp.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
