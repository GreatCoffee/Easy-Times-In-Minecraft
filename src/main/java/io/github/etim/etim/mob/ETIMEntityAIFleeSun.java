package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.material.Material;
import net.minecraft.entity.EntityCreature;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

/**
 * B-24 — R196 {@code EntityAIFleeSun :11-90} verbatim, seated per carrier
 * (skeleton prio 3 — R196 EntitySkeleton ctor :17; zombie villager prio 2
 * plus R196's {@code EntityAIRestrictSun} prio 1 wedge — R196 EntityZombie
 * .setVillager :83-88, the 1.12 carrier rides {@code MixinEntityZombieVillager}).
 * 1.12 HAS a vanilla {@code EntityAIFleeSun} but its body is a different
 * family (head-armor veto, an R196-absent arm; the shelter scan is a plain
 * random-pos roll over {@code getBlockPathWeight}) and NO 1.12 class seats
 * it — this class replaces the whole vanilla shape at the seat (the B-19
 * shelter-arms line). R196 faces:
 * <ul>
 *   <li>{@code shouldExecute :27-52} — the day gate, the burning gate, the
 *       sunlit-position gate ({@code canBlockSeeTheSky(minY)}), the
 *       skeleton veto (R196 {@code avoidsSunlight()} has no 1.12 flag; the
 *       C-grade carrier keeps vanilla's head-armor veto for the armor
 *       semantics and the skeleton gate rides the SEAT side), then the
 *       shelter roll.</li>
 *   <li>{@code findPossibleShelter :54-89} — 10 attempts with a growing
 *       sample radius ({@code nextInt(3+attempt*2)-(1+attempt)}, dy
 *       {@code nextInt(7)-3}); the WATER-cell preference (material water
 *       with a passable cell above — the burning mob may jump in to douse);
 *       the lava/fire hard skip; the "shade under something" arm — a
 *       passable/nonsolid cell whose above-cell is NOT sky visible, with
 *       the below-material lava/fire veto and the tall-mob headroom
 *       check. R196 carrier mappings: {@code isAlwaysSolidStandardFormCube}
 *       -> {@code isFullCube()}, {@code isNeverSolid/block==null} ->
 *       the material check, {@code isAirOrPassableBlock} ->
 *       air-or-replaceable (the B-23 base carrier),
 *       {@code getWorldVec3Pool().getVecFromPool} -> {@code new Vec3d}.</li>
 *   <li>{@code startExecuting} = {@code tryMoveToXYZ(shelter, speed)};
 *       {@code continueExecuting} = {@code !noPath()} (R196 :91-98).</li>
 * </ul>
 * Judge row: {@code [AILog] fleesun src=<kind> start …} — one per executed
 * path, {@code mobDebugLog} gated (the B-19 seek-row family shape).
 */
public class ETIMEntityAIFleeSun extends net.minecraft.entity.ai.EntityAIBase {

    private static final Material[] HARMFUL_SOLID_SKIP = null; // (unused marker; the lava/fire checks are inline)

    private final EntityCreature owner;
    private final World world;
    private final double movementSpeed;
    private double shelterX;
    private double shelterY;
    private double shelterZ;

    // probe cadence — r2 lesson: the per-instance cadence still spilled
    // zero rows (the first-fire gate hid behind the shared-pace analysis);
    // the warm-up burst prints the first 6 invocations then throttles by
    // wall time.
    private int probeCounter = 0;
    private long probeLastMs = 0;

    public ETIMEntityAIFleeSun(EntityCreature owner, double movementSpeed) {
        this.owner = owner;
        this.world = owner.world;
        this.movementSpeed = movementSpeed;
        this.setMutexBits(1); // R196 :26
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
            // warm-up burst: the first 6 invocations print every call, then
            // every 100 — settles the "does shouldExecute even run per host"
            // question in one boot (the B-22 r1 probe-family lesson).
            this.probeCounter++;
            boolean burst = this.probeCounter <= 6;
            if (burst || this.probeCounter % 100 == 0) {
                long now = System.currentTimeMillis();
                if (now - probeLastMs > 250) {
                    probeLastMs = now;
                    ETIM.LOGGER.info("[AILog] fleesun src=" + ETIMLivestockEvents.kind(this.owner)
                            + " probe-in inv=" + this.probeCounter
                            + " day=" + this.world.isDaytime()
                            + " burning=" + this.owner.isBurning()
                            + " inSky=" + canSeeSky(this.world, MathHelper.floor(this.owner.posX),
                                    MathHelper.floor(this.owner.getEntityBoundingBox().minY), MathHelper.floor(this.owner.posZ))
                            + " flag=" + ETIMConfig.livestockNeedsR196
                            + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
                }
            }
        }
        if (!this.world.isDaytime()) {
            return false;
        }
        if (!this.owner.isBurning()) {
            return false;
        }
        if (!canSeeSky(this.world, MathHelper.floor(this.owner.posX),
                MathHelper.floor(this.owner.getEntityBoundingBox().minY), MathHelper.floor(this.owner.posZ))) {
            return false;
        }
        Vec3d shelter = findPossibleShelter();
        if (shelter == null) {
            return false;
        }
        this.shelterX = shelter.x;
        this.shelterY = shelter.y;
        this.shelterZ = shelter.z;
        return true;
    }

