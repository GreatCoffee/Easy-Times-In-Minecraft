package io.github.etim.etim.world;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMSpawnTables;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.biome.Biome;
import net.minecraft.world.gen.feature.WorldGenBigMushroom;

/**
 * R196 {@code BiomeGenUnderworld.java:1-66} port (M3 组, D-5/D-8 裁定).
 *
 * <ul>
 *   <li>Registration (M3-01): id <b>40</b> (R196's 26 collides with
 *       1.12's cold_beach — A-4/E 判), name {@code etim:underworld}, temp
 *       1.0F / rain 0.0F / rain disabled (R196 :setDisableRain + 1.0F/0.0F).</li>
 *   <li>Spawn pool (M3-02/03/04): the R196 constructor removes
 *       Skeleton/Zombie/Ghoul/Revenant/BoneLord (Ghoul has no ETIM carrier —
 *       C-11) and adds CaveSpider 40(1,2) / Longdead 40(1,2) / AncientBoneLord
 *       5(1,1). The ETIM face rides {@link ETIMSpawnTables#registerUnderworld}
 *       — one shared list factory for both the {@link Biome} list and the
 *       authoritative spawn table (9 rows = BASE−4+3).</li>
 *   <li>decorate (M3-07): <b>only</b> {@code placeMycelium} this batch — the
 *       R196 {@code super.decorate} half rides M4-06~12 (后置, B-6).</li>
 * </ul>
 */
public class ETIMBiomeUnderworld extends Biome {

    public static ETIMBiomeUnderworld INSTANCE;

    private static WorldGenBigMushroom bigMushroomGen = new WorldGenBigMushroom(); // R196 :51 theBiomeDecorator.bigMushroomGen

    public ETIMBiomeUnderworld() {
        super(new BiomeProperties("Underworld")
                .setTemperature(1.0F)
                .setRainfall(0.0F)
                .setRainDisabled()); // R196 setDisableRain
        // M3-02/03 — the biome's own list mirrors the authoritative table
        // (the vanilla spawner face reads it when mobSpawnR196 is off).
        this.spawnableMonsterList.clear();
        this.spawnableMonsterList.addAll(ETIMUnderworldSpawns.monsterList());
    }

    /**
     * M3-01 — register via the Forge registry-event face (the direct
     * {@code Biome.registerBiome} face hits the locked vanilla registry in
     * mod preInit). The Forge registry's id allocation = the first free slot
     * ({@code availabilityMap.nextClearBit(0)} — vanilla holds 0-39, so the
     * custom row lands on <b>40</b>, D-5 裁定). The event fires during the
     * mod registry stage, BEFORE the preInit handlers run — the provider's
     * BiomeProviderSingle reads the INSTANCE at world creation.
     */
    @net.minecraftforge.fml.common.Mod.EventBusSubscriber(modid = ETIM.MOD_ID)
    private static class Registration {
        @net.minecraftforge.fml.common.eventhandler.SubscribeEvent
        public static void onBiomeRegister(net.minecraftforge.event.RegistryEvent.Register<Biome> event) {
            INSTANCE = new ETIMBiomeUnderworld();
            INSTANCE.setRegistryName(new net.minecraft.util.ResourceLocation(ETIM.MOD_ID, "underworld"));
            event.getRegistry().register(INSTANCE);
            ETIMDimensions.dimLog("biome id=" + Biome.getIdForBiome(INSTANCE) + " name=etim:underworld");
            ETIMSpawnTables.registerUnderworld(INSTANCE);
        }
    }

    // ------------------------------------------------------------------
    // M3-07 — decorate = placeMycelium only (B-6)
    // ------------------------------------------------------------------

    @Override
    public void decorate(World world, Random random, BlockPos pos) {
        this.placeMycelium(world, pos.getX(), pos.getZ());
    }

