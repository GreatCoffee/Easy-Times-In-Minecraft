package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.block.BlockDoor;
import net.minecraft.block.BlockFenceGate;
import net.minecraft.block.BlockTrapDoor;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.ai.EntityAIBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.item.ItemTool;
import net.minecraft.item.ItemStack;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathNavigate;
import net.minecraft.pathfinding.PathNavigateGround;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.EnumDifficulty;
import net.minecraft.world.World;

import io.github.etim.etim.mixins.PathNavigateAccessor;

/**
 * B-31 — the R196 {@code EntityAIBreakDoor} face
 * ({@code mite-src/decompile/src/net/minecraft/EntityAIBreakDoor.java:1-123}
 * plus its base {@code EntityAIDoorInteract.java:1-88}), ported onto 1.12
 * with the 摸底 report
 * ({@code playground/audit/breakdoor-立项摸底.md}) as the carrier map.
 *
 * <p>The class is a FULL B-31 carrier: R196's {@code EntityAIDoorInteract}
 * base face is inlined here (the 1.12 base keeps the same scan, but its
 * package-private helper fields {@code hasStoppedDoorInteraction} /
 * {@code entityPositionX/Z} are invisible from the ETIM package — the B-22
 * precedent writes the face out instead of fighting the package seam).</p>
 *
 * <p><b>Seat</b> (MixinEntityZombie): R196 {@code EntityZombie :18-20} keeps
 * a CONSTANT {@code addTask(1, breakDoor)} seat seeded by
 * {@code setBreakDoors(true)}; vanilla 1.12 instead rolls the vanilla
 * {@code EntityAIBreakDoor} seat at spawn ({@code :535 rand<float*0.1F} /
 * leader {@code :562}) and re-arms it from NBT {@code CanBreakDoors}
 * via {@code setBreakDoorsAItask}. The mixin adds this agent at the
 * constructor TAIL under livestockNeedsR196 (the eleventh reuse) and
 * guards {@code setBreakDoorsAItask} so the vanilla seat cannot double-book
 * the R196 one. Flag off = vanilla keeps its shape entirely.</p>
 *
 * <p><b>Face differences carried</b> (all 摸底-certified, verbatim unless
 * listed as mapped): the wooden-portal roster = door + trapdoor + fence
 * gate (R196 {@code PathFinder.isWoodenPortal :208-210} — {@code instanceof}
 * covers the 1.12 six-kind door/gate roster with the same semantic); the
 * closed-portal guard recurses a door's TOP half onto its bottom half
 * (R196 {@code PathFinder :212-222}); break-time table door 1920 / other
 * portal 480 (R196 :93-94) halved on frenzy (R196 :106, carried through
 * {@code ETIMDigging.isFrenzied} ETIMDigging.java:278-284 = the 补裁
 * C-9a blood-moon-night mapping); counter advance
 * {@code += (int)(strVsBlock + 0.5F)} (R196 :62); fenceGate only breaks
 * while a player is the attack target (R196 :16-17); final breach = HARD
 * only (R196 :74) and clears the door's bottom half first (:75-77).</p>
 *
 * <p><b>C-level drops</b> (摸底): {@code refreshDespawnCounter(-400)} (MITE
 * despawn counter, 1.12 has no such face), MITE SFX ids 1010/1012 (kept
 * only the 1.12-shared 2001 face, data = {@code Block.getStateId}) and the
 * RenderGlobal SFX2001 suppress flags; Earth-Elemental /4 /6 /8 tick cuts
 * and ghoul frenzies are MITE-only faces.</p>
 *
 * <p>Judge rows (B-29 style — always at the edge, no path gating around
 * them): {@code [AILog] breakdoor src=zombie probe-in …} (1-in-16 roll),
 * {@code start target=<block>@<pos> ticks=<n>}, {@code progress
 * stage=<0..10> ticks=<n>} and {@code break target=…} on the removal edge,
 * gated by {@code ETIMConfig.mobDebugLog}.</p>
 */
public class ETIMEntityAIBreakDoor extends EntityAIBase {

    /** The ported {@code EntityLiving} owner. */
    private final EntityLiving entity;
    /** R196 :5-7 doorPosition / :8 targetDoor the scan fills. */
    protected BlockPos doorPosition = BlockPos.ORIGIN;
    protected Block targetDoor;
    /** R196 :63-65 interaction-abort face (dot product < 0 = walked past). */
    boolean hasStoppedDoorInteraction;
    private float entityPositionX;
    private float entityPositionZ;
    /** R196 :4 — the breaking counter, advanced by getStrVsTargetBlock each tick. */
    private int breakingTime;
    /** R196 :5 — last sent destroy-progress stage (1.12 previousBreakProgress face). */
    private int previousBreakProgress = -1;
    private int probeCounter;

    public ETIMEntityAIBreakDoor(EntityLiving entity) {
        this.entity = entity;
    }

