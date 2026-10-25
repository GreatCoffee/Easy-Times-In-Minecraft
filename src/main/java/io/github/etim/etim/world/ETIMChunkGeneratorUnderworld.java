package io.github.etim.etim.world;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMBlocks;
import io.github.etim.etim.metal.ETIMOreGen;

import java.util.Arrays;
import java.util.List;
import java.util.Random;

import net.minecraft.block.BlockFalling;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EnumCreatureType;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.biome.Biome;
import net.minecraft.world.chunk.Chunk;
import net.minecraft.world.chunk.ChunkPrimer;
import net.minecraft.world.gen.NoiseGeneratorOctaves;

import javax.annotation.Nullable;

/**
 * R196 {@code ChunkProviderUnderworld.java} port (M4-01~05) + the full-height
 * bedrock strata from {@code Chunk.java:146-328} (M4-05). One-hand values, all
 * transposed verbatim:
 *
 * <ul>
 *   <li>noise set (M4-01, :49-66): 7 generator octaves (16/16/8/4/4/10/16) +
 *       11 strata octaves (all 4), built from the SAME seeded {@link Random}
 *       in R196 order — the constructors consume the permutation, per-chunk
 *       work only {@code setSeed}s (report §3.1).</li>
 *   <li>terrain band (M4-03, :69-131): {@code 4/32} cells, water floor
 *       y&lt;24 (= 32−8, <b>water, NOT lava</b> — B-5, do NOT inherit
 *       {@code ChunkGeneratorHell}'s LAVA face), noise&gt;0 → stone; the band
 *       index is the R196 {@code x<<11|z<<7|y} layout, then shifted +120 into
 *       the 256-high 1.12 chunk (B-15: IChunkGenerator + manual offset).</li>
 *   <li>{@code replaceBlocksForBiome} (M4-04, :133-150): only the
 *       {@code offset==0} nether-face builds a bedrock shell — kept as the
 *       guarded empty branch (offset is 120 here, never 0).</li>
 *   <li>full height (M4-05, Chunk.java:200-348): terrain band → y 120..247;
 *       below/above, the four strata bands (centers 3/32/72/96, thresholds
 *       ×7/×2/×2/×2, bump weights 0.125/0.25/0.5/1.0) plus the low-end
 *       {@code ETIMBlocks.MANTLE_OR_CORE} meta 0 (M1-03) and the top bedrock.</li>
 *   <li>{@link RNGTables}: the R196 {@code RNG.java:64-134} global table face
 *       (chance_in_2 + int_14_plus_1 + int_126_plus_1), initialized ONCE on the
 *       world seed with R196's per-index draw order (nextInt, nextInt,
 *       nextFloat, nextFloat, nextDouble) so future batches (ores/dungeons)
 *       land on the same stream.</li>
 *   <li>populate (R196 :302-318): the 16-attempt dungeon face rides M4-12
 *       (后置, D-1) — populate only walks the biome decorate (= placeMycelium,
 *       M3-07/B-6).</li>
 * </ul>
 */
public final class ETIMChunkGeneratorUnderworld implements net.minecraft.world.gen.IChunkGenerator {

    // internal band block ids (R196 blockID values have no 1.12 meaning)
    private static final byte BAND_AIR = 0;
    private static final byte BAND_STONE = 1;
    private static final byte BAND_WATER = 2;
    private static final byte BAND_WEB = 3;

    private static final int Y_OFFSET = 120; // mirrors provider.getYOffset() (B-2 single source)

    private final World world;
    private final Random rand;

    // M4-01 — the 7 main octaves (R196 :49-55)
    private final NoiseGeneratorOctaves netherNoiseGen1;
    private final NoiseGeneratorOctaves netherNoiseGen2;
    private final NoiseGeneratorOctaves netherNoiseGen3;
    private final NoiseGeneratorOctaves slowsandGravelNoiseGen;
    private final NoiseGeneratorOctaves netherrackExclusivityNoiseGen;
    private final NoiseGeneratorOctaves netherNoiseGen6;
    private final NoiseGeneratorOctaves netherNoiseGen7;

