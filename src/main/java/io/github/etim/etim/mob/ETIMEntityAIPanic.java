package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.EntityCreature;
import net.minecraft.pathfinding.Path;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

/**
 * B-29 (R196 70 类 AI sweep § Payload) — R196 {@code
 * EntityAIFleeAttackerOrPanic} verbatim port. It is the FLEE shape (NOT
 * the B-19 shelterseek line): the escape face (R196
 * {@code getPathAwayFromAttacker :36-49}) CALLS the base
 * {@code findPathAwayFromXYZ(attacker floor, min_distance 16, max_path_length
 *   48, use_navigator true)} — the SAME escape sampler the B-23
 * {@code ETIMEntityAISeekNeedBase :305} ported verbatim from R196
 * {@code EntityLiving.findPathAwayFromXYZ :1318} — never the panic
 * face path shape. R196 anchors:
 *
 * <ul>
 *   <li>{@code ctor :9-13} (owner, speed, chance_of_panicking, swim) —
 *       the base (EntityAIMovementTask) super + the chance field.
 *   <li>{@code shouldExecute :24-28} — {@code is_done_panicking &&
 *       world.rand.nextInt(10000)==0} un-dones; considerFleeing() ride;
 *       flee OR isPanicking.
 *   <li>{@code isPanicking() :19-23} — burned/spooked face triggers
 *       startPanicking(); the countdown &gt; 0 gate.
 *   <li>{@code startPanicking() :15-17} — countdown = rand(100)+100.
 *   <li>{@code getRandomPath :29-33} — RandomPositionGenerator
 *       {@code findRandomTarget(owner, 5, 4)} → nav path face.
 *   <li>{@code getPathAwayFromAttacker :36-49} — the REVENGE face:
 *       owner.getRevengeTarget() != null → create via
 *       findPathAwayFromXYZ(floor coords, 16, 48, true) then
 *       {@code fleeing = true; onFleeing();} (the IState face).
 *   <li>{@code getMovementPath :52-62} — panic? random : flee-face ||
 *       roll &lt; chance → startPanicking + random.
 *   <li>{@code startExecuting :80-89} — !done && rand &lt; chance →
 *       startPanicking; !panicking → done = true; super.startExecuting()
 *       (the base's stuck/speed/setPath machinery verbatim).
 *   <li>{@code updateTask :92-99} — burning face; countdown -- == 0 →
 *       done; the (0→&gt;0 ∨ stuck ∨ noPath) face → super.startExecuting()
 *       (the share path face).
 *   <li>{@code continueExecuting :101-104} — considerStopFleeing();
 *       return flee ∨ panicking (NO !stuck ∧ !noPath — the R196
 *       :101-104 verbatim, DIFFERENT from the B-19's base-line shape).
 *   <li>{@code getMovementSpeed :106-109} — base + (panicking ? +0.2F : 0)
 *       — the family's speed override (B-27's ×1.2 face was the other).
 *   <li>{@code resetTask :111-114} — considerStopFleeing + super.
 * </ul>
 *
 * the flee/spook fields ride the ETIMLivestock capability (the B-7 family):
 * {@code considerFleeing()} = the revenge target &lt; 32F sets
 * {@code has_decided_to_flee}; {@code considerStopFleeing()} = null →
 * both false / revenge &gt; 40F → flee false (R196 EntityLivestock :353/:360).
 * {@code isSpooked()} = R196 {@code EntityLiving :1445}
 * {@code spooked_until > worldTime} — the IState {@code getSpookedUntil}
 * face (expiry = 0 reset; the R196 :283-297 livestock-spread arm is a
 * separate family face — parked, C-note 3).
 * {@code onFleeing()} = the R196 no-op ancestor face — the IState setter only.
 *
 * Seat table (the mixin side): the four-livestock SEAT (1.12 EntityAnimal
 * kind gate) plus the WOLF seat — all at priority 1:
 *   Cow  1.6F/0.5F (R196 :17) · Pig/Sheep 1.4F/0.5F (R196 :28/:43)
 *   Chicken 1.3F/0.75F (R196 :22) · Wolf 1.0F/0.0F (R196 :39, the
 *   chance-of-0 face = the wolf only flee-rides, the panic branch shut).
 *
 * The vanilla EntityAIPanic seat is REMOVED at the seat mixin TAIL
 * (the B-28 removeIf precedent) — the R196 face replaces the whole
 * vanilla panic shape (mutex 7 vs vanilla-1.5 double-clash fear).
 *
 * Judge row: {@code [AILog] panicflee src=… start speed=… panic=… entity=…}
 * — one per executed path, {@code mobDebugLog} gated (the B-19/B-23
 * seek-row family shape); the per-instance %16 probe diagnostic is NOT a
 * judge row.
 */
