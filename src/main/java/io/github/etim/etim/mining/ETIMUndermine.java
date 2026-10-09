package io.github.etim.etim.mining;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import net.minecraft.block.BlockFalling;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.item.EntityFallingBlock;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.event.world.BlockEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Undermining (ToolSuite 终审 §四; only dirt/soulsand in R196).
 *
 * <p>R196 mechanism, faithfully split into three rings:</p>
 * <ul>
 * <li><b>Dig ring (immediate)</b>: a successful dig calls
 * {@code onUnderminedByPlayer} on the above + four horizontal neighbours
 * (ItemInWorldManager.java:187-202) — every hit tries
 * {@code tryToFall} the SAME tick, no delay.</li>
 * <li><b>Fall gate</b>: {@code tryToFall} fails while the block below cannot
 * be passed through (BlockFalling.java tryToFall) — the collapse chain
 * STOPS on grounded dirt everywhere. No cascade without support removal.
 * Creative diggers never trigger the dig ring (audit :196).</li>
 * <li><b>Chain ring (+2 ticks)</b>: after a block actually falls, its four
 * horizontal neighbours (BlockUnderminable.onUnderminedByPlayer) and its
 * above neighbour (BlockFalling entity branch) are scheduled via
 * {@code scheduleUndermine} = bit set + scheduleBlockUpdate(tickRate=2),
 * so each further ring waits the 2-tick fall period.</li>
 * <li><b>Placement ring</b>: R196 onBlockPlacedMITE (BlockUnderminable
 * .java:84-88) — a PLAYER-placed underminable block with no support below
 * falls at once. No creative exemption (the placement path has no
 * isCreativeMode check, unlike the dig path). Dispensers are exempt
 * (placer must be an EntityPlayer).</li>
 * </ul>
 *
 * <p>v1 scope note: the walking-trigger (onEntityWalking /
 * onEntityCollidedWithBlock) is not ported yet.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class ETIMUndermine {

    private static final Set<String> UNDERMINABLE = new HashSet<>(Arrays.asList("dirt", "soulsand"));

    /** R196 fall period: BlockFalling.tickRate = 2 ticks. */
    private static final int FALL_DELAY = 2;

    /** Dig-time scan plane: above + four horizontal (ItemInWorldManager.java:187-202). */
    private static final EnumFacing[] DIG_PLANE = {EnumFacing.UP, EnumFacing.NORTH,
            EnumFacing.SOUTH, EnumFacing.EAST, EnumFacing.WEST};

    /** Post-fall chain plane: four horizontal (BlockUnderminable.onUnderminedByPlayer). */
    private static final EnumFacing[] FALL_PLANE = {EnumFacing.NORTH,
            EnumFacing.SOUTH, EnumFacing.EAST, EnumFacing.WEST};

    private static final Deque<Scheduled> QUEUE = new ArrayDeque<>();

    /** Positions already queued (dimension:blockPos), so re-scheduled blocks are not queued twice. */
    private static final Set<String> QUEUED = new HashSet<>();

    private ETIMUndermine() {
    }

    private static final class Scheduled {
        final World world;
        final BlockPos pos;
        int ticksToFall = FALL_DELAY;

        Scheduled(World world, BlockPos pos) {
            this.world = world;
            this.pos = pos;
        }
    }

    /** Called from the dig post-harvest hook; the dig ring falls immediately. */
    public static void undermineAround(World world, BlockPos brokenPos, EntityPlayer breaker) {
        if (breaker != null && breaker.capabilities.isCreativeMode) {
            return;
        }
        for (EnumFacing face : DIG_PLANE) {
            attemptUndermine(world, brokenPos.offset(face));
        }
    }

    /**
     * R196 onBlockPlacedMITE (BlockUnderminable.java:84-88): a PLAYER-placed
     * dirt/soulsand without support below falls immediately. No creative
     * exemption here (that check exists only in the dig path). No chain
     * scheduling — R196's placement path only calls tryToFall.
     * <p>BlockEvent.PlaceEvent only fires for the entity-player ItemBlock
     * placement funnel, which matches R196's {@code placer instanceof
     * EntityPlayer} gate (dispenser placement is exempt in R196).</p>
     */
    @SubscribeEvent
    public static void onPlaced(BlockEvent.PlaceEvent event) {
        World world = event.getWorld();
        BlockPos pos = event.getPos();
        if (world.isRemote || !ETIMConfig.miningReform) {
            return;
        }
        if (!isUnderminable(world.getBlockState(pos))) {
            return;
        }
        if (!BlockFalling.canFallThrough(world.getBlockState(pos.down()))) {
            return;
        }
        IBlockState state = world.getBlockState(pos);
        // Same spawn contract as attemptUndermine: leave the block in place,
        // the falling entity's first tick clears its own cell.
        world.spawnEntity(new EntityFallingBlock(world,
                pos.getX() + 0.5D, pos.getY(), pos.getZ() + 0.5D, state));
    }

    /** R196 onUnderminedByPlayer → tryToFall: fall only when the support below lets go. */
    private static void attemptUndermine(World world, BlockPos pos) {
        if (!isUnderminable(world.getBlockState(pos))) {
            return;
        }
        if (!BlockFalling.canFallThrough(world.getBlockState(pos.down()))) {
            return;
        }
        IBlockState state = world.getBlockState(pos);
        // Spawn contract (R196 BlockFalling.tryToFall :54-66 entity path never
        // touches the block): the entity verifies on ITS first tick that its
        // cell still holds the block (EntityFallingSand.java:109-116) and
        // clears it then. Clearing first kills the entity instantly.
        world.spawnEntity(new EntityFallingBlock(world,
                pos.getX() + 0.5D, pos.getY(), pos.getZ() + 0.5D, state));
        for (EnumFacing face : FALL_PLANE) {
            scheduleChain(world, pos.offset(face));
        }
        // The above neighbour, scheduled by BlockFalling's entity branch.
        scheduleChain(world, pos.up());
    }

    /** R196 scheduleUndermine: a bit set + scheduleBlockUpdate(tickRate=2), here as a 2-tick queue entry. */
    private static void scheduleChain(World world, BlockPos pos) {
        if (isUnderminable(world.getBlockState(pos)) && QUEUED.add(key(world, pos))) {
            QUEUE.add(new Scheduled(world, pos));
        }
    }

    private static String key(World world, BlockPos pos) {
        return world.provider.getDimension() + ":" + pos;
    }

    private static boolean isUnderminable(IBlockState state) {
        return UNDERMINABLE.contains(state.getBlock().getRegistryName().getPath());
    }

    @SubscribeEvent
    public static void onServerTick(TickEvent.ServerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || QUEUE.isEmpty()) {
            return;
        }
        List<Scheduled> batch = new ArrayList<>(QUEUE);
        QUEUE.clear();
        for (Scheduled scheduled : batch) {
            if (--scheduled.ticksToFall > 0) {
                QUEUE.add(scheduled);
                continue;
            }
            QUEUED.remove(key(scheduled.world, scheduled.pos));
            attemptUndermine(scheduled.world, scheduled.pos);
        }
    }
}
