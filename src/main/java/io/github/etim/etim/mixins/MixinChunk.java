package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMAnimalsSpawnedDuck;
import net.minecraft.world.chunk.Chunk;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;

/**
 * B-54 — carries R196 {@code Chunk.animals_spawned} (Chunk.java:36) as a
 * mixin field so the world-gen animal cap of 4 survives without touching the
 * 1.12 chunk format.
 */
@Mixin(Chunk.class)
public abstract class MixinChunk implements ETIMAnimalsSpawnedDuck {

    @Unique
    private int etim$animalsSpawned;

    @Override
    public int etim$getAnimalsSpawned() {
        return etim$animalsSpawned;
    }

    @Override
    public void etim$setAnimalsSpawned(int value) {
        etim$animalsSpawned = value;
    }

    @Override
    public void etim$incAnimalsSpawned() {
        ++etim$animalsSpawned;
    }
}
