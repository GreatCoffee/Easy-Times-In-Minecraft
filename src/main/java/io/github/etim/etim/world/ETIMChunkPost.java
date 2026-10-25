package io.github.etim.etim.world;

/**
 * R196 {@code ChunkPost.java:16-77} port (M1-06/M3-08) — the post point of a
 * {@link ETIMChunkPostField}: chunk-scoped coordinates, block coordinates and
 * the field seed carried for the per-post face rolls.
 */
public final class ETIMChunkPost {

    private final int chunkX;
    private final int chunkZ;
    private final int localX;
    private final int localZ;
    private final int x;
    private final int z;
    private final double posX;
    private final double posZ;
    private final long seed;

    public ETIMChunkPost(int chunkX, int chunkZ, int localX, int localZ, long seed) {
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
        this.localX = localX;
        this.localZ = localZ;
        this.x = chunkX * 16 + localX;
        this.z = chunkZ * 16 + localZ;
        this.posX = this.x + 0.5D; // :25-26
        this.posZ = this.z + 0.5D;
        this.seed = seed;
    }

    public int getChunkX() {
        return this.chunkX;
    }

    public int getChunkZ() {
        return this.chunkZ;
    }

    public int getLocalX() {
        return this.localX;
    }

    public int getLocalZ() {
        return this.localZ;
    }

    public int getX() {
        return this.x;
    }

    public int getZ() {
        return this.z;
    }

    public long getSeed() {
        return this.seed;
    }

    /** R196 :58-60 — World.getDistanceSqFromDeltas = dx²+dz². */
    public double getDistanceSqFromBlockCoords(int x, int z) {
        double dx = this.x - x;
        double dz = this.z - z;
        return dx * dx + dz * dz;
    }

    public double getDistanceSqFromPosXZ(double posX, double posZ) {
        double dx = this.posX - posX;
        double dz = this.posZ - posZ;
        return dx * dx + dz * dz;
    }

    @Override
    public String toString() {
        return "[" + this.chunkX + "," + this.chunkZ + "]";
    }
}
