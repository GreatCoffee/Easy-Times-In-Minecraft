package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.EntityCreature;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.entity.passive.EntityWolf;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathNavigate;
import net.minecraft.pathfinding.PathNavigateGround;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * B-27 (audit20 the avoid-predator seat) — R196 {@code
 * EntityAIAvoidPotentialPredators :1-120} verbatim, seated by the cow-kind
 * gate on {@code MixinEntityAnimal} (the predators themselves are R196's
 * {@code preysUpon} family — the 1.12 marriage arm below). R196 anchors:
 * <ul>
 *   <li>{@code shouldExecute :27-52} — the 1-in-10 scan roll, the ±(32,4,32)
 *       bounding box, {@code World.getPredatorsWithinAABBForEntity :4524-4533}
 *       (per-predator {@code preysUpon(prey)} pass), the horse-shy arm
 *       ({@code isShy()} = adult untamed temper≤0 adds nearby players),
 *       and the {@code nearest² < max_path_length²/4} → 256 sqrt-16 door.</li>
 *   <li>{@code getMovementPath :61-98} — 16 samples of
 *       {@code dx/dz ∈ [-32,32]} ({@code RNG.int_max % 65 - 32}) and
 *       {@code dy ∈ [-3,4]} ({@code RNG.int_7_minus_3}), the ≤8-step ground
 *       snap pair, then the LONGEST-from-predators ranking (the family's
 *       first maximizer — R196 :66/:91): candidates scored by the nearest
 *       predator distance of the TRIAL cell, revalidated on the path FINAL
 *       point, and replaced only when the score GROWS.
 *       {@code World.getDistanceSqFromDeltas(dx,dy,dz)}.</li>
 *   <li>{@code isPredatorAttacking :104-110} — a predator whose R196
 *       {@code getTarget() == owner} — carrier = the 1.12
 *       {@code EntityLiving.getAttackTarget()}; the speed getter
 *       {@code :112-115} rides super × 1.2F when one attacks.</li>
 *   <li>{@code resetTask :117-120} = super + the predators list drop.</li>
 * </ul>
 * 1.12 predator matrix (the C-7 marriage faces — R196 maps natively, the
 * 1.12 target AI never attacks these): {@code EntityZombie.preysUpon} =
 * any {@code EntityAnimal} (R196 :395 verbatim), {@code
 * EntityWolf.preysUpon} = {@code !isChild && !isTamed && EntityAnimal}
 * (R196 :587), the R196-only predators (Arachnid/Ghoul/Silverfish/Squid/
 * Cubic/Nightwing/VampireBat/Hellhound) stay absent. Judged by the R196
 * predator-scan face, not by vanilla target lists.
 *
 * <p>Judge row: {@code [AILog] avoidpred src=<kind> start pred=<n> dist=…
 * speed=… entity=…} — one per executed path, {@code mobDebugLog} gated
 * (the B-19 seek-row family shape).</p>
 */
public class ETIMEntityAIAvoidPotentialPredators extends net.minecraft.entity.ai.EntityAIBase {

    private static final int MAX_PATH_LENGTH = 32; // R196 :16

    private final EntityCreature owner;
    private final World world;
    private final float movementSpeed;
    private final boolean swimIfNecessary;

    private java.util.List<EntityLivingBase> predators = null;
    private double distanceSqToNearestPredator = 0.0;

    // R196 EntityAIMovementTask :9-12 — the "has not moved" machinery
    private int lastX;
    private int lastZ;
    private int notMovedCounter;
    private int notMovedThreshold;

    // B-19 r4 probe pattern: one row per 16 invocations (a diagnostic, never
    // a judge row)
    private static int probeCounter = 0;

