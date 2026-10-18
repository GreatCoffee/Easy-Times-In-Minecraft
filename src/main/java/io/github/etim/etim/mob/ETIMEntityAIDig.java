package io.github.etim.etim.mob;

import javax.annotation.Nullable;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.playerstate.ETIMBedSafety;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.ai.EntityAIBase;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.init.Blocks;
import net.minecraft.item.ItemStack;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;

/**
 * AI-02 — the dig task (mobs-ai verdict 裁 3 + 补裁 C-9b): the verbatim
 * transpose of R196 {@code EntityAIWatchAnimal} (EntityAIWatchAnimal.java:
 * 1-256, EntityAIBase, mutex 3, priority 1). A zombie whose attack target is
 * blocked picks a block on the physical reach lines and chews through it —
 * beds are just the obstacle most often in the way.
 *
 * <p>Registered deviations: the {@code recentlyHit} reset branch is dead
 * code in R196 (player_attacks_always_reset_digging constant false) and is
 * deleted (D-1, constraint 1); the attack-task handle face in
 * {@code continueExecuting} (:202-212, getEntityAITask → canStrikeTargetNow)
 * is covered by the mutex-3 scheduler exclusivity in 1.12 — the dig task
 * and the attack task cannot run the same tick, and the dig yields when the
 * strike becomes reachable — C 级; the strike-line family
 * ({@code getMeleeAttackPoints}/{@code getTargetPoints}) collapses to the
 * vanilla reach face (补裁 B 级精度替代同族); canSeeTarget loses its
 * ignore_leaves argument (1.12 EntitySenses has no overload — C 级);
 * {@code getBlockCollisionForPhysicalReach} maps to the rayTraceBlocks
 * variant.</p>
 */
public class ETIMEntityAIDig extends EntityAIBase {

    private final EntityZombie digger;

    public ETIMEntityAIDig(EntityZombie digger) {
        this.digger = digger;
        this.setMutexBits(3); // R196 :9
    }

