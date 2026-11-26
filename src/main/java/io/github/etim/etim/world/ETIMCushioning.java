package io.github.etim.etim.world;

import net.minecraft.block.Block;
import net.minecraft.block.BlockSnow;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * R196 {@code Block.java:2575-2582} — per-block cushioning (census F :85).
 *
 * <p>R196 table (field {@code cushioning}, default 0.0F):</p>
 * <ul>
 *   <li>sand 0.4 ({@code Block.java:97}), sponge 1.0 (:130), bed 0.6 (:164),
 *       tall grass 0.2 (:182), cloth 0.8 (:195), hay 0.4 (BlockHay:7),
 *       leaves 0.8 (BlockLeaves:23), snow block 0.8 (BlockSnowBlock:11),
 *       farmland 0.4 (BlockFarmland:13), mushroom cap 0.4
 *       (BlockMushroomCap:13), soul sand 0.4 (BlockSoulSand:7),
 *       dirt/grass/crops/sapling/dead bush 0.2
 *       (BlockDirt:7 / BlockGrass:14 / BlockCrops:21 / BlockSapling:19 /
 *       BlockDeadBush:13).</li>
 *   <li>snow layer = {@code 0.2F * depth} (BlockSnow:114), depth 1..8.</li>
 * </ul>
 *
 * <p>R196 composition ({@code EntityLivingBase.java:1010-1057}): the resting
 * block contributes its own value; a snow/craftedSnow resting block also adds
 * the block below it (or 1.0F when there is none); the block one step above
 * the feet adds its value on top; the sum is clamped to 1.0F.</p>
 */
public final class ETIMCushioning {

    private ETIMCushioning() {
    }

    /** R196 {@code Block.getCushioning(metadata)} for the 1.12 carriers. */
    public static float of(IBlockState state) {
        if (state == null) {
            return 0.0F;
        }
        Block block = state.getBlock();
        if (block == Blocks.SAND) {
            return 0.4F;
        }
        if (block == Blocks.SPONGE) {
            return 1.0F;
        }
        if (block == Blocks.BED) {
            return 0.6F;
        }
        if (block == Blocks.TALLGRASS) {
            return 0.2F;
        }
        if (block == Blocks.WOOL) {
            return 0.8F;
        }
        if (block == Blocks.HAY_BLOCK) {
            return 0.4F;
        }
        if (block == Blocks.LEAVES || block == Blocks.LEAVES2) {
            return 0.8F;
        }
        if (block == Blocks.SNOW) {
            return 0.8F;
        }
        if (block == Blocks.FARMLAND) {
            return 0.4F;
        }
        if (block == Blocks.BROWN_MUSHROOM_BLOCK || block == Blocks.RED_MUSHROOM_BLOCK) {
            return 0.4F;
        }
        if (block == Blocks.SOUL_SAND) {
            return 0.4F;
        }
        if (block == Blocks.DIRT || block == Blocks.GRASS) {
            return 0.2F;
        }
        if (block == Blocks.WHEAT || block == Blocks.CARROTS || block == Blocks.POTATOES
                || block == Blocks.BEETROOTS) {
            return 0.2F;
        }
        if (block == Blocks.SAPLING || block == Blocks.DEADBUSH) {
            return 0.2F;
        }
        if (block == Blocks.SNOW_LAYER) {
            int depth = state.getValue(BlockSnow.LAYERS);
            return 0.2F * depth;
        }
        return 0.0F;
    }

    /**
     * R196 {@code EntityLivingBase.getEstimatedFallDamage} cushioning block.
     *
     * @param resting the block the entity rests on (feet position, may be air)
     */
    public static float total(World world, BlockPos resting) {
        IBlockState base = world.getBlockState(resting);
        float cushioning = of(base);
        boolean snowLike = base.getMaterial() == Material.SNOW
                || base.getMaterial() == Material.CRAFTED_SNOW;
        float belowValue = 0.0F;
        if (snowLike) {
            BlockPos belowPos = resting.down();
            IBlockState below = world.getBlockState(belowPos);
            belowValue = below.getBlock().isAir(below, world, belowPos) ? 1.0F : of(below);
        }
        BlockPos abovePos = resting.up();
        IBlockState above = world.getBlockState(abovePos);
        float aboveValue = above.getBlock().isAir(above, world, abovePos) ? 0.0F : of(above);
        return compose(cushioning, snowLike, belowValue, aboveValue);
    }

    /**
     * Pure composition half of {@link #total(World, BlockPos)}: a snow-like
     * resting block adds the block below (1.0 when it is air, passed in as
     * {@code belowValue}); the block above the feet adds its own value
     * ({@code aboveValue}, 0 for air). The sum is clamped to 1.0.
     */
    public static float compose(float base, boolean snowLike, float belowValue, float aboveValue) {
        float sum = base + (snowLike ? belowValue : 0.0F) + aboveValue;
        return Math.min(sum, 1.0F);
    }
}
