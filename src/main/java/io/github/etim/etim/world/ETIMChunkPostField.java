package io.github.etim.etim.world;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * R196 {@code ChunkPostField.java:1-111} port (M1-06/M3-08). The underworld
 * field: {@code new ChunkPostField(1, hashedSeed, 24, 0.0625F)} (R196
 * {@code World.java:281}) — type {@code TYPE_UNDERWORLD_MYCELIUM = 1},
 * max effect radius 24, spawn chance 1/16 per chunk.
 *
 * <p>The R196 {@code World.getMyceliumPostField} instance face has no 1.12
 * carrier — {@link ETIMBiomeUnderworld} holds the per-server instance keyed by
 * the seed.</p>
 */
public class ETIMChunkPostField {

    public static final int TYPE_UNDERWORLD_MYCELIUM = 1; // R196 ChunkPostField.java:9

    private final Random random = new Random(); // :10 — reused, reseeded per chunk
    private final int type;
    private final long hashedType;
    private final long hashedWorldSeed;
    private final int postMaxRadiusOfEffect;
    private final int postMaxRadiusOfEffectSq;
    private final int fieldChunkRange;
    private final int fieldSizeInChunks;
    private final float chanceOfPostPerChunk;
    private int lastOriginChunkX;
    private int lastOriginChunkZ;
    private List<ETIMChunkPost> postList;

    public ETIMChunkPostField(int type, long hashedWorldSeed, int postMaxRadiusOfEffect, float chanceOfPostPerChunk) {
        this.random.setSeed(type); // :25
        this.type = type;
        this.random.nextInt();     // :27 — the one-draw prewarm
        this.hashedType = this.random.nextLong(); // :28
        this.hashedWorldSeed = hashedWorldSeed;
        this.postMaxRadiusOfEffect = postMaxRadiusOfEffect;
        this.postMaxRadiusOfEffectSq = postMaxRadiusOfEffect * postMaxRadiusOfEffect;
        this.fieldChunkRange = postMaxRadiusOfEffect < 1 ? 0 : (postMaxRadiusOfEffect - 1) / 16 + 1; // :32
        this.fieldSizeInChunks = this.fieldChunkRange * 2 + 1; // :33
        this.chanceOfPostPerChunk = chanceOfPostPerChunk;
    }

    public int getType() {
        return this.type;
    }

    public int getPostMaxRadiusOfEffect() {
        return this.postMaxRadiusOfEffect;
    }

    public int getPostMaxRadiusOfEffectSq() {
        return this.postMaxRadiusOfEffectSq;
    }

    private boolean doesPostFieldRequireRegeneration(int chunkX, int chunkZ) {
        return this.postList == null
                || this.lastOriginChunkX != chunkX
                || this.lastOriginChunkZ != chunkZ;
    }

    /** R196 :47-70 — the field rebuild (per chunk origin). */
    public void generateFieldIfRequired(int chunkX, int chunkZ) {
        if (this.doesPostFieldRequireRegeneration(chunkX, chunkZ)) {
            this.lastOriginChunkX = chunkX;
            this.lastOriginChunkZ = chunkZ;
            if (this.postList == null) {
                this.postList = new ArrayList<>();
            } else {
                this.postList.clear();
            }

            for (int chunkDx = -this.fieldChunkRange; chunkDx <= this.fieldChunkRange; chunkDx++) {
                for (int chunkDz = -this.fieldChunkRange; chunkDz <= this.fieldChunkRange; chunkDz++) {
                    int postChunkX = this.lastOriginChunkX + chunkDx;
                    int postChunkZ = this.lastOriginChunkZ + chunkDz;
                    long seed = ETIMChunkGeneratorUnderworld.chunkCoordsHash(postChunkX, postChunkZ)
                            * this.hashedType * this.hashedWorldSeed; // :61
                    this.random.setSeed(seed);
                    this.random.nextInt(); // :63 prewarm
                    if (this.random.nextFloat() < this.chanceOfPostPerChunk) { // :64
                        this.postList.add(new ETIMChunkPost(postChunkX, postChunkZ,
                                this.random.nextInt(16), this.random.nextInt(16), seed)); // :65
                    }
                }
            }
            ETIMDimensions.dimLog("postfield type=" + this.type + " posts=" + this.postList.size()
                    + " radius=" + this.postMaxRadiusOfEffect + " origin=(" + chunkX + "," + chunkZ + ")");
        }
    }

    /** R196 :80-83. */
    public List<ETIMChunkPost> getNearbyPosts(int chunkX, int chunkZ) {
        this.generateFieldIfRequired(chunkX, chunkZ);
        return this.postList;
    }

    /** R196 :85-87 — the block-coordinate read face (placeMycelium's entry). */
    public List<ETIMChunkPost> getNearbyPostsForBlockCoords(int x, int z) {
        return this.getNearbyPosts(blockToChunkCoord(x), blockToChunkCoord(z));
    }

    private static int blockToChunkCoord(int blockCoord) {
        return blockCoord >> 4;
    }
}
