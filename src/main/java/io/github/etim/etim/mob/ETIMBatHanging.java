package io.github.etim.etim.mob;

import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.passive.EntityBat;
import net.minecraft.init.Blocks;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;

/**
 * B-53 census D :288 — the R196 bat hang geometry
 * ({@code EntityBat.java:153-193}). R196 keeps the hanging block's Y in a
 * datawatcher short and pins the bat's Y to
 * {@code blockY - height - 0.00625}; the 1.12 carrier stores the same Y in
 * the mixin's server-side field (position sync makes the client stick to the
 * same block, C-level note).
 *
 * <p>The 1.12 vanilla only accepts a normal cube directly above the bat.
 * R196 instead requires a non-glass solid standard-form cube whose bottom
 * face is solid, with air directly below it, and snapshots the Y from
 * {@code (int)(posY + 0.12 + height)}.</p>
 */
public final class ETIMBatHanging {

    public static final double HANG_OFFSET = 0.00625D; // R196 normal bat
    public static final double UNHANG_OFFSET = 0.01D;  // R196 release drop
    public static final int TAKEOFF_EVENT = 1015;

    private ETIMBatHanging() {
    }

    /** R196 canHangFromBlock :153-168; the giant branch has no 1.12 carrier. */
    public static boolean canHangFromBlock(EntityBat bat, BlockPos pos) {
        IBlockState state = bat.world.getBlockState(pos);
        if (state.getBlock() == Blocks.GLASS) {
            return false;
        }
        if (!state.isFullCube()) {
            return false;
        }
        if (!state.isSideSolid(bat.world, pos, EnumFacing.DOWN)) {
            return false;
        }
        return bat.world.isAirBlock(pos.down());
    }

    /** R196 getNewBlockHangingFromY :170-173; -1 = no valid ceiling. */
    public static int getNewBlockHangingFromY(EntityBat bat) {
        int y = hangingY(bat.posY, bat.height);
        BlockPos pos = new BlockPos(
                MathHelper.floor(bat.posX), y, MathHelper.floor(bat.posZ));
        return canHangFromBlock(bat, pos) ? y : -1;
    }

    /** The R196 ceiling snapshot {@code (int)(posY + 0.12 + height)}. */
    public static int hangingY(double posY, float height) {
        return MathHelper.floor(posY + 0.12D + (double) height);
    }

    /** The pinned Y for a hanging bat (block Y minus height minus 1/160). */
    public static double pinnedY(int blockY, float height) {
        return (double) blockY - (double) height - HANG_OFFSET;
    }

    /** The release Y for an unhanging bat (block Y minus height minus 1/100). */
    public static double unhangY(int blockY, float height) {
        return (double) blockY - (double) height - UNHANG_OFFSET;
    }

    /** R196 setHangingPosition :175-186. */
    public static void pin(EntityBat bat, int blockY) {
        bat.motionX = 0.0D;
        bat.motionY = 0.0D;
        bat.motionZ = 0.0D;
        bat.setPosition(bat.posX, pinnedY(blockY, bat.height), bat.posZ);
    }

    /** R196 updateAITasks release arm :209-215. */
    public static void unhang(EntityBat bat, int blockY) {
        bat.setIsBatHanging(false);
        bat.world.playEvent(null, TAKEOFF_EVENT, new BlockPos(bat), 0);
        if (blockY >= 0) {
            bat.setPosition(bat.posX, unhangY(blockY, bat.height), bat.posZ);
        }
    }

    /** R196 isPreventedFromHanging :188-193. */
    public static boolean isPrevented(EntityBat bat, int preventCountdown) {
        return preventCountdown > 0
                || bat.getAttackTarget() != null
                || bat.hurtResistantTime > 0
                || bat.world.getNearestPlayerNotCreative(bat, 4.0D) != null;
    }
}