    @Override
    public boolean shouldContinueExecuting() { // R196 :96-98 — !noPath
        return !this.owner.getNavigator().noPath();
    }

    @Override
    public void startExecuting() { // R196 :91-94
        this.owner.getNavigator().tryMoveToXYZ(this.shelterX, this.shelterY, this.shelterZ, this.movementSpeed);
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] fleesun src=" + ETIMLivestockEvents.kind(this.owner)
                    + " start shelter=" + MathHelper.floor(this.shelterX) + "," + MathHelper.floor(this.shelterY) + "," + MathHelper.floor(this.shelterZ)
                    + " speed=" + this.movementSpeed
                    + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
    }

    // ---- 1.12 block-face carriers (the R196 MITE helpers) ----

    /** R196 {@code isAirOrPassableBlock} carrier — air or walk-through free body. */
    private static boolean isAirOrPassable(World world, int x, int y, int z) {
        Material m = world.getBlockState(new BlockPos(x, y, z)).getMaterial();
        return m == Material.AIR || m.isReplaceable();
    }

    /** R196 {@code isNeverSolid} / null-block carrier. */
    private static boolean isNeverSolid(net.minecraft.block.state.IBlockState state) {
        return state.getMaterial() == Material.AIR;
    }

    /** R196 {@code isAlwaysSolidStandardFormCube} carrier. */
    private static boolean isFullCube(World world, int x, int y, int z) {
        return world.getBlockState(new BlockPos(x, y, z)).isFullCube();
    }

    /** R196 {@code World.getBlockMaterial} carrier. */
    private static Material materialAt(World world, int x, int y, int z) {
        return world.getBlockState(new BlockPos(x, y, z)).getMaterial();
    }

    /** R196 {@code canBlockSeeTheSky} carrier — the 1.12 heightmap face. */
    private static boolean canSeeSky(World world, int x, int y, int z) {
        return world.canSeeSky(new BlockPos(x, y, z));
    }

    /** R196 {@code EntityLivingBase.isHarmedByLava/isHarmedByFire} carrier —
     *  the MITE harm flags; the 1.12 base = isEntityUndead/blaze immune. */
    private static boolean isHarmedByLava(EntityCreature creature) {
        return !creature.isEntityUndead() && !(creature instanceof net.minecraft.entity.monster.EntityBlaze);
    }

    private static boolean isHarmedByFire(EntityCreature creature) {
        return isHarmedByLava(creature);
    }

    /** R196 {@code findPossibleShelter :54-89} verbatim. */
    private Vec3d findPossibleShelter() {
        java.util.Random random = this.owner.getRNG();
        int originX = MathHelper.floor(this.owner.posX); // R196 getBlockPosX carrier
        int originY = MathHelper.floor(this.owner.getEntityBoundingBox().minY); // getFootBlockPosY carrier
        int originZ = MathHelper.floor(this.owner.posZ);

        for (int attempt = 0; attempt < 10; attempt++) {
            int dx = random.nextInt(3 + attempt * 2) - (1 + attempt);
            int dy = random.nextInt(7) - 3;
            int dz = random.nextInt(3 + attempt * 2) - (1 + attempt);
            int x = originX + dx;
            int y = originY + dy;
            int z = originZ + dz;
            net.minecraft.block.state.IBlockState state = this.world.getBlockState(new BlockPos(x, y, z));
            Material material = state.getMaterial();
            if (material != Material.AIR) {
                if (isFullCube(this.world, x, y, z)) {
                    continue; // R196 :63-65 — the solid-cube skip
                }
                if (material == Material.WATER && isAirOrPassable(this.world, x, y + 1, z)) {
                    return new Vec3d(x, y, z); // R196 :67-69 — the douse-in-water preference
                }
                if (material == Material.LAVA && isHarmedByLava(this.owner)
                        || material == Material.FIRE && isHarmedByFire(this.owner)) {
                    continue; // R196 :71-73 — never shelter IN the harmful solid
                }
            }
            if ((material == Material.AIR || isNeverSolid(state) || isAirOrPassable(this.world, x, y, z))
                    && !canSeeSky(this.world, x, y + 1, z)) {
                Material materialBelow = materialAt(this.world, x, y - 1, z);
                if ((materialBelow != Material.LAVA || !isHarmedByLava(this.owner))
                        && (materialBelow != Material.FIRE || !isHarmedByFire(this.owner))) {
                    if (this.owner.height <= 1.0F) {
                        return new Vec3d(x, y, z); // R196 :81-83
                    }
                    net.minecraft.block.state.IBlockState above = this.world.getBlockState(new BlockPos(x, y + 1, z));
                    if (above.getMaterial() == Material.AIR) {
                        return new Vec3d(x, y, z); // R196 :86-88
                    }
                    if (!isFullCube(this.world, x, y + 1, z)
                            && (above.getMaterial() == Material.AIR || isAirOrPassable(this.world, x, y + 1, z))) {
                        return new Vec3d(x, y, z); // R196 :90-92
                    }
                }
            }
        }
        return null;
    }
}
