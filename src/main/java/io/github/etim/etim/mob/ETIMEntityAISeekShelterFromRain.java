package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.weather.ETIMRain;
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
 * B-19 (C-16-5 residual rain consumers) — R196 {@code
 * EntityAISeekShelterFromRain} + its base {@code EntityAIMovementTask}
 * verbatim, seated per carrier by the mixins (the family flag is reused:
 * <b>livestockNeedsR196</b>, the B-18 villager-face precedent). R196
 * anchors:
 * <ul>
 *   <li>{@code shouldExecute :12-16} — the 1-in-16 scan roll
 *       ({@code RNG.chance_in_16}), then the livestock thirsty exclusion
 *       ({@code isThirsty()} = {@code water < 0.5F}, EntityLivestock
 *       :124-126; the capability carries only the four livestock, so a
 *       null state IS the non-Livestock branch), then the entity rain face
 *       {@code isInRain()} = {@code world.isInRain(x, footY+height, z)}
 *       (EntityLivingBase :2708).</li>
 *   <li>{@code getMovementPath :20-69} — 16 samples of
 *       {@code dx/dz ∈ [-16,16]} ({@code RNG.int_max % 33 - 16}) and
 *       {@code dy ∈ [-3,4]} ({@code RNG.int_7_minus_3 = (rand&7)-3}), a
 *       ≤8-step ground-snap pair, the candidate door
 *       {@code airOrPassable ∧ !isInRain(cell) ∧ !occupiedByLivingEntity},
 *       a {@code getPathToXYZ(trial, 16)} per candidate whose final point
 *       revalidates {@code !isInRain ∧ !occupied}, shortest wins.</li>
 *   <li>{@code EntityAIMovementTask :47-91} — the stuck counter
 *       (threshold 30+rand20), the swim_if_necessary retry (1.12 carrier =
 *       the {@code PathNavigateGround} canSwim flag, B-11 carrier note),
 *       {@code setPath(path, speed)}, {@code continueExecuting} =
 *       {@code !stuck ∧ !noPath} with the thirsty cut over it, and the
 *       restore-on-reset.</li>
 * </ul>
 * Judge row: {@code [AILog] shelterseek src=<kind> start …} — one per
 * executed path, {@code mobDebugLog} gated (the B-11 foodseek row family).
 */
public class ETIMEntityAISeekShelterFromRain extends net.minecraft.entity.ai.EntityAIBase {

    private static final int MAX_PATH_LENGTH = 16; // R196 :4
    private static final int DOMAIN_SIZE = MAX_PATH_LENGTH * 2 + 1; // :26
    private static final int ATTEMPTS = 16; // :28

    private final EntityLiving owner;
    private final World world;
    private final float movementSpeed;

    // R196 EntityAIMovementTask :9-12 — the "has not moved" machinery
    private int lastX;
    private int lastZ;
    private int notMovedCounter;
    private int notMovedThreshold;

    public ETIMEntityAISeekShelterFromRain(EntityLiving owner, float movementSpeed) {
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
        if (!ETIMConfig.livestockNeedsR196) { // D-1 — the family flag seat (B-18 precedent)
            return false;
        }
        ETIMLivestock.IState s0 = ETIMLivestock.get(this.owner);
        if (s0 != null && s0.getWater() < 0.5F) {
            return false; // R196 :15 — the livestock isThirsty() exclusion (EntityLivestock :124-126; null = non-Livestock pass-through)
        }
        return ETIMRain.isInRain(this.world, rainPos()); // EntityLivingBase :2708 entity-face
    }

    /** R196 EntityLivingBase.isInRain :2708 — the FOOT+HEIGHT rain cell. */
    private BlockPos rainPos() {
        return new BlockPos(
                MathHelper.floor(this.owner.posX),
                MathHelper.floor(this.owner.posY + this.owner.height),
                MathHelper.floor(this.owner.posZ));
    }

    @Override
    public void startExecuting() { // R196 :47-73 verbatim
        this.lastX = MathHelper.floor(this.owner.posX);
        this.lastZ = MathHelper.floor(this.owner.posZ);
        this.notMovedCounter = 0;
        this.notMovedThreshold = 30 + this.owner.getRNG().nextInt(20); // :51
        PathNavigate nav = this.owner.getNavigator();
        boolean canSwim = nav instanceof PathNavigateGround
                ? ((PathNavigateGround) nav).getCanSwim() : false;
        Path path = validPath(chooseShelterPath());
        if (path == null && !canSwim && nav instanceof PathNavigateGround) {
            ((PathNavigateGround) nav).setCanSwim(true); // :67-70 — the swim_if_necessary retry
            path = validPath(chooseShelterPath());
        }
        if (path != null) {
            nav.setPath(path, this.movementSpeed); // :72
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] shelterseek src=" + ETIMLivestockEvents.kind(this.owner)
                        + " start speed=" + this.movementSpeed
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
    }

    /** R196 EntityAIMovementTask :55-65 — the path-validity arm (B-11 same shape). */
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

    /** R196 EntityAISeekShelterFromRain :20-69 verbatim. */
    private Path chooseShelterPath() {
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
                    && !ETIMRain.isInRain(this.world, new BlockPos(tx, ty, tz))
                    && !isOccupied(tx, ty, tz)) {
                double dist = dx * dx + dy * dy + dz * dz; // :47-48 — the TRIAL deltas
                if (best == null || dist < bestDist) {
                    Path path = this.owner.getNavigator().getPathToXYZ(tx, ty, tz); // :49
                    if (path != null) {
                        PathPoint fp = path.getFinalPathPoint();
                        if (!ETIMRain.isInRain(this.world, new BlockPos(fp.x, fp.y, fp.z)) // :52
                                && !isOccupied(fp.x, fp.y, fp.z)) {
                            dx = fp.x - startX;
                            dy = fp.y - startY;
                            dz = fp.z - startZ;
                            dist = dx * dx + dy * dy + dz * dz; // :54-58 — re-ranked by the FINAL point
                            if (best == null || dist < bestDist) {
                                bestDist = dist;
                                best = path;
                            }
                        }
                    }
                }
            }
        }
        return best;
    }

    /** R196 {@code World.isAirOrPassableBlock(x,y,z,false)} carrier — air or
     *  a walk-through free body (tall grass, flowers, saplings…). */
    private boolean isAirOrPassable(int x, int y, int z) {
        net.minecraft.block.state.IBlockState st = this.world.getBlockState(new BlockPos(x, y, z));
        net.minecraft.block.material.Material m = st.getMaterial();
        return m == net.minecraft.block.material.Material.AIR || m.isReplaceable();
    }

    /** R196 {@code World.occupiedByLivingEntity(x,y,z)} — any living entity
     *  whose bounding box intersects the trial cell. */
    private boolean isOccupied(int x, int y, int z) {
        AxisAlignedBB box = new AxisAlignedBB(x, y, z, x + 1.0, y + 1.0, z + 1.0);
        return !this.world.getEntitiesWithinAABB(EntityLivingBase.class, box).isEmpty();
    }

    @Override
    public boolean shouldContinueExecuting() { // R196 :72-73 + EntityAIMovementTask :82-83
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s != null && s.getWater() < 0.5F) {
            return false; // R196 :73 — a thirsty mid-run cut (livestock only)
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
            // EntityAIMovementTask :89 restore — 1.12 carrier = the canSwim flag (B-11 same note)
            ((PathNavigateGround) this.owner.getNavigator()).setCanSwim(false);
        }
    }
}