    /** R196 shouldExecute (:13-139). */
    @Override
    public boolean shouldExecute() {
        if (!ETIMConfig.zombieDigAI) { // the config gate rides the task (the vanilla-zombie off face)
            return this.gateFail("cfg", "");
        }
        ETIMDigging.IState s = ETIMDigging.get(this.digger);
        if (s == null) {
            return this.gateFail("state", "");
        }
        if (ETIMDigging.isHoldingItemThatPreventsDigging(this.digger)) { // :14-15
            return this.gateFail("holding", "");
        }
        if ((ETIMDigging.isDiggingEnabled(this.digger) || canSeeTarget(false)) // :18, recentlyHit 死码删
                ) {
            EntityLivingBase target = this.digger.getAttackTarget(); // :19
            if (target == null) { // :20-21
                return this.gateFail("target", "");
            }
            if (blockPosX(this.digger) == blockPosX(target) // :24-27 — same block = strike face, not dig face
                && blockPosY(this.digger) == blockPosY(target)
                && blockPosZ(this.digger) == blockPosZ(target)) {
                return this.gateFail("sameBlock", "");
            }
            if (s.isDestroyingBlock() // :30-32 — keep the running destruction
                && ETIMDigging.canDestroyBlock(this.digger, s, s.getDestroyBlockX(), s.getDestroyBlockY(), s.getDestroyBlockZ(), true)) {
                return true;
            }
            if (!s.isDestroyingBlock() && this.digger.getRNG().nextInt(20) != 0) { // :35 — the 1/20 pick roll (not logged: noise)
                return false;
            }
            double distanceToTarget = this.digger.getDistance(target.posX, target.posY, target.posZ); // R196 :40 getDistanceToEntity → vanilla distance face
            if (distanceToTarget > 16.0F) { // :41-42
                return this.gateFail("dist16", " dist=" + distanceToTarget);
            }
            int attackerFootY = footBlockPosY(this.digger);
            if (distanceToTarget * distanceToTarget > 2.0F) { // :46 — probe the target's own support column
                int x = blockPosX(target);
                int y = footBlockPosY(target);
                int z = blockPosZ(target);
                while (--y >= attackerFootY) { // :51
                    if (ETIMDigging.setBlockToDig(this.digger, s, x, y, z, true)) {
                        return true;
                    }
                }
            }
            if (distanceToTarget > 8.0F) { // :58-60
                return this.gateFail("dist8", " dist=" + distanceToTarget);
            }
            // :63-66 — the physical-sight gate (own headroom + reach line to the target eye).
            boolean canAttackerSeeTarget = ETIMBedSafety.isAirOrPassableBlock(this.digger.world,
                    blockPosX(this.digger), MathHelper.floor(this.digger.posY + this.digger.height * 0.85F + 1.0D), blockPosZ(this.digger), false)
                && lineOfPhysicalReach(this.digger.world,
                        new Vec3d(this.digger.posX, this.digger.posY + this.digger.height * 0.85F + 1.0D, this.digger.posZ),
                        new Vec3d(target.posX, target.posY + target.height * 0.85F, target.posZ));
            if (distanceToTarget > (canAttackerSeeTarget ? 8.0F : (ETIMDigging.isFrenzied(this.digger) ? 6.0F : 4.0F))) { // :67-69
                return this.gateFail("sightDist", " dist=" + distanceToTarget + " seen=" + canAttackerSeeTarget + " frenzied=" + ETIMDigging.isFrenzied(this.digger));
            }
            // :71-74 — an existing path means walk, not dig. (The R196 face is faithful:
            // getPathToEntityLiving is pure-compute in BOTH versions and the R196 :71 local
            // is dead there too; noPath() reads the ACTIVE movement path in both.)
            this.digger.getNavigator().getPathToEntityLiving(target); // (target,16) cap → navigator followRange, C 级
            if (!this.digger.getNavigator().noPath()) { // :72-74
                return this.gateFail("walk", " dist=" + distanceToTarget);
            }
            // :76-78 — within striking distance means attack, not dig (v1 reach face, 补裁 B 级同族).
            if (withinStrikingDistance(this.digger, target)) {
                return this.gateFail("strike", " dist=" + distanceToTarget);
            }
            Vec3d targetCenterPos = getTargetEntityCenterPosForBlockDestroying(target); // :80
            // :81-102 — the headroom path: ray toward the block above the target center.
            BlockPos hitHead = null;
            if (ETIMBedSafety.isAirOrPassableBlock(this.digger.world,
                    blockPosX(target), footBlockPosY(target) + 2, blockPosZ(target), false)) {
                hitHead = reachRay(this.digger.world, this.digger, targetCenterPos.add(0.0D, 1.0D, 0.0D)); // :82-84
                if (hitHead != null && exemptFromRestriction(this.digger, hitHead)) { // :85-91
                    int hitY = hitHead.getY() + 1; // :92
                    while (hitY >= attackerFootY) { // :94
                        if (ETIMDigging.setBlockToDig(this.digger, s, hitHead.getX(), hitY, hitHead.getZ(), true)) {
                            return true;
                        }
                        hitY--; // :99
                    }
                }
            }
            // :104-121 — the center path.
            BlockPos hitCenter = reachRay(this.digger.world, this.digger, targetCenterPos);
            if (hitCenter != null && exemptFromRestriction(this.digger, hitCenter)) { // :105-111
                int hitY = hitCenter.getY() + 1; // :112
                while (hitY >= attackerFootY) { // :114
                    if (ETIMDigging.setBlockToDig(this.digger, s, hitCenter.getX(), hitY, hitCenter.getZ(), true)) {
                        return true;
                    }
                    hitY--; // :119
                }
            }
            // :123-135 — the leg path: dig the blocking block only when its
            // own top face is open (or can fall).
            BlockPos legHit = reachRayLeg(this.digger.world, this.digger, targetCenterPos);
            if (legHit != null && exemptFromRestriction(this.digger, legHit)
                && (ETIMBedSafety.isAirOrPassableBlock(this.digger.world,
                        legHit.getX(), legHit.getY() + 1, legHit.getZ(), false)
                    || blockWillFall(this.digger.world, legHit))
                && ETIMDigging.setBlockToDig(this.digger, s, legHit.getX(), legHit.getY(), legHit.getZ(), false)) {
                return true;
            }
            return this.gateFail("probe",
                " headRay=" + (hitHead != null) + " centerRay=" + (hitCenter != null) + " legRay=" + (legHit != null));
        } else {
            return this.gateFail("orGate", "");
        }
    }

