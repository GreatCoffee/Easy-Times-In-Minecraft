package io.github.etim.etim.metal;

import java.util.Random;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
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

    // ------------------- underworld 二阶段 T6 (G-FB-10 转正, NB-03~08/NC-01) -------------------

    private static final int DIST_UW = 2; // underworld chooser (WorldGenMinable.java:252-263)

    /**
     * R196 BiomeDecorator.generateOres underworld branch :358-371 — the FULL
     * 11-row spread (D-16): gravel straight (the ×8 exempt :325-326),
     * adamantite ×2 on top of the ×8 (:327-329, net ×16), every row's
     * attempt gate nextInt(10)==0 (:333). Vein sizes :53-65; the underworld
     * height chooser :252-263 reads the offset through the B-2 single source
     * (provider instanceof ETIMWorldProviderUnderworld → getYOffset, the
     * 16+offset face — offset 120 → nextInt(136)); BlockOre rows take the
     * 75% low nibble, gravel/silverfish the flat nextInt(256);
     * must_be_supported = gravel-only (:125, unsupported = over-air-nothing).
     * Silverfish = the MONSTER_EGG stone variant (B2-10, one variant —
     * R196 has no variants).
     */
    public static void generateUnderworld(World world, Random random, BlockPos chunkPos) {
        genUnderworld(world, random, chunkPos, 300, Blocks.GRAVEL, 32, true);
        genUnderworld(world, random, chunkPos, 40, ETIMBlocks.ORE_COPPER, 6, true);
        genUnderworld(world, random, chunkPos, 10, ETIMBlocks.ORE_SILVER, 6, true);
        genUnderworld(world, random, chunkPos, 20, Blocks.GOLD_ORE, 4, true);
        genUnderworld(world, random, chunkPos, 60, Blocks.IRON_ORE, 6, true);
        genUnderworld(world, random, chunkPos, 10, ETIMBlocks.ORE_MITHRIL, 3, true);
        genUnderworld(world, random, chunkPos, 5, ETIMBlocks.ORE_ADAMANTIUM, 3, true); // ×16 net
        genUnderworld(world, random, chunkPos, 10, Blocks.REDSTONE_ORE, 5, true);
        genUnderworld(world, random, chunkPos, 5, Blocks.DIAMOND_ORE, 3, true);
        genUnderworld(world, random, chunkPos, 5, Blocks.LAPIS_ORE, 3, true);
        genUnderworld(world, random, chunkPos, 50, Blocks.MONSTER_EGG, 3, false); // no support face
    }

    private static void genUnderworld(World world, Random random, BlockPos chunkPos, int frequency, Block ore,
                                      int veinSize, boolean mustBeSupported) {
        int multiplier = 1;
        if (getUnderworldYOffset(world) != 0 && ore != Blocks.GRAVEL) {
            multiplier = 8; // BiomeDecorator.java:325-326
        }
        if (ore == ETIMBlocks.ORE_ADAMANTIUM) {
            multiplier *= 2; // BiomeDecorator.java:327-329
        }
        int rolls = frequency * multiplier;
        int veins = 0, originAborts = 0, placed = 0, rollCursor = rolls;
        while (rollCursor-- > 0) {
            if (random.nextInt(10) == 0) { // BiomeDecorator.java:333 attempt gate
                int x = chunkPos.getX() + random.nextInt(16);
                int y = getUnderworldVeinHeight(world, random, ore);
                int z = chunkPos.getZ() + random.nextInt(16);
                if (y >= 0) {
                    BlockPos origin = new BlockPos(x, y, z);
                    if (world.isBlockLoaded(origin) && world.getBlockState(origin).getBlock() != Blocks.STONE) {
                        originAborts++; // same abort face the overworld path counts
                    }
                    veins++;
                    placed += generateVeinUnderworld(world, random, origin, ore.getDefaultState(),
                            veinSize, mustBeSupported);
                }
            }
        }
        if (ETIMConfig.metalDebugLog) {
            String oreName = ore.getRegistryName().getPath();
            ETIM.LOGGER.info("[OreLog] ore=" + oreName + " dim=-2 chunk=(" + chunkPos.getX() + ","
                    + chunkPos.getZ() + ")" + " rolls=" + rolls + " veins=" + veins
                    + " origin-abort=" + originAborts + " grown=" + placed + " [server]");
        }
    }

    /** The B-2 single source: yOffset via the provider instance. */
    static int getUnderworldYOffset(World world) {
        if (world.provider instanceof io.github.etim.etim.world.ETIMWorldProviderUnderworld) {
            return ((io.github.etim.etim.world.ETIMWorldProviderUnderworld) world.provider).getYOffset();
        }
        return 0;
    }

    /** R196 WorldGenMinable.getRandomVeinHeight underworld branch :252-263. */
    private static int getUnderworldVeinHeight(World world, Random random, Block ore) {
        int offset = getUnderworldYOffset(world);
        if (offset != 0) {
            if (ore == ETIMBlocks.ORE_ADAMANTIUM) {
                return random.nextInt(16 + offset);
            }
            boolean isOreCarrier = ore instanceof ETIMBlockOre
                    || ore == Blocks.GOLD_ORE || ore == Blocks.IRON_ORE
                    || ore == Blocks.REDSTONE_ORE || ore == Blocks.DIAMOND_ORE || ore == Blocks.LAPIS_ORE;
            if (isOreCarrier && random.nextFloat() < 0.75F) {
                return random.nextInt(16 + offset);
            }
        }
        return random.nextInt(256);
    }

    /** R196 WorldGenMinable.generate :76-131 (replace-target = STONE, the
     * :96-123 small-vein chain verbatim) + :125 must_be_supported threading. */
    private static int generateVeinUnderworld(World world, Random random, BlockPos pos, IBlockState oreState,
                                              int veinSize, boolean mustBeSupported) {
        if (!world.isBlockLoaded(pos) || world.getBlockState(pos).getBlock() != Blocks.STONE) {
            return 0;
        }
        float scale = 1.0F;
        while (random.nextInt(2) == 0) {
            scale = scale * (random.nextFloat() * 0.6F + 0.7F);
        }
        scale = Math.min(scale, 4.0F);
        // vein_size_increases_with_depth = true (NC-01): underworld range 255
        int range = 255;
        float relativeHeight = (float) pos.getY() / range;
        scale *= 1.0F - relativeHeight + 0.5F;
        if (veinSize * scale <= 3.0F && random.nextInt(2) == 0) {
            if (random.nextInt(2) != 0) {
                return 0;
            }
            scale *= 2.0F;
        }
        int size = (int) (veinSize * scale);
        if (size < 1) {
            return 0;
        }
        if (size == 1) {
            if (random.nextInt(3) != 0) {
                return 0;
            }
            size = 3;
        } else if (size == 2) {
            if (random.nextInt(3) == 0) {
                return 0;
            }
            size = 3;
        } else if (size > 32) {
            size = 32;
        }
        return growVeinUnderworld(world, random, size, pos, oreState, mustBeSupported);
    }

    /** R196 WorldGenMinable.growVein :36-74 with the :38 support branch. */
    private static int growVeinUnderworld(World world, Random random, int blocksToGrow, BlockPos pos,
                                          IBlockState oreState, boolean mustBeSupported) {
        if (blocksToGrow < 1 || !world.isBlockLoaded(pos)
                || world.getBlockState(pos).getBlock() != Blocks.STONE) {
            return 0;
        }
        if (mustBeSupported && !isSupported(world, pos)) {
            return 0; // R196 :38 — the "air below" cell stays stone
        }
        // populate-time write: flags 2|16 = cut observer notification — a plain
        // markAndNotifyBlock during populate recurses through
        // observedNeighborChanged → provideChunk → populate (A-1 SOE, verdict
        // 2026-10-25); neighbors see the vein at first real update anyway.
        world.setBlockState(pos, oreState, 2 | 16);
        int blocksGrown = 1;
        for (int attempts = 0; attempts < 16 && blocksGrown < blocksToGrow; attempts++) {
            int axis = random.nextInt(3);
            int dx = axis == 0 ? (random.nextInt(2) == 0 ? -1 : 1) : 0;
            int dy = axis == 1 ? (random.nextInt(2) == 0 ? -1 : 1) : 0;
            int dz = axis == 2 ? (random.nextInt(2) == 0 ? -1 : 1) : 0;
            blocksGrown += growVeinUnderworld(world, random, blocksToGrow - blocksGrown,
                    pos.add(dx, dy, dz), oreState, mustBeSupported);
        }
        return blocksGrown;
    }

    /** R196 :38 support face — the cell below must not be air-or-passable. */
    private static boolean isSupported(World world, BlockPos pos) {
        if (pos.getY() < 1) {
            return false;
        }
        BlockPos below = pos.down();
        IBlockState s = world.getBlockState(below);
        boolean passable = s.getBlock().isAir(s, world, below) || !s.getMaterial().blocksMovement();
        // R196 isAirOrPassableBlock(x, y-1, z, true) semantics — 岩浆/水
        // 属 passable (liquids cannot carry the vein)... wait, 原义 = 液体
        // CONSIDERED passable成立与否的判读由验证窗 [OreLog] 网际重复出；
        // 这里的下限 = 非固体即不支撑（紧面）。
        return !passable;
    }


    private static void genMinable(World world, Random random, BlockPos chunkPos, int frequency, Block ore,
                                   int veinSize, int maxHeight, int distribution, boolean veinGrowsWithDepth) {
        IBlockState oreState = ore.getDefaultState();
        // B-1(b) verdict instrumentation: per-chunk aggregate counts so the
        // copper judge band is re-derived from LOGS (the naive freq/10 ×
        // vein-width expectation ignores the R196 :77 origin-stone abort
        // face). Counters only — zero behavior change.
        int veins = 0, originAborts = 0, placed = 0;
        int rolls = frequency;
        while (frequency-- > 0) {
            if (random.nextInt(10) == 0) {
                int x = chunkPos.getX() + random.nextInt(16);
                int y = getRandomVeinHeight(random, maxHeight, distribution);
                int z = chunkPos.getZ() + random.nextInt(16);
                if (y >= 0) {
                    BlockPos origin = new BlockPos(x, y, z);
                    if (world.isBlockLoaded(origin) && world.getBlockState(origin).getBlock() != Blocks.STONE) {
                        // same face generateVein aborts on — counted before the call
                        originAborts++;
                    }
                    veins++;
                    placed += generateVein(world, random, origin, oreState, veinSize, veinGrowsWithDepth, maxHeight);
                }
            }
        }
        if (ETIMConfig.metalDebugLog) {
            String oreName = ore.getRegistryName().getPath();
            ETIM.LOGGER.info("[OreLog] ore=" + oreName + " chunk=(" + chunkPos.getX() + "," + chunkPos.getZ() + ")"
                    + " rolls=" + rolls + " veins=" + veins + " origin-abort=" + originAborts
                    + " grown=" + placed + " [server]");
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

    /** R196 WorldGenMinable.generate(world, rand, x, y, z, vein_size_increases_with_depth) :76-131. Returns the blocks placed (0 = aborted, origin not stone or the :96-123 small-vein chain). */
    private static int generateVein(World world, Random random, BlockPos pos, IBlockState oreState,
                                    int veinSize, boolean veinGrowsWithDepth, int maxHeight) {
        if (!world.isBlockLoaded(pos) || world.getBlockState(pos).getBlock() != Blocks.STONE) {
            return 0;
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
                return 0;
            }
            scale *= 2.0F;
        }
        int size = (int) (veinSize * scale);
        if (size < 1) {
            return 0;
        }
        if (size == 1) {
            if (random.nextInt(3) != 0) {
                return 0;
            }
            size = 3;
        } else if (size == 2) {
            if (random.nextInt(3) == 0) {
                return 0;
            }
            size = 3;
        } else if (size > 32) {
            size = 32;
        }
        return growVein(world, random, size, pos, oreState);
    }

    /** R196 WorldGenMinable.growVein :36-74 (must_be_supported/is_dirt false for ores, :125-126). */
    private static int growVein(World world, Random random, int blocksToGrow, BlockPos pos, IBlockState oreState) {
        if (blocksToGrow >= 1 && world.isBlockLoaded(pos) && world.getBlockState(pos).getBlock() == Blocks.STONE) {
            // populate-time write: 2|16 — same A-1 face as growVeinUnderworld
            // (dim0 cascade WARN, C-8).
            world.setBlockState(pos, oreState, 2 | 16);
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