    /**
     * R196 {@code BiomeGenUnderworld.placeMycelium :25-65}, verbatim. The
     * {@code had_naturally_occurring_mycelium} chunk flag is NOT ported
     * (write-only data, C-3/C-7).
     */
    private void placeMycelium(World world, int chunkOriginX, int chunkOriginZ) {
        ETIMChunkPostField myceliumPosts = myceliumField(world);
        Random random = new Random();
        int placed = 0;

        for (int x = chunkOriginX; x < chunkOriginX + 16; x++) {
            for (int z = chunkOriginZ; z < chunkOriginZ + 16; z++) {
                List<ETIMChunkPost> posts = myceliumPosts.getNearbyPostsForBlockCoords(x, z);

                // A-UW-1 hardening: iterate a snapshot so a nested decorate
                // (WorldGenBigMushroom pulling a neighbour chunk) can never mutate
                // under the iterator, even if the field rebuilds mid-loop.
                for (ETIMChunkPost post : new ArrayList<>(posts)) {
                    if (post.getDistanceSqFromBlockCoords(x, z)
                            > myceliumPosts.getPostMaxRadiusOfEffectSq() + 4) {
                        continue; // :35 — R196's negated guard, kept in shape
                    }
                    random.setSeed(post.getSeed()); // :36-37
                    random.nextInt();
                    int y = random.nextInt(random.nextBoolean() ? 16 : 72) + 24; // :38
                    y += underworldYOffset(world); // :39 — the provider-carried offset (B-2)
                    int height = random.nextInt(5) + 1; // :40

                    for (int dy = 0; dy < height; dy++) {
                        BlockPos pos = new BlockPos(x, y, z);
                        BlockPos above = new BlockPos(x, y + 1, z);
                        if (world.isAirBlock(above)) { // :43
                            IBlockState ground = world.getBlockState(pos);
                            IBlockState below = world.getBlockState(new BlockPos(x, y - 1, z));
                            // :44-47 — a solid opaque standard-form cube that is
                            // not a mushroom cap, sitting on the same → mycelium.
                            if (isSolidOpaqueStandardCube(ground) && ground.getBlock() != Blocks.RED_MUSHROOM_BLOCK
                                    && ground.getBlock() != Blocks.BROWN_MUSHROOM_BLOCK
                                    && isSolidOpaqueStandardCube(below)
                                    && world.setBlockState(pos, Blocks.MYCELIUM.getDefaultState(), 2)) {
                                placed++;
                                // :49-53 — the big-mushroom face (1/16, brown fallback).
                                random.setSeed(post.getSeed() + getIntPairHash(x, z)); // :49-50
                                random.nextInt();
                                if (random.nextInt(16) == 0 && !bigMushroomGen.generate(world, random, above)) {
                                    world.setBlockState(above, Blocks.BROWN_MUSHROOM.getDefaultState(), 2);
                                }
                            }
                            break;
                        }

                        y++;
                    }
                }
            }
        }

        if (ETIMConfig.underworldDebugLog && placed > 0) {
            ETIMDimensions.dimLog("mycelium placed=" + placed
                    + " chunk=(" + chunkOriginX + "," + chunkOriginZ + ")");
        }
    }

    private static boolean isSolidOpaqueStandardCube(IBlockState state) {
        // R196 isAlwaysSolidOpaqueStandardFormCube ≈ 1.12 normal cube + opaque
        return state.isBlockNormalCube() && state.isOpaqueCube();
    }

    private static int underworldYOffset(World world) {
        return world.provider instanceof ETIMWorldProviderUnderworld
                ? ((ETIMWorldProviderUnderworld) world.provider).getYOffset() : 0;
    }

    /**
     * R196 {@code World.getMyceliumPostField} — the per-server face, keyed by
     * seed: {@code new ChunkPostField(1, hashedSeed, 24, 0.0625F)} (R196
     * World.java:281).
     */
    private static ETIMChunkPostField myceliumField(World world) {
        long seed = world.getSeed();
        if (myceliumField == null || myceliumFieldSeed != seed) {
            myceliumFieldSeed = seed;
            myceliumField = new ETIMChunkPostField(ETIMChunkPostField.TYPE_UNDERWORLD_MYCELIUM,
                    ETIMChunkGeneratorUnderworld.hashedWorldSeed(seed), 24, 0.0625F);
        }
        return myceliumField;
    }

    private static ETIMChunkPostField myceliumField;
    private static long myceliumFieldSeed;

    // R196 MathHelper.getIntPairHash (MathHelper.java:317-321).
    private static int getIntPairHash(int x, int z) {
        int hash = 17;
        hash = hash * 31 + x;
        return hash * 31 + z;
    }
}