    /** R196 startExecuting (:192-194). */
    @Override
    public void startExecuting() {
        ETIMDigging.IState s = ETIMDigging.get(this.digger);
        if (s != null) {
            s.setDestroyingBlock(true);
            this.lastGate = ""; // the next failure logs immediately
            this.gateLogCooldown = 0;
        }
    }

    // ---- the dig-gate judge row (window A4/B1 instrumentation) ----
    // Edge-triggered with a 40-tick global floor; a stable gate repeats every
    // 200 ticks. Judgement-only face: every return-false exit of shouldExecute
    // is observable in the log, so a zero bed-dig row window is self-explaining.
    private String lastGate = "";
    private int gateLogCooldown = 0;

    /** Logs the failing gate (throttled) and returns false — every shouldExecute exit rides this. */
    private boolean gateFail(String gate, String detail) {
        if (this.gateLogCooldown > 0) {
            this.gateLogCooldown--;
        }
        boolean edge = !gate.equals(this.lastGate);
        if (edge ? this.gateLogCooldown <= 160 : this.gateLogCooldown <= 0) {
            ETIM.LOGGER.info("[SleepLog] dig-gate mob=" + this.digger.getClass().getSimpleName()
                + " gate=" + gate + detail
                + " tick=" + this.digger.world.getWorldInfo().getWorldTotalTime());
            this.lastGate = gate;
            this.gateLogCooldown = 200;
        }
        return false;
    }

    /** R196 continueExecuting (:197-233) → the 1.12 MCP name; attack-handle face → mutex exclusivity (C 级). */
    @Override
    public boolean shouldContinueExecuting() {
        ETIMDigging.IState s = ETIMDigging.get(this.digger);
        if (s == null || ETIMDigging.isHoldingItemThatPreventsDigging(this.digger)) { // :198-199
            return false;
        }
        if (s.getDestroyPauseTicks() > 0) { // :214-215
            return s.getDestroyPauseTicks() != 1 || !couldGetCloserByPathing(s);
        } else if (!s.isDestroyingBlock()) { // :216-217
            return false;
        } else if (!ETIMDigging.canDestroyBlock(this.digger, s, s.getDestroyBlockX(), s.getDestroyBlockY(), s.getDestroyBlockZ(), true)) { // :218-219
            return false;
        } else {
            EntityLivingBase target = this.digger.getAttackTarget(); // :223
            if (target == null) { // :224-225
                return false;
            } else {
                return blockPosX(this.digger) == blockPosX(target) // :227-229
                        && blockPosY(this.digger) == blockPosY(target)
                        && blockPosZ(this.digger) == blockPosZ(target)
                    ? false
                    : this.digger.ticksExisted + this.digger.getEntityId() * 47 % 10 != 0 // :231 getTicksExistedWithOffset
                        || !couldHitTargetByPathing(s, target);
            }
        }
    }

    /** R196 updateTask (:237-249) with the EntityAnimalWatcher.onUpdate face folded in (:303-319). */
    @Override
    public void updateTask() {
        ETIMDigging.IState s = ETIMDigging.get(this.digger);
        if (s == null) {
            return;
        }
        // :303-319 fold — face the block and re-admit the destruction (pause==0 face).
        if (s.isDestroyingBlock() && s.getDestroyPauseTicks() == 0) {
            this.digger.getLookHelper().setLookPosition(
                    s.getDestroyBlockX() + 0.5F, s.getDestroyBlockY() + 0.5F, s.getDestroyBlockZ() + 0.5F,
                    10.0F, this.digger.getVerticalFaceSpeed());
            if (!ETIMDigging.canDestroyBlock(this.digger, s, s.getDestroyBlockX(), s.getDestroyBlockY(), s.getDestroyBlockZ(), true)) {
                ETIMDigging.cancelBlockDestruction(this.digger, s);
                return;
            }
        }
        if (s.getDestroyPauseTicks() > 0) { // :238-239
            s.setDestroyPauseTicks(s.getDestroyPauseTicks() - 1);
        } else {
            if (s.getDestroyBlockCooloff() == 10) { // :241-243
                this.digger.swingArm(EnumHand.MAIN_HAND);
            }
            s.setDestroyBlockCooloff(s.getDestroyBlockCooloff() - 1);
            if (s.getDestroyBlockCooloff() <= 0) { // :245-247
                s.setDestroyBlockCooloff(getCooloffForBlock(s));
                ETIMDigging.partiallyDestroyBlock(this.digger, s);
            }
        }
    }