    // the 11 strata octaves (R196 :56-66) — s1a/s1b pair + bump face
    private final NoiseGeneratorOctaves strata1a;
    private final NoiseGeneratorOctaves strata1b;
    private final NoiseGeneratorOctaves strata2;
    private final NoiseGeneratorOctaves strata3;
    private final NoiseGeneratorOctaves strata4;
    private final NoiseGeneratorOctaves bump1a;
    private final NoiseGeneratorOctaves bump1b;
    private final NoiseGeneratorOctaves bump1c;
    private final NoiseGeneratorOctaves bump2;
    private final NoiseGeneratorOctaves bump3;
    private final NoiseGeneratorOctaves bump4;

    private double[] noiseField;
    private double[] noiseData1;
    private double[] noiseData2;
    private double[] noiseData3;
    private double[] noiseData4;
    private double[] noiseData5;

    // strata noise outputs (Chunk.java:34-44), per-chunk instance state
    private double[] strata1aNoise = new double[256];
    private double[] strata1bNoise = new double[256];
    private double[] strata2Noise = new double[256];
    private double[] strata3Noise = new double[256];
    private double[] strata4Noise = new double[256];
    private double[] bump1aNoise = new double[256];
    private double[] bump1bNoise = new double[256];
    private double[] bump1cNoise = new double[256];
    private double[] bump2Noise = new double[256];
    private double[] bump3Noise = new double[256];
    private double[] bump4Noise = new double[256];

    public ETIMChunkGeneratorUnderworld(World world, long seed) {
        this.world = world;
        this.rand = new Random(seed);
        this.netherNoiseGen1 = new NoiseGeneratorOctaves(this.rand, 16);
        this.netherNoiseGen2 = new NoiseGeneratorOctaves(this.rand, 16);
        this.netherNoiseGen3 = new NoiseGeneratorOctaves(this.rand, 8);
        this.slowsandGravelNoiseGen = new NoiseGeneratorOctaves(this.rand, 4);
        this.netherrackExclusivityNoiseGen = new NoiseGeneratorOctaves(this.rand, 4);
        this.netherNoiseGen6 = new NoiseGeneratorOctaves(this.rand, 10);
        this.netherNoiseGen7 = new NoiseGeneratorOctaves(this.rand, 16);
        this.strata1a = new NoiseGeneratorOctaves(this.rand, 4);
        this.strata1b = new NoiseGeneratorOctaves(this.rand, 4);
        this.strata2 = new NoiseGeneratorOctaves(this.rand, 4);
        this.strata3 = new NoiseGeneratorOctaves(this.rand, 4);
        this.strata4 = new NoiseGeneratorOctaves(this.rand, 4);
        this.bump1a = new NoiseGeneratorOctaves(this.rand, 4);
        this.bump1b = new NoiseGeneratorOctaves(this.rand, 4);
        this.bump1c = new NoiseGeneratorOctaves(this.rand, 4);
        this.bump2 = new NoiseGeneratorOctaves(this.rand, 4);
        this.bump3 = new NoiseGeneratorOctaves(this.rand, 4);
        this.bump4 = new NoiseGeneratorOctaves(this.rand, 4);
        ETIMDimensions.dimLog("gen noise=7 strata=11 seed=" + seed);
        ETIMDimensions.dimLog("provider dim=-2 yOffset=" + Y_OFFSET + " actualHeight=256");
        RNGTables.init(world.getSeed());
    }

    // ------------------------------------------------------------------
    // M4-02 provideChunk (:157-181)
    // ------------------------------------------------------------------

    @Override
    public Chunk generateChunk(int x, int z) {
        this.rand.setSeed(x * 341873128712L + z * 132897987541L); // :165
        byte[] band = new byte[32768];                            // :166
        this.generateNetherTerrain(x, z, band);                   // :167
        this.replaceBlocksForBiome(x, z, band);                   // :168 (offset=120 → empty)
        RNGTables.placeRandomCobwebs(x, z, band, this.rand);      // :169
        ChunkPrimer primer = this.buildFullHeight(x, z, band);
        Chunk chunk = new Chunk(this.world, primer, x, z);
        byte[] biomes = chunk.getBiomeArray();
        Arrays.fill(biomes, (byte) Biome.getIdForBiome(ETIMBiomeUnderworld.INSTANCE));
        chunk.resetRelightChecks();
        ETIMDimensions.dimLog("gen chunk=(" + x + "," + z + ") ok");
        return chunk;
    }