    // ------------------------------------------------------------------
    // portal faces (R196 PathFinder :208-222)
    // ------------------------------------------------------------------

    private static boolean isWoodenPortal(Block block) {
        return block instanceof BlockDoor || block == Blocks.TRAPDOOR || block instanceof BlockFenceGate;
    }

    /**
     * R196 PathFinder.isAClosedWoodenPortal :212-222 — doors recurse the top
     * half onto the bottom (the OPEN bit lives with the bottom half's state
     * in 1.12 exactly like R196's metadata face), trapdoors and fence gates
     * read their own OPEN flag.
     */
    private static boolean isAClosedWoodenPortal(World world, BlockPos pos) {
        IBlockState state = world.getBlockState(pos);
        Block block = state.getBlock();
        if (block instanceof BlockDoor) {
            return state.getValue(BlockDoor.HALF) == BlockDoor.EnumDoorHalf.UPPER
                    ? isAClosedWoodenPortal(world, pos.down())
                    : !state.getValue(BlockDoor.OPEN);
        } else if (block == Blocks.TRAPDOOR) {
            return !state.getValue(BlockTrapDoor.OPEN);
        } else if (block instanceof BlockFenceGate) {
            return !state.getValue(BlockFenceGate.OPEN);
        }
        return false;
    }

    // ------------------------------------------------------------------
    // R196 EntityAIDoorInteract :18-87 (the inlined base face)
    // ------------------------------------------------------------------

    private boolean findUsableDoor(BlockPos pos) {
        IBlockState state = this.entity.world.getBlockState(pos);
        Block block = state.getBlock();
        if (!isWoodenPortal(block)) {
            return false; // R196 :86
        }
        this.targetDoor = block; // R196 :86 (Block.blocksList[id] face)
        return true;
    }

    /** R196 :18-60. */
    private boolean doorInteractShouldExecute() {
        if (!this.entity.collidedHorizontally) { // R196 :19
            return false;
        }
        PathNavigate var1 = this.entity.getNavigator();
        Path var2 = var1.getPath();
        if (var2 != null && !var2.isFinished() && var1 instanceof PathNavigateGround
                && ((PathNavigateAccessor) var1).etim$getNodeProcessor().getCanOpenDoors()) { // R196 :25 — getCanBreakDoors（1.12 载体 = nodeProcessor.canOpenDoors，PathNavigateGround.setBreakDoors :319）
            for (int var3 = 0; var3 < Math.min(var2.getCurrentPathIndex() + 2, var2.getCurrentPathLength()); var3++) {
                PathPoint var4 = var2.getPathPointFromIndex(var3);
                this.doorPosition = new BlockPos(var4.x, var4.y + 1, var4.z); // R196 :28 (entityPosY = y+1)
                if (this.entity.getDistanceSq(this.doorPosition.getX(), this.entity.posY, this.doorPosition.getZ()) <= 2.25D
                        && this.findUsableDoor(this.doorPosition)) { // R196 :31-34
                    return true;
                }
                this.doorPosition = this.doorPosition.down(); // R196 :38 — the second Y level
                if (this.entity.getDistanceSq(this.doorPosition.getX(), this.entity.posY, this.doorPosition.getZ()) <= 2.25D
                        && this.findUsableDoor(this.doorPosition)) { // R196 :39-43
                    return true;
                }
            }
            // R196 :47-49 — the entity's own column, up then down
            this.doorPosition = new BlockPos(
                    MathHelper.floor(this.entity.posX),
                    MathHelper.floor(this.entity.posY + 1.0D),
                    MathHelper.floor(this.entity.posZ));
            if (!this.findUsableDoor(this.doorPosition)) { // R196 :51-53
                this.doorPosition = this.doorPosition.down();
                this.findUsableDoor(this.doorPosition);
            }
            return this.targetDoor != null; // R196 :56
        }
        return false;
    }

    @Override
    public boolean shouldExecute() {
        if (this.entity.world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return false; // the D-1 family-flag seat
        }
        if (ETIMConfig.mobDebugLog && (probeCounter = probeCounter + 1) % 16 == 0) { // 1-in-16 probe
            ETIM.LOGGER.info("[AILog] breakdoor src=zombie probe-in inv=" + probeCounter
                    + " flag=" + ETIMConfig.livestockNeedsR196
                    + " entity=" + this.entity.getClass().getSimpleName() + "#" + this.entity.getEntityId());
        }
        if (!this.doorInteractShouldExecute()) { // R196 :13-14 — the super gate
            return false;
        }
        if (this.targetDoor instanceof BlockFenceGate
                && !(this.entity.getAttackTarget() instanceof EntityPlayer)) { // R196 :16-17
            return false;
        }
        World world = this.entity.world;
        return world.getGameRules().getBoolean("mobGriefing") // R196 :19
                && isAClosedWoodenPortal(world, this.doorPosition); // R196 :20
    }