    /** R196 resetTask (:253-255). */
    @Override
    public void resetTask() {
        ETIMDigging.IState s = ETIMDigging.get(this.digger);
        if (s != null) {
            ETIMDigging.cancelBlockDestruction(this.digger, s);
        }
    }

    // -- local face helpers ------------------------------------------------

    /** R196 getBlockPosX/Y/Z (Entity.java:2638-2648). */
    private static int blockPosX(EntityLivingBase e) {
        return MathHelper.floor(e.posX);
    }

    private static int blockPosY(EntityLivingBase e) {
        return MathHelper.floor(e.posY);
    }

    private static int blockPosZ(EntityLivingBase e) {
        return MathHelper.floor(e.posZ);
    }

    /** R196 getFootBlockPosY (EntityLivingBase.java:2372). */
    private static int footBlockPosY(EntityLivingBase e) {
        return MathHelper.floor(e.posY + 1.0E-4F);
    }

    /** R196 canSeeTarget (EntityLiving.java:1691) → EntitySenses face, ignore_leaves dropped (C 级).
     * The null gate restores the R196 EntitySenses.canSee first line
     * (mite-src EntitySenses.java:24-26 {@code if (entity == null) return false}) —
     * the 1.12 vanilla EntitySenses lost that gate (f5f2563→25a46e0 window A3:
     * NPE at getPositionEyes), and the R196 or-gate-before-target-guard order
     * (:18 before :19-22) relies on it. */
    private boolean canSeeTarget(boolean ignoreLeaves) {
        EntityLivingBase target = this.digger.getAttackTarget();
        if (target == null) { // R196 EntitySenses.java:24-26 — the lost vanilla gate, restored
            return false;
        }
        return this.digger.getEntitySenses().canSee(target); // R196 :1692 canSeeTarget → EntitySenses face (ignore_leaves dropped, C 级)
    }

    /**
     * R196 isTargetWithinStrikingDistance (EntityLiving.java:1683) → the
     * vanilla AI reach face (width-based, 补裁 B 级精度替代同族).
     */
    private static boolean withinStrikingDistance(EntityZombie digger, EntityLivingBase target) {
        double reachSq = digger.width * 2.0F * digger.width * 2.0F + target.width;
        return digger.getDistanceSq(target.posX, target.getEntityBoundingBox().minY, target.posZ) <= reachSq;
    }

    /** R196 getTargetEntityCenterPosForBlockDestroying (06a :134-136). */
    private static Vec3d getTargetEntityCenterPosForBlockDestroying(EntityLivingBase target) {
        return new Vec3d(target.posX, target.posY + target.height / 2.0F, target.posZ);
    }

    /** R196 getEyePosForBlockDestroying → getPrimaryPointOfAttack (non-player face, 06a :126/:138). */
    private static Vec3d eyePos(EntityZombie digger) {
        return new Vec3d(digger.posX, digger.posY + digger.height * 0.75F, digger.posZ);
    }

    /** R196 getAttackerLegPosForBlockDestroying (06a :130-131). */
    private static Vec3d legPos(EntityZombie digger) {
        return new Vec3d(digger.posX, digger.posY + digger.height * 0.25F, digger.posZ);
    }

    /**
     * R196 getBlockCollisionForPhysicalReach → the first block on the reach
     * ray, or null when the ray is clear (rayTraceBlocks 变体, C 级).
     */
    @Nullable
    private static BlockPos reachRay(World world, EntityZombie digger, Vec3d to) {
        return rayBlockHit(world, eyePos(digger), to);
    }