    // ------------------------------------------------------------------
    // M4-03 generateNetherTerrain (:69-131) — verbatim, water NOT lava (B-5)
    // ------------------------------------------------------------------

    private void generateNetherTerrain(int chunkX, int chunkZ, byte[] band) {
        // :70-75 — cell sizes and the noise-field seed point
        int xCellCount = 4;
        int zCellCount = 4;
        int yCellCount = 16;
        int xOffsetCells = xCellCount + 1; // 5
        int zOffsetCells = zCellCount + 1; // 5
        int yStride = 17;                  // :73 (16 cells + 1)

        this.noiseField = this.initializeNoiseField(this.noiseField,
                chunkX * 4, 0, chunkZ * 4, xOffsetCells, yStride, zOffsetCells);

        for (int xCell = 0; xCell < xCellCount; xCell++) {
            for (int zCell = 0; zCell < zCellCount; zCell++) {
                for (int yCell = 0; yCell < yCellCount; yCell++) {
                    double xzStep = 0.125;                          // :80
                    double c000 = this.noiseField[((xCell + 0) * zOffsetCells + zCell + 0) * yStride + yCell + 0];
                    double c001 = this.noiseField[((xCell + 0) * zOffsetCells + zCell + 1) * yStride + yCell + 0];
                    double c100 = this.noiseField[((xCell + 1) * zOffsetCells + zCell + 0) * yStride + yCell + 0];
                    double c101 = this.noiseField[((xCell + 1) * zOffsetCells + zCell + 1) * yStride + yCell + 0];
                    double dY01 = (this.noiseField[((xCell + 0) * zOffsetCells + zCell + 0) * yStride + yCell + 1] - c000) * xzStep;
                    double dY11 = (this.noiseField[((xCell + 0) * zOffsetCells + zCell + 1) * yStride + yCell + 1] - c001) * xzStep;
                    double dY10 = (this.noiseField[((xCell + 1) * zOffsetCells + zCell + 0) * yStride + yCell + 1] - c100) * xzStep;
                    double dY00 = (this.noiseField[((xCell + 1) * zOffsetCells + zCell + 1) * yStride + yCell + 1] - c101) * xzStep;

                    for (int ySub = 0; ySub < 8; ySub++) {           // :90
                        double xStep = 0.25;                        // :91
                        double v00 = c000;
                        double v01 = c001;
                        double dX0 = (c100 - c000) * xStep;
                        double dX1 = (c101 - c001) * xStep;

                        for (int xSub = 0; xSub < 4; xSub++) {      // :97
                            int x = xCell * 4 + xSub;
                            int y = yCell * 8 + ySub;
                            double zStep = 0.25;                    // :100
                            double v0 = v00;
                            double dZ = (v01 - v00) * zStep;

                            for (int zSub = 0; zSub < 4; zSub++) {  // :104
                                int z = zCell * 4 + zSub;
                                // :98 — the R196 index layout (y = low 7 bits,
                                // +128 stride is z+1, report §3.2 warning).
                                int index = x << 11 | z << 7 | y;
                                byte id;
                                if (y < 24) {                       // :106-108 — 32-8 = 24, WATER (B-5)
                                    id = BAND_WATER;
                                } else if (v0 > 0.0) {              // :110-112
                                    id = BAND_STONE;
                                } else {
                                    id = BAND_AIR;
                                }

                                band[index] = id;
                                index += 128;                       // :115 — z stride in the band layout
                                v0 += dZ;
                            }

                            v00 += dX0;
                            v01 += dX1;
                        }

                        c000 += dY01;
                        c001 += dY11;
                        c100 += dY10;
                        c101 += dY00;
                    }
                }
            }
        }
    }