public class ETIMEntityAIPanic extends net.minecraft.entity.ai.EntityAIBase {

    private static final int MIN_DISTANCE = 16; // R196 :38-41 min_distance
    private static final int MAX_PATH_LENGTH = 48; // R196 :38-41 max_path_length
    private static final int ESCAPE_ATTEMPTS = 16; // R196 EntityLiving :1318 sampler

    private final EntityLiving owner;
    private final World world;
    private final float movementSpeed;
    private final float chance_of_panicking; // R196 :10-11

    // R196 EntityAIMovementTask :9-12 — the base's per-instant counter fields
    private int lastX;
    private int lastZ;
    private int notMovedCounter;
    private int notMovedThreshold;

    // the panic state
    private int panic_countdown;
    private boolean is_done_panicking;

    // per-instance probe (the B-19 r4 diagnostic pattern — Not a judge row)
    private int probeCounter = 0;

    public ETIMEntityAIPanic(EntityLiving owner, float movementSpeed, float chance_of_panicking) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.chance_of_panicking = chance_of_panicking;
        this.setMutexBits(1); // R196 EntityAIMovementTask :21
    }

    @Override
    public boolean shouldExecute() { // R196 :24-28
        if (this.world == null || this.world.isRemote) {
            return false;
        }
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        if (ETIMConfig.mobDebugLog) {
            int idx = (this.probeCounter = this.probeCounter + 1) % 16;
            if (idx == 0) {
                ETIM.LOGGER.info("[AILog] panicflee src=" + ETIMLivestockEvents.kind(this.owner)
                        + " probe-in inv=" + this.probeCounter
                        + " burn=" + this.owner.isBurning()
                        + " panic=" + (this.panic_countdown > 0)
                        + " flee=" + isFleeFlagged()
                        + " revenge=" + (this.owner.getRevengeTarget() != null)
                        + " flag=" + ETIMConfig.livestockNeedsR196
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        if (this.is_done_panicking && this.world.rand.nextInt(10000) == 0) {
            this.is_done_panicking = false; // R196 :24-26
        }
        considerFleeing(); // R196 :27
        return isFleeFlagged() || isPanicking(); // R196 :28
    }

    public void startPanicking() { // R196 :15-17
        this.panic_countdown = this.world.rand.nextInt(100) + 100;
    }

    public boolean isPanicking() { // R196 :19-23
        if (this.owner.isBurning() || isSpooked()) {
            this.startPanicking();
        }
        return this.panic_countdown > 0;
    }

    /** R196 {@code getDistanceToEntity(attacker)} — the 1.12 face carrier. */
    private double distanceTo(EntityLivingBase attacker) {
        return this.owner.getDistance(attacker); // 1.12 Entity :1595 face (the R196 getDistanceToEntity carrier)
    }

    /**
     * R196 EntityLivestock :353 — {@code considerFleeing()}: the revenge
     * target face (1.12 {@code getRevengeTarget()} verbatim carrier of
     * R196 {@code getLastHarmingEntity}) at under 32F sets the flee flag.
     */
    private void considerFleeing() {
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s == null) {
            return;
        }
        EntityLivingBase attacker = this.owner.getRevengeTarget();
        boolean flee = attacker != null && distanceTo(attacker) < 32.0F;
        s.setHasDecidedToFlee(flee);
    }

    /** R196 EntityLivestock :360 — considerStopFleeing. */
    private void considerStopFleeing() {
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s == null) {
            return;
        }
        EntityLivingBase attacker = this.owner.getRevengeTarget();
        if (attacker == null) {
            s.setHasDecidedToFlee(false);
            s.setFleeing(false);
        } else if (distanceTo(attacker) > 40.0F) {
            s.setFleeing(false);
        }
    }

    private boolean isFleeFlagged() {
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        return s != null && s.getHasDecidedToFlee();
    }

    /**
     * R196 EntityLiving :1445 — {@code spooked_until > worldTime} — the
     * IState {@code getSpookedUntil} face (expiry the R196 :333 face = the
     * 0-reset; the R196 :283-297 livestock-spread arm = separate debt).
     */
    private boolean isSpooked() {
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        return s != null && s.getSpookedUntil() > this.world.getTotalWorldTime() && s.getSpookedUntil() > 0;
    }

    @Override
    public void startExecuting() { // R196 :80-89 + the base :47-73 shape
        this.lastX = MathHelper.floor(this.owner.posX);
        this.lastZ = MathHelper.floor(this.owner.posZ);
        this.notMovedCounter = 0;
        this.notMovedThreshold = 30 + this.owner.getRNG().nextInt(20); // base :51
        if (!this.is_done_panicking && this.owner.getRNG().nextFloat() < this.chance_of_panicking) {
            this.startPanicking(); // R196 :82-85
        }
        if (!isPanicking()) {
            this.is_done_panicking = true; // R196 :87-89
        }
        // base :52-65 — the path-validity arm (the swim_if_necessary face:
        // the panic seat table is swim=true for every carrier per R196 :28 etc)
        net.minecraft.pathfinding.PathNavigate nav = this.owner.getNavigator();
        Path path = validPath(getMovementPath());
        if (path == null && nav instanceof net.minecraft.pathfinding.PathNavigateGround) {
            net.minecraft.pathfinding.PathNavigateGround ground = (net.minecraft.pathfinding.PathNavigateGround) nav;
            boolean canSwim = ground.getCanSwim();
            if (!canSwim) {
                ground.setCanSwim(true); // base :67-70 — the swim_if_necessary retry
                path = validPath(getMovementPath());
            }
        }
        if (path != null) {
            this.owner.getNavigator().setPath(path, getMovementSpeed()); // base :72
        }
        // B-29 verify r1 判形修证：verify 真机证明 R196 startExecuting 的逃跑
        // 机器在 path==null 时也完整走（牛被打后 ~5 s 潜移 12 格＝flee 真启动，
        // 仅 [start] 行被旧位 path 门吞掉）＝判行无条件在 startExecuting 入口
        // 落（R196 :80-89 的语义行），path= 字段标注路径可得性；行只走
        // mobDebugLog，非 R196 体内变体。
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] panicflee src=" + ETIMLivestockEvents.kind(this.owner)
                    + " start speed=" + getMovementSpeed()
                    + " panic=" + (this.panic_countdown > 0)
                    + " path=" + (path != null)
                    + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
    }

    @Override
    public void updateTask() { // R196 :92-99 + base :76-79
        this.owner.getNavigator().setSpeed(getMovementSpeed());
        checkOwnerHasMoved();
        int panic_countdown_before = this.panic_countdown;
        if (this.owner.isBurning()) {
            this.startPanicking(); // R196 :94-95
        } else if (this.panic_countdown > 0 && --this.panic_countdown == 0) {
            this.is_done_panicking = true; // R196 :96-98
        }
        if (panic_countdown_before == 0 && this.panic_countdown > 0
                || taskOwnerIsStuck() || this.owner.getNavigator().noPath()) {
            Path path = validPath(getMovementPath());
            if (path != null) {
                this.owner.getNavigator().setPath(path, getMovementSpeed()); // R196 :99 + base :72
            }
        }
    }

    @Override
    public boolean shouldContinueExecuting() { // R196 :101-104
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        considerStopFleeing(); // R196 :102
        return isFleeFlagged() || isPanicking(); // :103-104
    }

    @Override
    public void resetTask() { // R196 :111-114 + base :87-89
        considerStopFleeing();
        this.owner.getNavigator().clearPath();
        if (this.owner.getNavigator() instanceof net.minecraft.pathfinding.PathNavigateGround) {
            ((net.minecraft.pathfinding.PathNavigateGround) this.owner.getNavigator()).setCanSwim(false);
        }
    }

    /** R196 :52-62 verbatim. */
    private Path getMovementPath() {
        if (isPanicking()) {
            return getRandomPath();
        }
        Path path = getPathAwayFromAttacker();
        if (path == null) {
            if (this.owner.getRNG().nextFloat() < this.chance_of_panicking) {
                this.startPanicking();
            }
            return getRandomPath();
        }
        return path;
    }

    /** R196 :106-109 — the family's speed override (NO @Override: the 1.12
     *  EntityAIBase has no such face; the B-27 x1.2 face is the same shape). */
    private float getMovementSpeed() {
        return this.movementSpeed + (isPanicking() ? 0.2F : 0.0F);
    }

    /** R196 :29-33 — the panic face's random-target arm. */
    private Path getRandomPath() {
        Vec3d pos = net.minecraft.entity.ai.RandomPositionGenerator.findRandomTarget(
                (EntityCreature) this.owner, 5, 4);
        return pos == null ? null
                : this.owner.getNavigator().getPathToXYZ(pos.x, pos.y, pos.z);
    }

    /** R196 :36-49 — the attacker-escape face (fleeing flags set on path). */
    private Path getPathAwayFromAttacker() {
        EntityLivingBase attacker = this.owner.getRevengeTarget();
        if (attacker == null) {
            return null;
        }
        Path path = findPathAwayFromXYZ(
                MathHelper.floor(attacker.posX),
                MathHelper.floor(attacker.posY),
                MathHelper.floor(attacker.posZ),
                MIN_DISTANCE, MAX_PATH_LENGTH, true);
        if (path == null) {
            return null;
        }
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s != null) {
            s.setFleeing(true);
            onFleeing(); // R196 :44-47 — the IState onFleeing face (no-op onload)
        }
        return path;
    }

    /**
     * R196 {@code EntityLiving.findPathAwayFromXYZ :1318} verbatim — SAME
     * shape as the B-23 {@code ETIMEntityAISeekNeedBase :305} port
     * (the escape sampler 16/48/true). dx/dz ±max_path_length, dy ∈ [-3,4],
     * pull/push ≤8, the trial + final validity, non-zero path lengths.
     */
    private Path findPathAwayFromXYZ(int fromX, int fromY, int fromZ, int minDistance, int maxPathLength, boolean useNavigator) {
        int startX = MathHelper.floor(this.owner.posX);
        int startY = MathHelper.floor(this.owner.posY);
        int startZ = MathHelper.floor(this.owner.posZ);
        double min_distance_sq = (double) minDistance * (double) minDistance;
        double furthest = 0.0;
        Path result = null;
        for (int attempt = 0; attempt < ESCAPE_ATTEMPTS; attempt++) {
            int dx = this.owner.getRNG().nextInt(maxPathLength * 2 + 1) - maxPathLength;
            int dy = this.owner.getRNG().nextInt(8) - 3; // R196 RNG.int_7_minus_3 carrier
            int dz = this.owner.getRNG().nextInt(maxPathLength * 2 + 1) - maxPathLength;
            int tx = startX + dx; // trial base = OUR pos (the R196 World.findEntityPathAwayFromXYZ :1350 verbatim shell)
            int ty = startY + dy;
            int tz = startZ + dz;
            int i = 0;
            while (i < 8 && isAirOrPassableLatin(tx, ty - 1, tz)) { ty--; i++; }
            i = 0;
            while (i < 8 && !isAirOrPassableLatin(tx, ty, tz)) { ty++; i++; }
            double distSq = distanceSq(tx, ty, tz, fromX, fromY, fromZ);
            if (distSq < min_distance_sq || distSq <= furthest) {
                continue;
            }
            Path trialPath = this.owner.getNavigator().getPathToXYZ(tx, ty, tz);
            if (trialPath == null) {
                continue;
            }
            net.minecraft.pathfinding.PathPoint fp = trialPath.getFinalPathPoint();
            double fdist = distanceSq(fp.x, fp.y, fp.z, fromX, fromY, fromZ);
            if (fdist >= min_distance_sq && fdist > furthest) {
                furthest = fdist;
                result = trialPath;
            }
        }
        return result;
    }

    /** R196 {@code World.getDistanceSqFromDeltas(dx,dy,dz)} — the static face. */
    private static double distanceSq(double ax, double ay, double az, double bx, double by, double bz) {
        double dx = ax - bx;
        double dy = ay - by;
        double dz = az - bz;
        return dx * dx + dy * dy + dz * dz;
    }

    /** R196 {@code isAirOrPassableBlock(x,y,z,false)} — the B-23 base face
     *  (air or a walk-through free body). */
    private boolean isAirOrPassableLatin(int x, int y, int z) {
        net.minecraft.block.state.IBlockState st = this.world.getBlockState(new net.minecraft.util.math.BlockPos(x, y, z));
        net.minecraft.block.material.Material m = st.getMaterial();
        return m == net.minecraft.block.material.Material.AIR || m.isReplaceable();
    }

    /** R196 {@code onFleeing()} — the no-op ancestor face (the IState setter only). */
    private void onFleeing() {
        // R196 EntityLivestock.onFleeing — the no-op ancestor face carrier
    }

    /** R196 EntityAIMovementTask :24-38 — the per-tick moved face. */
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

    /** R196 EntityAIMovementTask :55-65 — the path-validity arm (B-23 same shape). */
    private Path validPath(Path path) {
        if (path == null || path.isFinished()) {
            return null;
        }
        net.minecraft.pathfinding.PathPoint fp = path.getFinalPathPoint();
        double dx = this.owner.posX - fp.x;
        double dy = this.owner.posY - fp.y;
        double dz = this.owner.posZ - fp.z;
        return (dx * dx + dy * dy + dz * dz) < 1.0 ? null : path; // :60-62
    }
}