    /** R196 :123 leg-face variant. */
    @Nullable
    private static BlockPos reachRayLeg(World world, EntityZombie digger, Vec3d to) {
        return rayBlockHit(world, legPos(digger), to);
    }

    @Nullable
    private static BlockPos rayBlockHit(World world, Vec3d from, Vec3d to) {
        RayTraceResult hit = world.rayTraceBlocks(from, to, false, true, false);
        if (hit == null || hit.typeOfHit == RayTraceResult.Type.MISS) {
            return null;
        }
        return hit.getBlockPos();
    }

    /** R196 hasLineOfPhysicalReach face → the reach ray is clear. */
    private static boolean lineOfPhysicalReach(World world, Vec3d from, Vec3d to) {
        return rayBlockHit(world, from, to) == null;
    }

    /**
     * R196 :88-89/:108-110 — the fence-restriction exemption: a restricted
     * (fence) block blocks the dig unless the digger holds an effective
     * tool or the target is a player.
     */
    private static boolean exemptFromRestriction(EntityZombie digger, BlockPos hit) {
        IBlockState state = digger.world.getBlockState(hit);
        if (!(state.getBlock() instanceof net.minecraft.block.BlockFence)) { // isRestrictedBlock :141-142
            return true;
        }
        // :89/:109/:128 — effective-tool ride-along → vanilla isToolEffective face
        boolean effectiveTool = ETIMDigging.heldToolEffective(digger.getHeldItemMainhand(), state);
        return effectiveTool || digger.getAttackTarget() instanceof net.minecraft.entity.player.EntityPlayer; // isTargettingAPlayer :90
    }

    /** R196 blockWillFall (:26-29). */
    private static boolean blockWillFall(World world, BlockPos pos) {
        IBlockState state = world.getBlockState(pos);
        return state.getBlock() instanceof net.minecraft.block.BlockFalling
            || state.getBlock() == Blocks.CACTUS
            || state.getBlock() instanceof net.minecraft.block.BlockTorch
            || state.getBlock() == Blocks.SNOW_LAYER;
    }

    /** R196 getCooloffForBlock — delegated to the shared dig machine. */
    private int getCooloffForBlock(ETIMDigging.IState s) {
        return ETIMDigging.sharedCooloffForBlock(this.digger, s);
    }

    /** R196 couldGetCloserByPathing (:149-165). */
    private boolean couldGetCloserByPathing(ETIMDigging.IState s) {
        EntityLivingBase target = this.digger.getAttackTarget();
        if (target == null) {
            return false;
        }
        double distance = Math.sqrt((this.digger.posX - target.posX) * (this.digger.posX - target.posX)
            + (this.digger.posY - target.posY) * (this.digger.posY - target.posY)
            + (this.digger.posZ - target.posZ) * (this.digger.posZ - target.posZ));
        Path path = this.digger.getNavigator().getPathToEntityLiving(target);
        if (path == null) {
            return false;
        }
        PathPoint finalPoint = path.getFinalPathPoint();
        float x = finalPoint.x + 0.5F;
        float y = finalPoint.y;
        float z = finalPoint.z + 0.5F;
        return Math.sqrt((x - target.posX) * (x - target.posX) + (y - target.posY) * (y - target.posY)
            + (z - target.posZ) * (z - target.posZ)) < distance - 2.0D;
    }

    /** R196 couldHitTargetByPathing (:168-188). */
    private boolean couldHitTargetByPathing(ETIMDigging.IState s, EntityLivingBase target) {
        Path path = this.digger.getNavigator().getPathToEntityLiving(target);
        if (path == null) {
            return false;
        }
        PathPoint finalPoint = path.getFinalPathPoint();
        float x = finalPoint.x + 0.5F;
        float y = finalPoint.y;
        float z = finalPoint.z + 0.5F;
        double dist = Math.sqrt((x - target.posX) * (x - target.posX) + (y - target.posY) * (y - target.posY)
            + (z - target.posZ) * (z - target.posZ));
        return dist > 1.0F ? false
            : lineOfPhysicalReach(this.digger.world,
                    new Vec3d(x, y, z), getTargetEntityCenterPosForBlockDestroying(target)) == false;
    }
}