    /**
     * M4-04 — R196 :133-150: the bedrock shell runs on the {@code
     * underworld_y_offset == 0} nether face only. This batch's offset is a
     * hard 120, so the branch body is kept as the guarded empty branch
     * (照抄, M4-04 判行锚).
     */
    private void replaceBlocksForBiome(int chunkX, int chunkZ, byte[] band) {
        if (this.providerOffset() == 0) { // :134
            for (int x = 0; x < 16; x++) {
                for (int z = 0; z < 16; z++) {
                    this.rand.nextDouble();
                    this.rand.nextDouble();
                    this.rand.nextDouble();

                    for (int y = 127; y >= 0; y--) {
                        int index = (z * 16 + x) * 128 + y;
                        if (y >= 127 - this.rand.nextInt(5) || y <= 0 + this.rand.nextInt(5)) {
                            band[index] = 4; // bedrock marker (unreachable at offset 120)
                        }
                    }
                }
            }
        }
        ETIMDimensions.dimLog("replaceBiome=skipped(offset=" + this.providerOffset() + ")");
    }

    private int providerOffset() {
        return this.world.provider instanceof ETIMWorldProviderUnderworld
                ? ((ETIMWorldProviderUnderworld) this.world.provider).getYOffset() : 0;
    }

    // ------------------------------------------------------------------
    // M4-05 full-height assembly (Chunk.java:200-348) — verbatim strata
    // ------------------------------------------------------------------

    private ChunkPrimer buildFullHeight(int chunkX, int chunkZ, byte[] band) {
        ChunkPrimer primer = new ChunkPrimer();
        Random colRand = new Random(ETIMChunkGeneratorUnderworld.hashedWorldSeed(this.world.getSeed())
                * chunkCoordsHash(chunkX, chunkZ)); // Chunk.java:149 + :2221-2225
        int rngIdx = chunkX * 2653 + chunkZ * 6714631;      // :198

        this.generateStrataNoise(chunkX * 16, chunkZ * 16); // Chunk.java:146-197

        IBlockState stone = Blocks.STONE.getDefaultState();
        IBlockState water = Blocks.WATER.getDefaultState();
        IBlockState bedrock = Blocks.BEDROCK.getDefaultState();
        IBlockState mantle = ETIMBlocks.MANTLE_OR_CORE.getDefaultState(); // meta 0 = mantle (M1-03)
        IBlockState web = Blocks.WEB.getDefaultState();

        for (int lx = 0; lx < 16; lx++) {
            for (int lz = 0; lz < 16; lz++) {
                int numBedrock = colRand.nextInt(3) + 1;    // :202 (offset != 0 face)

                for (int y = 0; y < 256; y++) {
                    IBlockState state;
                    if (y >= Y_OFFSET && y <= Y_OFFSET + 127) {
                        // :207-210 — the terrain band, shifted up 120
                        byte id = band[lx << 11 | lz << 7 | (y - Y_OFFSET)];
                        switch (id) {
                            case BAND_STONE: state = stone; break;
                            case BAND_WATER: state = water; break;
                            case BAND_WEB: state = web; break;
                            default: state = null; break; // air
                        }
                    } else {
                        // :214-219 — the low end mantle_or_core (meta 0), top bedrock
                        if (y < numBedrock) {
                            state = mantle;
                        } else if (y > 255 - numBedrock) {
                            state = bedrock;
                        } else {
                            state = stone;
                            int i = lz + lx * 16; // :221 — local_xz_index = z + x*16
                            double bedrockNoise = Math.max(this.strata1aNoise[i], this.strata1bNoise[i]); // :222-225
                            int dy = y - 3;                  // :226
                            double bump = this.bump1aNoise[i];
                            if (bump > 0.0) {
                                bedrockNoise += bump * 0.25; // :227-230
                            }
                            bump = this.bump1bNoise[i];
                            if (bump > 0.0) {
                                bedrockNoise += bump * 0.125; // :232-235
                            }
                            bump = this.bump1cNoise[i];
                            if (bump > 0.0) {
                                bedrockNoise += bump * 0.125; // :237-240
                            }
                            bump = this.bump4Noise[i];
                            if (bump > 0.0) {
                                bedrockNoise += bump * 0.09375 + 0.125; // :242-245
                            }

                            if (bedrockNoise > 0.0 && dy <= bedrockNoise * 7.0) { // :247-249
                                state = bedrock;
                            }

                            if (state != bedrock) { // band 2 (:251-274)
                                dy = y - 32; // :252
                                bedrockNoise = this.strata2Noise[i] - bedrockNoise * 1.5; // :253
                                if (bedrockNoise > 0.0) {
                                    if (dy > 0) {
                                        bump = this.bump2Noise[i];
                                        if (bump > 0.0) {
                                            bedrockNoise += bump * 0.25 + 0.25; // :256-259
                                        }
                                    }

                                    if (dy < 0) { // :262-268 — the chance_in_2 drain
                                        if (RNGTables.chance_in_2[++rngIdx & 32767]) {
                                            dy++;
                                        }
                                        dy = -dy;
                                    }

                                    if (dy <= bedrockNoise * 2.0) { // :270-272
                                        state = bedrock;
                                    }
                                }
                            }

                            if (state != bedrock) { // band 3 (:276-301)
                                dy = y - 72;
                                bedrockNoise = this.strata3Noise[i]
                                        - this.strata4Noise[i] * 0.375; // :278-279
                                bedrockNoise += 0.5; // :280
                                if (bedrockNoise > 0.0) {
                                    if (dy > 0) {
                                        bump = this.bump3Noise[i];
                                        if (bump > 0.0) {
                                            bedrockNoise += bump * 0.25 + 0.25;
                                        }
                                    }

                                    if (dy < 0) {
                                        if (RNGTables.chance_in_2[++rngIdx & 32767]) {
                                            dy++;
                                        }
                                        dy = -dy;
                                    }

                                    if (dy <= bedrockNoise * 2.0) {
                                        state = bedrock;
                                    }
                                }
                            }

                            if (state != bedrock) { // band 4 (:303-328)
                                dy = y - 96;
                                bedrockNoise = this.strata4Noise[i]
                                        - this.strata3Noise[i] * 0.375; // :305-306
                                bedrockNoise += 0.5;
                                if (bedrockNoise > 0.0) {
                                    if (dy > 0) {
                                        bump = this.bump4Noise[i];
                                        if (bump > 0.0) {
                                            bedrockNoise += bump * 0.25 + 0.25;
                                        }
                                    }

                                    if (dy < 0) {
                                        if (RNGTables.chance_in_2[++rngIdx & 32767]) {
                                            dy++;
                                        }
                                        dy = -dy;
                                    }

                                    if (dy <= bedrockNoise * 2.0) {
                                        state = bedrock;
                                    }
                                }
                            }
                        }
                    }

                    if (state != null) {
                        primer.setBlockState(lx, y, lz, state); // ChunkPrimer.java:18-21
                    }
                }
            }
        }
        return primer;
    }