    @Override
    public void startExecuting() {
        this.hasStoppedDoorInteraction = false; // base :69
        this.entityPositionX = (float) ((double) ((float) this.doorPosition.getX() + 0.5F) - this.entity.posX);
        this.entityPositionZ = (float) ((double) ((float) this.doorPosition.getZ() + 0.5F) - this.entity.posZ);
        this.breakingTime = 0; // R196 :27
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] breakdoor src=zombie start target=" + this.targetDoor + "@" + this.doorPosition
                    + " ticks=" + getTicksToBreakPortal()
                    + " entity=" + this.entity.getClass().getSimpleName() + "#" + this.entity.getEntityId());
        }
    }

    /** R196 continueExecuting :31-36 — the closed-portal shape stays verified. */
    @Override
    public boolean shouldContinueExecuting() {
        double var1 = this.entity.getDistanceSq(this.doorPosition);
        return this.breakingTime <= this.getTicksToBreakPortal()
                && isAClosedWoodenPortal(this.entity.world, this.doorPosition)
                && var1 < 4.0D;
    }

    @Override
    public void resetTask() {
        this.entity.world.sendBlockBreakProgress(this.entity.getEntityId(), this.doorPosition, -1); // R196 :41
        this.previousBreakProgress = -1;
    }

    @Override
    public void updateTask() {
        float var1 = (float) ((double) ((float) this.doorPosition.getX() + 0.5F) - this.entity.posX);
        float var2 = (float) ((double) ((float) this.doorPosition.getZ() + 0.5F) - this.entity.posZ);
        float var3 = this.entityPositionX * var1 + this.entityPositionZ * var2;
        if (var3 < 0.0F) {
            this.hasStoppedDoorInteraction = true; // base :79-81
            return;
        }
        World world = this.entity.world;
        IBlockState state = world.getBlockState(this.doorPosition);
        if (this.entity.getRNG().nextInt(20) == 0) {
            // R196 :50/:51-59 — the 1010 id is a MITE sound (C-drop); 2001 is the
            // 1.12-shared break face, data = Block.getStateId (block+meta packed).
            world.playEvent(2001, this.doorPosition, Block.getStateId(state));
        }
        this.breakingTime += (int) (this.getStrVsTargetBlock() + 0.5F); // R196 :62
        int ticks_to_break_portal = this.getTicksToBreakPortal();
        if (this.breakingTime > ticks_to_break_portal) {
            this.breakingTime = ticks_to_break_portal; // R196 :64-66
        }
        int var5 = (int) ((float) this.breakingTime / (float) ticks_to_break_portal * 10.0F); // R196 :68
        if (var5 != this.previousBreakProgress) {
            world.sendBlockBreakProgress(this.entity.getEntityId(), this.doorPosition, var5); // R196 :70
            this.previousBreakProgress = var5;
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] breakdoor src=zombie progress stage=" + var5
                        + " ticks=" + this.breakingTime
                        + " entity=" + this.entity.getClass().getSimpleName() + "#" + this.entity.getEntityId());
            }
        }
        if (this.breakingTime == ticks_to_break_portal && world.getDifficulty() == EnumDifficulty.HARD) { // R196 :74
            if (state.getBlock() instanceof BlockDoor
                    && state.getValue(BlockDoor.HALF) == BlockDoor.EnumDoorHalf.UPPER) { // R196 :75-76
                world.setBlockToAir(this.doorPosition.down()); // (R196 layer arg 2 = 1.12 has no layer face)
            }
            world.setBlockToAir(this.doorPosition); // R196 :79
            world.playEvent(2001, this.doorPosition, Block.getStateId(state)); // R196 :81 (1012 = MITE id, C-drop)
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] breakdoor src=zombie break target=" + state.getBlock() + "@"
                        + this.doorPosition
                        + " entity=" + this.entity.getClass().getSimpleName() + "#" + this.entity.getEntityId());
            }
        }
    }

    /** R196 getTicksToBreakPortal :93-107 — door 1920 / else 480, frenzy halves. */
    private int getTicksToBreakPortal() {
        int ticks = this.targetDoor instanceof BlockDoor ? 1920 : 480;
        return ETIMDigging.isFrenzied(this.entity) ? ticks / 2 : ticks; // R196 :106
    }

    /** R196 getStrVsTargetBlock :109-122 — held-tool speed, floor 1.0. */
    private float getStrVsTargetBlock() {
        if (this.targetDoor == null) {
            return 0.0F;
        }
        ItemStack held = this.entity.getHeldItemMainhand();
        if (!held.isEmpty() && held.getItem() instanceof ItemTool) {
            IBlockState state = this.entity.world.getBlockState(this.doorPosition);
            return Math.max(((ItemTool) held.getItem()).getDestroySpeed(held, state), 1.0F);
        }
        return 1.0F;
    }
}
