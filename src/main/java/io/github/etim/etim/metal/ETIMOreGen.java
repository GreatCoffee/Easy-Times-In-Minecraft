package io.github.etim.etim.metal;

import java.util.Random;

import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * The R196 main-world ore generation for the three ETIM ores, a verbatim
 * 1.12 port of R196 BiomeDecorator.genMinable :318-342 + WorldGenMinable
 * generate :76-131 / growVein :36-74 / getRandomVeinHeight :250-326.
 *
 * <ul>
 *   <li>Frequency gate :332-333: one {@code nextInt(10) == 0} roll PER
 *       attempted vein — expected veins/chunk = frequency ÷ 10 (copper 40 →
 *       4, silver 10 → 1, mithril 10 → 1).</li>
 *   <li>Height bands (getMaxVeinHeight :152-170, min 0 :210-228): copper
 *       0-128, silver 0-96, mithril 0-32; y = (int)(relative × (max+1)).</li>
 *   <li>Height distributions :278-305: copper = 50/50 mix of the direct
 *       0.4-1.0 band and the {@code do { r1 } while (!(r1 < r2))} low-biased
 *       rejection draw; silver/mithril = the rejection draw alone.</li>
 *   <li>Vein walk :36-74: 16-attempt ±1-axis recursive growth replacing
 *       STONE only; vein sizes 6/6/3 (BiomeDecorator :56-60); the
 *       vein_size_increases_with_depth scale :83-107 (deeper = bigger veins);
 *       the small-vein abort/resize chain :96-123.</li>
 *   <li>Adamantium generates NOWHERE here (R196 :345-357 — the overworld
 *       branch never calls adamantiteGen; stage 7 brings the underworld
 *       face).</li>
 * </ul>
 */
public final class ETIMOreGen {

    private static final int DIST_COPPER_MIXED = 0;
    private static final int DIST_LOW_BIASED = 1;

    /**
     * R196 generateOres :344-357 overworld branch — ONLY the three ETIM rows;
     * every vanilla row keeps the vanilla 1.12 decorator untouched.
     */
    public static void generateOverworld(World world, Random random, BlockPos chunkPos) {
        genMinable(world, random, chunkPos, 40, ETIMBlocks.ORE_COPPER, 6, 128, DIST_COPPER_MIXED, true);
        genMinable(world, random, chunkPos, 10, ETIMBlocks.ORE_SILVER, 6, 96, DIST_LOW_BIASED, true);
        genMinable(world, random, chunkPos, 10, ETIMBlocks.ORE_MITHRIL, 3, 32, DIST_LOW_BIASED, true);
    }

    private static void genMinable(World world, Random random, BlockPos chunkPos, int frequency, Block ore,
                                   int veinSize, int maxHeight, int distribution, boolean veinGrowsWithDepth) {
        IBlockState oreState = ore.getDefaultState();
        while (frequency-- > 0) {
            if (random.nextInt(10) == 0) {
                int x = chunkPos.getX() + random.nextInt(16);
                int y = getRandomVeinHeight(random, maxHeight, distribution);
                int z = chunkPos.getZ() + random.nextInt(16);
                if (y >= 0) {
                    generateVein(world, random, new BlockPos(x, y, z), oreState, veinSize, veinGrowsWithDepth, maxHeight);
                }
            }
        }
    }

    /** R196 WorldGenMinable.getRandomVeinHeight overworld half :264-326 (min height 0). */
    private static int getRandomVeinHeight(Random random, int maxHeight, int distribution) {
        float relativeHeight;
        if (distribution == DIST_COPPER_MIXED) {
            if (random.nextInt(2) == 0) {
                relativeHeight = random.nextFloat() * 0.6F + 0.4F;
            } else {
                do {
                    relativeHeight = random.nextFloat();
                } while (!(relativeHeight < random.nextFloat()));
            }
        } else {
            do {
                relativeHeight = random.nextFloat();
            } while (!(relativeHeight < random.nextFloat()));
        }
        // min_height 0 (R196 :210-228) → y = min + (int)(relative × (max − min + 1))
        return (int) (relativeHeight * (maxHeight + 1));
    }

    /** R196 WorldGenMinable.generate(world, rand, x, y, z, vein_size_increases_with_depth) :76-131. */
    private static void generateVein(World world, Random random, BlockPos pos, IBlockState oreState,
                                     int veinSize, boolean veinGrowsWithDepth, int maxHeight) {
        if (!world.isBlockLoaded(pos) || world.getBlockState(pos).getBlock() != Blocks.STONE) {
            return;
        }
        float scale = 1.0F;
        while (random.nextInt(2) == 0) {
            scale = scale * (random.nextFloat() * 0.6F + 0.7F);
        }
        scale = Math.min(scale, 4.0F);
        if (veinGrowsWithDepth) {
            int range = maxHeight; // max − min(0)
            if (range > 16) {
                float relativeHeight = (float) pos.getY() / range;
                scale *= 1.0F - relativeHeight + 0.5F;
            }
        }
        if (veinSize * scale <= 3.0F && random.nextInt(2) == 0) {
            if (random.nextInt(2) != 0) {
                return;
            }
            scale *= 2.0F;
        }
        int size = (int) (veinSize * scale);
        if (size < 1) {
            return;
        }
        if (size == 1) {
            if (random.nextInt(3) != 0) {
                return;
            }
            size = 3;
        } else if (size == 2) {
            if (random.nextInt(3) == 0) {
                return;
            }
            size = 3;
        } else if (size > 32) {
            size = 32;
        }
        growVein(world, random, size, pos, oreState);
    }

    /** R196 WorldGenMinable.growVein :36-74 (must_be_supported/is_dirt false for ores, :125-126). */
    private static int growVein(World world, Random random, int blocksToGrow, BlockPos pos, IBlockState oreState) {
        if (blocksToGrow >= 1 && world.isBlockLoaded(pos) && world.getBlockState(pos).getBlock() == Blocks.STONE) {
            world.setBlockState(pos, oreState, 2);
            int blocksGrown = 1;
            for (int attempts = 0; attempts < 16 && blocksGrown < blocksToGrow; attempts++) {
                int axis = random.nextInt(3);
                int dx = axis == 0 ? (random.nextInt(2) == 0 ? -1 : 1) : 0;
                int dy = axis == 1 ? (random.nextInt(2) == 0 ? -1 : 1) : 0;
                int dz = axis == 2 ? (random.nextInt(2) == 0 ? -1 : 1) : 0;
                blocksGrown += growVein(world, random, blocksToGrow - blocksGrown, pos.add(dx, dy, dz), oreState);
            }
            return blocksGrown;
        }
        return 0;
    }

    private ETIMOreGen() {
    }
}