    /** Chunk.java:146-197 — the strata noise field for one chunk. */
    private void generateStrataNoise(int baseX, int baseZ) {
        double scale_xz = 0.015625; // :151
        double scale_y = 0.03125;   // :152
        this.strata1aNoise = this.strata1a.generateNoiseOctaves(this.strata1aNoise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 2.0, scale_y * 2.0, scale_xz * 2.0);
        this.strata1bNoise = this.strata1b.generateNoiseOctaves(this.strata1bNoise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 2.0, scale_y * 2.0, scale_xz * 2.0);
        this.strata2Noise = this.strata2.generateNoiseOctaves(this.strata2Noise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 4.0, scale_y * 2.0, scale_xz * 4.0);
        this.strata3Noise = this.strata3.generateNoiseOctaves(this.strata3Noise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 4.0, scale_y * 2.0, scale_xz * 4.0);
        this.strata4Noise = this.strata4.generateNoiseOctaves(this.strata4Noise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 4.0, scale_y * 2.0, scale_xz * 4.0);
        scale_xz = 0.25; // :173
        this.bump1aNoise = this.bump1a.generateNoiseOctaves(this.bump1aNoise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 0.5, scale_y * 2.0, scale_xz * 0.5);
        this.bump1bNoise = this.bump1b.generateNoiseOctaves(this.bump1bNoise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 1.0, scale_y * 2.0, scale_xz * 1.0);
        this.bump1cNoise = this.bump1c.generateNoiseOctaves(this.bump1cNoise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 2.0, scale_y * 2.0, scale_xz * 2.0);
        this.bump2Noise = this.bump2.generateNoiseOctaves(this.bump2Noise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 4.0, scale_y * 2.0, scale_xz * 4.0);
        this.bump3Noise = this.bump3.generateNoiseOctaves(this.bump3Noise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 4.0, scale_y * 2.0, scale_xz * 4.0);
        this.bump4Noise = this.bump4.generateNoiseOctaves(this.bump4Noise, baseX, 0, baseZ, 16, 1, 16,
                scale_xz * 4.0, scale_y * 2.0, scale_xz * 4.0);
    }

