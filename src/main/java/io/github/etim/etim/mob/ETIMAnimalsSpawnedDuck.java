package io.github.etim.etim.mob;

/**
 * B-54 — R196 {@code Chunk.animals_spawned} (Chunk.java:36) carrier: the
 * per-chunk animal counter that caps world-gen animal groups at 4 and rides
 * the chunk NBT as {@code animals_spawned} (AnvilChunkLoader.java:282/:498).
 */
public interface ETIMAnimalsSpawnedDuck {

    int etim$getAnimalsSpawned();

    void etim$setAnimalsSpawned(int value);

    void etim$incAnimalsSpawned();
}
