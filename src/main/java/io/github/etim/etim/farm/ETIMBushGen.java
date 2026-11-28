package io.github.etim.etim.farm;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.event.terraingen.PopulateChunkEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * R196 berry-bush world generation (B-71, census F:125, A-B-71-7):
 * {@code BiomeDecorator.java:252-261} spawns {@code tenths=2} patches per
 * forest chunk at {@code 2/10 + (rand(10) < 2 ? 1 : 0)} — i.e. nothing most
 * chunks, one patch 20% of the time; {@code WorldGenPlants.java:13-49} then
 * runs 64 attempts around {@code (rand(16)+8, rand(128), rand(16)+8)} within
 * ±8 / ±4 / ±8, writes metadata 12 and stops after more than three placements
 * on an independent 1/3 roll.
 *
 * <p>The 1.12 seam is {@link PopulateChunkEvent.Post}; the RNG is the world's
 * (R196's decorator RNG is not the same stream — B-B-71-6 accepts a
 * statistical verdict). Placement goes through {@link ETIMBlockBush}'s own
 * gates (A-B-71-10): air + biome + open sky + legal soil — never a bare
 * {@code setBlock}, so a patch can no longer hang in the air.</p>
 */
public final class ETIMBushGen {

    /** R196 BiomeGenForest.java:12 {@code bush_gen = 2 tenths}. */
    private static final int PATCH_TENTHS = 2;
    /** R196 BlockBush.getPatchSize = 64 attempts per patch. */
    private static final int ATTEMPTS = 64;
    /** R196 WorldGenPlants:45 — after this many placements the 1/3 stop roll arms. */
    private static final int SETTLE_AFTER = 3;

    private ETIMBushGen() {
    }

    public static void register() {
        net.minecraftforge.common.MinecraftForge.EVENT_BUS.register(ETIMBushGen.class);
    }

    @SubscribeEvent
    public void onPopulate(PopulateChunkEvent.Post event) {
        generateChunk(event.getWorld(), event.getChunkX(), event.getChunkZ());
    }

    /**
     * One generation pass — the populate seam and the {@code /etest bushgen}
     * probe share this body. Returns the number of bushes placed.
     */
    public static int generateChunk(World world, int chunkX, int chunkZ) {
        if (!ETIMConfig.bushR196 || world.isRemote) {
            return 0;
        }
        BlockPos center = new BlockPos(chunkX * 16 + 8, 64, chunkZ * 16 + 8);
        if (!ETIMBlockBush.isBushBiome(world.getBiome(center))) {
            return 0;
        }
        int patches = patchesFor(world.rand);
        int placed = 0;
        BlockPos first = null;
        for (int patch = 0; patch < patches; patch++) {
            int originX = chunkX * 16 + world.rand.nextInt(16) + 8;
            int originY = world.rand.nextInt(128);
            int originZ = chunkZ * 16 + world.rand.nextInt(16) + 8;
            int count = 0;
            for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
                int x = originX + world.rand.nextInt(8) - world.rand.nextInt(8);
                int y = originY + world.rand.nextInt(4) - world.rand.nextInt(4);
                int z = originZ + world.rand.nextInt(8) - world.rand.nextInt(8);
                BlockPos pos = new BlockPos(x, y, z);
                if (!canOccurAt(world, pos)) {
                    continue;
                }
                world.setBlockState(pos, ETIMFarmBlocks.BUSH.getDefaultState()
                        .withProperty(ETIMBlockBush.GROWTH, ETIMBlockBush.MAX_GROWTH), 2);
                placed++;
                if (first == null) {
                    first = pos;
                }
                count++;
                if (count > SETTLE_AFTER && world.rand.nextInt(3) == 0) {
                    break;   // R196 :45 — the settle roll
                }
            }
        }
        ETIMFarm.bushRow("gen chunk=" + chunkX + "," + chunkZ
                + " biome=" + world.getBiome(center).getRegistryName()
                + " patches=" + patches + " placed=" + placed
                + " first=" + (first == null ? "none"
                        : first.getX() + "," + first.getY() + "," + first.getZ()));
        return placed;
    }

    /** R196 {@code BiomeDecorator:252-261}: tenths/10 plus the remainder roll. */
    public static int patchesFor(java.util.Random rand) {
        return PATCH_TENTHS / 10 + (rand.nextInt(10) < PATCH_TENTHS % 10 ? 1 : 0);
    }

    /** A-B-71-10: the five gates R196 {@code canOccurAt} composes. */
    private static boolean canOccurAt(World world, BlockPos pos) {
        if (!world.isAirBlock(pos)) {
            return false;
        }
        if (world.provider.isNether() && pos.getY() >= 127) {
            return false;   // R196 {@code !provider.hasNoSky || y < 127}
        }
        if (!ETIMFarmBlocks.BUSH.canPlaceBlockAt(world, pos)) {
            return false;   // replaceable + forest/forestHills + open sky + legal soil
        }
        return ETIMFarmBlocks.BUSH.canBlockStay(world, pos, ETIMFarmBlocks.BUSH.getDefaultState());
    }
}
