package io.github.etim.etim.world;

import java.util.Random;

import net.minecraft.block.Block;
import net.minecraft.block.BlockFire;
import net.minecraft.block.SoundType;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.EnumBlockRenderType;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMBlocks;

/**
 * R196 {@code BlockSpark} (census F :126, {@code BlockSpark.java:1-53}) — the
 * invisible two-tick carrier the flint drops before it becomes fire.
 *
 * <p>R196 shape kept verbatim:</p>
 * <ul>
 *   <li>{@code onBlockAdded} ({@code :22-26}): try the portal first; on
 *       failure schedule the block itself two ticks out.</li>
 *   <li>{@code updateTick} ({@code :29-37}): six-neighbour fuel test plus the
 *       netherrack-below exception; snuff to air, else become fire.</li>
 *   <li>Registration ({@code Block.java:917-923}): hardness 0, light 1.0,
 *       wood footstep, statistics off, {@code invisible} texture.</li>
 * </ul>
 *
 * <p>1.12 deltas: {@code BlockFire.neighborChanged} pops a fire cell that has
 * neither a top-solid floor nor a flammable neighbour ({@code
 * block/BlockFire.java:389-395}); R196 spark has no such arm, so the hook is
 * emptied here — the two-tick schedule is the only exit. {@code
 * canPlaceBlockAt} is likewise forced open ({@code :379-382} would reject a
 * spark in a portal cavity whose floor is obsidian-on-air). The portal call
 * is direct because 1.12's {@code trySpawnPortal} redirect lives in
 * {@code MixinBlockFire}, and a subclass override never re-enters it.</p>
 */
public class ETIMBlockSpark extends BlockFire {

    public ETIMBlockSpark() {
        this.setRegistryName("spark");
        this.setTranslationKey("etim.spark");
        this.setHardness(0.0F);
        this.setLightLevel(1.0F);
        this.setSoundType(SoundType.WOOD);
        this.setTickRandomly(true);
        this.disableStats();
    }

    /** R196 spark renders the invisible texture ({@code Block.java:922}). */
    @Override
    public EnumBlockRenderType getRenderType(IBlockState state) {
        return EnumBlockRenderType.INVISIBLE;
    }

    /** R196 has no placement legality test — the tick decides. */
    @Override
    public boolean canPlaceBlockAt(World world, BlockPos pos) {
        return true;
    }

    /** 1.12-only pop arm ({@code BlockFire.java:389-395}); R196 has none. */
    @Override
    public void neighborChanged(IBlockState state, World world, BlockPos pos, Block block, BlockPos fromPos) {
    }

    /** R196 {@code BlockSpark.java:21-27}. */
    @Override
    public void onBlockAdded(World world, BlockPos pos, IBlockState state) {
        boolean portal = ETIMBlocks.PORTAL.tryToCreatePortal(world, pos);
        if (!portal) {
            world.scheduleUpdate(pos, this, 2);
        }
        if (ETIMConfig.blockDebugLog) {
            ETIM.LOGGER.info("[SparkLog] added pos={},{},{} portal={} update={} [server]",
                    pos.getX(), pos.getY(), pos.getZ(), portal, portal ? 0 : 2);
        }
    }

    /** R196 {@code BlockSpark.java:30-52}. */
    @Override
    public void updateTick(World world, BlockPos pos, IBlockState state, Random rand) {
        boolean fuel = canNeighborBurn(world, pos)
                || world.getBlockState(pos.down()).getBlock() == Blocks.NETHERRACK;
        if (!fuel) {
            world.setBlockToAir(pos);
            if (ETIMConfig.blockDebugLog) {
                ETIM.LOGGER.info("[SparkLog] tick kind=snuff pos={},{},{} fuel=false [server]",
                        pos.getX(), pos.getY(), pos.getZ());
            }
            return;
        }
        world.setBlockState(pos, Blocks.FIRE.getDefaultState(), 3);
        if (ETIMConfig.blockDebugLog) {
            ETIM.LOGGER.info("[SparkLog] tick kind=ignite pos={},{},{} fuel=true [server]",
                    pos.getX(), pos.getY(), pos.getZ());
        }
    }

    /**
     * R196 {@code Block.canNeighborBurn} ({@code BlockFire.java:222-238}): the
     * six axis neighbours, each asked with the face that looks back at this
     * cell. 1.12 exposes {@code canCatchFire(IBlockAccess, BlockPos,
     * EnumFacing)} but keeps {@code canNeighborCatchFire} private
     * ({@code block/BlockFire.java:326}), so the loop lives here.
     *
     * <p>Netherrack counts as fuel on <em>every</em> neighbour side, not only
     * underneath: the updater below is the one that adds the
     * "block underneath is netherrack" case ({@code BlockSpark.java:38}).</p>
     */
    public static boolean canNeighborBurn(World world, BlockPos pos) {
        BlockFire fire = (BlockFire) Blocks.FIRE;
        for (EnumFacing facing : EnumFacing.values()) {
            BlockPos neighbour = pos.offset(facing);
            if (fire.canCatchFire(world, neighbour, facing.getOpposite())
                    || world.getBlockState(neighbour).getBlock() == Blocks.NETHERRACK) {
                return true;
            }
        }
        return false;
    }
}