    // ------------------------------------------------------------------
    // initializeNoiseField (R196 :183-288) — verbatim
    // ------------------------------------------------------------------

    private double[] initializeNoiseField(double[] field, int x, int y, int z, int xSize, int ySize, int zSize) {
        if (field == null) {
            field = new double[xSize * ySize * zSize];
        }

        double scaleA = 684.412;  // :188
        double scaleB = 2053.236; // :189
        this.noiseData4 = this.netherNoiseGen6.generateNoiseOctaves(this.noiseData4, x, y, z, xSize, 1, zSize, 1.0, 0.0, 1.0); // :190
        this.noiseData5 = this.netherNoiseGen7.generateNoiseOctaves(this.noiseData5, x, y, z, xSize, 1, zSize, 100.0, 0.0, 100.0); // :191
        this.noiseData1 = this.netherNoiseGen3.generateNoiseOctaves(this.noiseData1, x, y, z, xSize, ySize, zSize,
                scaleA / 80.0, scaleB / 60.0, scaleA / 80.0); // :192-193
        this.noiseData2 = this.netherNoiseGen1.generateNoiseOctaves(this.noiseData2, x, y, z, xSize, ySize, zSize,
                scaleA, scaleB, scaleA); // :194
        this.noiseData3 = this.netherNoiseGen2.generateNoiseOctaves(this.noiseData3, x, y, z, xSize, ySize, zSize,
                scaleA, scaleB, scaleA); // :195

        int index = 0;   // :196
        int noiseIdx = 0; // :197
        double[] profile = new double[ySize]; // :198

        for (int i = 0; i < ySize; i++) {
            profile[i] = Math.cos(i * Math.PI * 6.0 / ySize) * 2.0; // :201
            double mirrored = i; // :202
            if (i > ySize / 2) {
                mirrored = ySize - 1 - i; // :204
            }

            if (mirrored < 4.0) { // :207
                mirrored = 4.0 - mirrored;
                profile[i] -= mirrored * mirrored * mirrored * 10.0; // :209
            }
        }

        for (int xi = 0; xi < xSize; xi++) {        // :213
            for (int zi = 0; zi < zSize; zi++) {    // :214
                double offsetV = (this.noiseData4[noiseIdx] + 256.0) / 512.0; // :215
                if (offsetV > 1.0) {
                    offsetV = 1.0;
                }

                double density = 0.0;   // :220
                double drift = this.noiseData5[noiseIdx] / 8000.0; // :221
                if (drift < 0.0) {
                    drift = -drift;
                }

                drift = drift * 3.0 - 3.0; // :226
                if (drift < 0.0) {
                    drift /= 2.0;
                    if (drift < -1.0) {
                        drift = -1.0;
                    }

                    drift /= 1.4;
                    drift /= 2.0;
                    offsetV = 0.0; // :235
                } else {
                    if (drift > 1.0) {
                        drift = 1.0;
                    }

                    drift /= 6.0; // :241
                }

                offsetV += 0.5;         // :244
                drift = drift * ySize / 16.0; // :245
                noiseIdx++;

                for (int yi = 0; yi < ySize; yi++) { // :248
                    double value = 0.0; // :249
                    double column = profile[yi]; // :250
                    double n2 = this.noiseData2[index] / 512.0; // :251
                    double n3 = this.noiseData3[index] / 512.0; // :252
                    double blend = (this.noiseData1[index] / 10.0 + 1.0) / 2.0; // :253
                    if (blend < 0.0) {
                        value = n2; // :255
                    } else if (blend > 1.0) {
                        value = n3; // :257
                    } else {
                        value = n2 + (n3 - n2) * blend; // :259
                    }

                    value -= column; // :262
                    if (yi > ySize - 4) { // :263
                        double shrink = (yi - (ySize - 4)) / 3.0F; // :264
                        value = value * (1.0 - shrink) + -10.0 * shrink; // :265
                    }

                    if (yi < density) { // :268
                        double shrink = (density - yi) / 4.0; // :269
                        if (shrink < 0.0) {
                            shrink = 0.0;
                        }

                        if (shrink > 1.0) {
                            shrink = 1.0;
                        }

                        value = value * (1.0 - shrink) + -10.0 * shrink; // :278
                    }

                    field[index] = value; // :281
                    index++;
                }
            }
        }

        return field;
    }