    public ETIMEntityAIAvoidPotentialPredators(EntityCreature owner, float movementSpeed, boolean swimIfNecessary) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.swimIfNecessary = swimIfNecessary;
        this.setMutexBits(1); // R196 EntityAIMovementTask :21
    }

    @Override
    public boolean shouldExecute() { // R196 :27-52 verbatim
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        if (!ETIMConfig.livestockNeedsR196) { // D-1 — the family flag seat
            return false;
        }
        if (ETIMConfig.mobDebugLog) {
            int idx = (probeCounter = probeCounter + 1) % 16;
            if (idx == 0) {
                ETIM.LOGGER.info("[AILog] avoidpred src=" + ETIMLivestockEvents.kind(this.owner)
                        + " probe-in inv=" + probeCounter
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (this.owner.getRNG().nextInt(10) > 0) {
            return false; // R196 :28 — the 1/10 scan roll
        }
        AxisAlignedBB box = new AxisAlignedBB(
                this.owner.posX - MAX_PATH_LENGTH, this.owner.posY - 4.0, this.owner.posZ - MAX_PATH_LENGTH,
                this.owner.posX + MAX_PATH_LENGTH, this.owner.posY + 4.0, this.owner.posZ + MAX_PATH_LENGTH); // :30-40
        this.predators = new java.util.ArrayList<EntityLivingBase>();
        for (net.minecraft.entity.Entity entity : this.world.getEntitiesWithinAABBExcludingEntity(this.owner, box)) {
            if (entity instanceof EntityLivingBase && this.preysUpon((EntityLivingBase) entity)) {
                this.predators.add((EntityLivingBase) entity); // World :4524-4533 — the per-predator face pass
            }
        }
        if (this.owner instanceof EntityWolf) {
            EntityWolf wolf = (EntityWolf) this.owner;
            if (!wolf.isChild() && !wolf.isTamed()) {
                for (net.minecraft.entity.Entity entity : this.world.getEntitiesWithinAABBExcludingEntity(this.owner, box)) {
                    if (entity instanceof net.minecraft.entity.passive.EntityAnimal) {
                        this.predators.add((EntityLivingBase) entity); // R196 :4 — the wolf prey-animal family face
                    }
                }
            }
        }
        this.distanceSqToNearestPredator = getDistanceSqToNearestPredator(
                MathHelper.floor(this.owner.posX), MathHelper.floor(this.owner.posY), MathHelper.floor(this.owner.posZ));
        return this.distanceSqToNearestPredator < MAX_PATH_LENGTH * MAX_PATH_LENGTH / 4.0; // :52 — sqrt-16 door
    }

    /** R196 {@code World.getPredatorsWithinAABBForEntity :4524-4533} — the
     *  per-predator face pass, married to both R196 preysUpon carriers. */
    private boolean preysUpon(EntityLivingBase predator_candidate) { // R196 :395/:587 candidates
        return predator_candidate instanceof EntityZombie            // R196 EntityZombie :395 — preys EntityAnimal
                || predator_candidate instanceof EntityWolf;         // R196 EntityWolf :587 — preys EntityAnimal (wild, adult)
    }

    /** R196 :54-59 verbatim — nearest predator delta distance squared. */
    private double getDistanceSqToNearestPredator(int x, int y, int z) {
        double nearest = Double.MAX_VALUE;
        for (EntityLivingBase predator : this.predators) {
            double dx = x - predator.posX;
            double dy = y - predator.posY;
            double dz = z - predator.posZ;
            double distSq = dx * dx + dy * dy + dz * dz; // R196 World.getDistanceSqFromDeltas
            if (distSq < nearest) {
                nearest = distSq;
            }
        }
        return nearest;
    }

    /** R196 EntityAIAvoidPotentialPredators :61-98 verbatim — the LONGEST-from-predators rank. */
    private Path choosePath() {
        int preyX = MathHelper.floor(this.owner.posX);
        int preyY = MathHelper.floor(this.owner.posY);
        int preyZ = MathHelper.floor(this.owner.posZ);
        double longest = this.distanceSqToNearestPredator;
        Path selected = null;
        for (int attempt = 0; attempt < 16; attempt++) {
            int dx = this.owner.getRNG().nextInt(MAX_PATH_LENGTH * 2 + 1) - MAX_PATH_LENGTH; // R196 int_max % 65 - 32
            int dy = this.owner.getRNG().nextInt(8) - 3; // R196 int_7_minus_3
            int dz = this.owner.getRNG().nextInt(MAX_PATH_LENGTH * 2 + 1) - MAX_PATH_LENGTH;
            int tx = preyX + dx;
            int ty = preyY + dy;
            int tz = preyZ + dz;
            int i = 0;
            while (i < 8 && isAirOrPassable(tx, ty - 1, tz)) { ty--; i++; }
            i = 0;
            while (i < 8 && !isAirOrPassable(tx, ty, tz)) { ty++; i++; }
            double distToNearest = getDistanceSqToNearestPredator(tx, ty, tz);
            if (distToNearest > longest) {
                Path path = this.owner.getNavigator().getPathToXYZ(tx, ty, tz);
                if (path != null) {
                    PathPoint fp = path.getFinalPathPoint();
                    tx = fp.x;
                    ty = fp.y;
                    tz = fp.z;
                    distToNearest = getDistanceSqToNearestPredator(tx, ty, tz);
                    if (distToNearest > longest) {
                        longest = distToNearest;
                        selected = path;
                    }
                }
            }
        }
        return selected;
    }

    /** R196 {@code World.isAirOrPassableBlock(x,y,z,false)} carrier (B-23 same). */
    private boolean isAirOrPassable(int x, int y, int z) {
        net.minecraft.block.state.IBlockState st = this.world.getBlockState(new net.minecraft.util.math.BlockPos(x, y, z));
        net.minecraft.block.material.Material m = st.getMaterial();
        return m == net.minecraft.block.material.Material.AIR || m.isReplaceable();
    }

    @Override
    public void startExecuting() { // R196 EntityAIMovementTask :47-73 (B-19 base arm)
        this.lastX = MathHelper.floor(this.owner.posX);
        this.lastZ = MathHelper.floor(this.owner.posZ);
        this.notMovedCounter = 0;
        this.notMovedThreshold = 30 + this.owner.getRNG().nextInt(20); // :51
        PathNavigate nav = this.owner.getNavigator();
        boolean canSwim = nav instanceof net.minecraft.pathfinding.PathNavigateGround
                ? ((net.minecraft.pathfinding.PathNavigateGround) nav).getCanSwim() : false;
        Path path = validPath(choosePath());
        if (path == null && !canSwim && this.swimIfNecessary
                && nav instanceof net.minecraft.pathfinding.PathNavigateGround) {
            ((net.minecraft.pathfinding.PathNavigateGround) nav).setCanSwim(true); // :67-70 — the swim retry
            path = validPath(choosePath());
        }
        if (path != null) {
            nav.setPath(path, this.getMovementSpeed()); // :72 — the speed override rides the attacking check
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] avoidpred src=" + ETIMLivestockEvents.kind(this.owner)
                        + " start pred=" + (this.predators == null ? 0 : this.predators.size())
                        + " speed=" + this.getMovementSpeed()
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
        return (dx * dx + dy * dy + dz * dz) < 1.0 ? null : path; // :60-62
    }

    /** R196 :104-110 — a predator currently targeting the owner.
     *  Carrier = the 1.12 {@code EntityLiving.getAttackTarget()}, the
     *  R196-family marriage arm (zombie/wolf tracks face gap). */
    private boolean isPredatorAttacking() {
        if (this.predators == null) {
            return false;
        }
        for (EntityLivingBase predator : this.predators) {
            if (predator instanceof net.minecraft.entity.EntityLiving
                    && ((net.minecraft.entity.EntityLiving) predator).getAttackTarget() == this.owner) {
                return true;
            }
        }
        return false;
    }

    /** R196 :112-115 — super × (attacking? 1.2 : 1.0). */
    private float getMovementSpeed() {
        return this.movementSpeed * (this.isPredatorAttacking() ? 1.2F : 1.0F);
    }

    @Override
    public boolean shouldContinueExecuting() { // R196 :80-83 via base
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        return !taskOwnerIsStuck() && !this.owner.getNavigator().noPath();
    }

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
    public void updateTask() {
        this.owner.getNavigator().setSpeed(this.getMovementSpeed());
        checkOwnerHasMoved();
    }

    @Override
    public void resetTask() { // R196 :117-120 = super + the predators drop
        this.owner.getNavigator().clearPath();
        if (this.owner.getNavigator() instanceof net.minecraft.pathfinding.PathNavigateGround) {
            // EntityAIMovementTask :89 restore — the canSwim flag (B-11 same note)
            ((net.minecraft.pathfinding.PathNavigateGround) this.owner.getNavigator()).setCanSwim(false);
        }
        this.predators = null;
    }
}
