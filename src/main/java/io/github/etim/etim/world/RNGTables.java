package io.github.etim.etim.world;

import java.util.Random;

/**
 * R196 {@code RNG.java:64-134} port — the global static RNG table face, seeded
 * ONCE on the world seed. This batch consumes three tables
 * ({@code int_14_plus_1}, {@code int_126_plus_1}, {@code chance_in_2}), but the
 * per-index draw order is R196's full shape (nextInt, nextInt, nextFloat,
 * nextFloat, nextDouble) so future batches (ores/dungeons) land on the same
 * stream positions.
 *
 * <p>Chunk-side consumers (report §3.2): {@code placeRandomCobwebs} walks a
 * local cursor over {@code int_14_plus_1}/{@code int_126_plus_1}; the strata
 * bands index {@code chance_in_2} with the per-column {@code rng_index}
 * cursor (Chunk.java:198,263,290,317).</p>
 */
final class RNGTables {

    /** R196 int_14_plus_1 (RNG.java:104) — values 1..14. */
    static int[] int_14_plus_1 = new int[32768];
    /** R196 int_126_plus_1 (RNG.java:110) — values 1..126. */
    static int[] int_126_plus_1 = new int[32768];
    /** R196 chance_in_2 (RNG.java:111) — (int_a & 1) == 0. */
    static boolean[] chance_in_2 = new boolean[32768];

    private static boolean initialized;

    private RNGTables() {
    }

    /** R196 RNG.init :64-134 — the world-seed one-shot; per-index draw order preserved. */
    static void init(long seed) {
        if (initialized) {
            return;
        }
        initialized = true;
        Random rand = new Random();
        rand.setSeed(seed);
        int i = -1;
        while (++i < 32768) {
            int int_a = rand.nextInt() & 2147483647; // :72
            int int_b = rand.nextInt() & 2147483647; // :73 (feeds the int_-minus tables, future batches)
            int_14_plus_1[i] = (int_a % 14) + 1;     // :90 + :104
            int_126_plus_1[i] = (int_a % 126) + 1;   // :97 + :110
            chance_in_2[i] = (int_a & 1) == 0;       // :75 + :111
            // stream keepers — float/double tables land with their batches.
            rand.nextFloat();  // float_1       (:120-122)
            rand.nextFloat();  // float_b faces (:121-127)
            rand.nextDouble(); // double_1      (:128-129)
        }
    }

    /**
     * R196 {@code ChunkProviderGenerate.placeRandomCobwebs :118-176}, verbatim.
     * 128 attempts; a placed web costs -128×4 extra attempts (:175). The band
     * index here is the {@code (z*16+x)*128+y} layout — TRANSPOSED vs the
     * terrain band's {@code x<<11|z<<7|y} (B-7, kept as-is).
     */
    static void placeRandomCobwebs(int chunkX, int chunkZ, byte[] band, Random rand) {
        int randomNumberIndex = rand.nextInt(); // :119
        byte webBlockId = 3;                    // internal BAND_WEB id
        byte stoneBlockId = 1;                  // internal BAND_STONE id
        int frequency = 128;                    // :124

        for (int attempts = 0; attempts < frequency; attempts++) {
            int x = int_14_plus_1[++randomNumberIndex & 32767];     // :127
            int y = int_126_plus_1[++randomNumberIndex & 32767];    // :128
            int z = int_14_plus_1[++randomNumberIndex & 32767];     // :129
            int index = (z * 16 + x) * 128 + y;                     // :130
            if (band[index] == 0) {                                 // :131
                int above = band[index + 1];                        // :132
                int below = band[index - 1];                        // :133
                int front = band[index + 128];                      // :134
                int back = band[index - 128];                       // :135
                int right = band[index + 2048];                     // :136
                int left = band[index - 2048];                      // :137
                int solidFaceAdjacent = 0;
                if (above != 0) {
                    solidFaceAdjacent++;
                }
                if (below != 0) {
                    solidFaceAdjacent++;
                }
                if (front != 0) {
                    solidFaceAdjacent++;
                }
                if (back != 0) {
                    solidFaceAdjacent++;
                }
                if (right != 0) {
                    solidFaceAdjacent++;
                }
                if (left != 0) {
                    solidFaceAdjacent++;
                }

                // :163-173 — ≥4 solid faces, below not lava (the underworld band
                // holds no lava — B-5 — so the lava face is dead here), one stone
                // neighbor. attempts -= frequency*4 (:175).
                if (solidFaceAdjacent >= 4
                        && below != 4 && below != 5 // lava still/moving markers (dead: no lava band)
                        && (above == stoneBlockId || below == stoneBlockId || front == stoneBlockId
                            || back == stoneBlockId || right == stoneBlockId || left == stoneBlockId)) {
                    band[index] = webBlockId;
                    attempts -= frequency * 4;
                }
            }
        }
    }
}