    // ------------------------------------------------------------------
    // populate (R196 :302-318) — dungeon face deferred (M4-12, D-1)
    // ------------------------------------------------------------------

    @Override
    public void populate(int x, int z) {
        // R196 :303/:317 — the falling-instant guard wraps the populate body.
        BlockFalling.fallInstantly = true;
        // T6 (G-FB-10 转正, NB-03-08/NC-01): the underworld ore spread rides
        // here directly — the vanilla BiomeDecorator never decorates dim -2
        // (ETIMBiomeUnderworld.decorate = placeMycelium only, B-6), so the
        // mixin underworld face would be dead code.
        if (ETIMConfig.metalSystem && ETIMConfig.metalOreGen) {
            ETIMOreGen.generateUnderworld(this.world, this.world.rand,
                    new BlockPos(x * 16, 0, z * 16));
        }
        // T7 (M4-12 载体转正): R196 ChunkProviderUnderworld.java:306-313 — 16
        // WorldGenDungeons attempts per chunk (offset gate), z/x = +nextInt(16)+8,
        // y = nextInt(32)+20+offset (140..171 at offset 120).
        int yOffset = ((ETIMWorldProviderUnderworld) this.world.provider).getYOffset();
        for (int i = 0; i < 16; i++) {
            int dx = x * 16 + this.world.rand.nextInt(16) + 8;
            int dz = z * 16 + this.world.rand.nextInt(16) + 8;
            int dy = this.world.rand.nextInt(32) + 20 + yOffset;
            new ETIMWorldGenDungeons().generate(this.world, this.world.rand,
                    new BlockPos(dx, dy, dz));
        }
        ETIMBiomeUnderworld.INSTANCE.decorate(this.world, this.world.rand,
                new BlockPos(x * 16, 0, z * 16)); // :315-316 (M3-07: placeMycelium, B-6)
        BlockFalling.fallInstantly = false;
    }

    @Override
    public List<Biome.SpawnListEntry> getPossibleCreatures(EnumCreatureType type, BlockPos pos) {
        // R196 :344-348 — straight biome delegation (M6-06)
        List<Biome.SpawnListEntry> list = this.world.getBiome(pos).getSpawnableList(type);
        if (type == EnumCreatureType.MONSTER && !this.possibleCreaturesLogged) {
            this.possibleCreaturesLogged = true;
            if (ETIMConfig.mobDebugLog) {
                StringBuilder rows = new StringBuilder();
                for (Biome.SpawnListEntry e : list) {
                    if (rows.length() > 0) {
                        rows.append(',');
                    }
                    rows.append(e.entityClass.getSimpleName()).append(':').append(e.itemWeight);
                }
                ETIM.LOGGER.info("[SpawnLog] pool dim=" + this.world.provider.getDimension()
                        + " size=" + list.size() + " rows=" + rows + " [server]");
            }
        }
        return list;
    }

    private boolean possibleCreaturesLogged;

    @Override
    public boolean generateStructures(Chunk chunkIn, int x, int z) {
        return false;
    }

    @Nullable
    @Override
    public BlockPos getNearestStructurePos(World worldIn, String structureName, BlockPos position, boolean findUnexplored) {
        return null;
    }

    @Override
    public void recreateStructures(Chunk chunkIn, int x, int z) {
    }

    @Override
    public boolean isInsideStructure(World worldIn, String structureName, BlockPos pos) {
        return false;
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    /** Chunk.java:2221-2225 — getChunkCoordsHash: 17, *31+cx, *31+cz. */
    static long chunkCoordsHash(int chunkX, int chunkZ) {
        long hash = 17;
        hash = hash * 31 + chunkX;
        return hash * 31 + chunkZ;
    }

    /** WorldInfoShared.java:55-59 (B-13 ✓) — Random(seed).nextInt() then nextLong(). */
    static long hashedWorldSeed(long seed) {
        Random r = new Random(seed);
        r.nextInt();
        return r.nextLong();
    }
}
