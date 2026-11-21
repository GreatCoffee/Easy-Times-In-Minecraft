package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMAnimalsSpawnedDuck;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.world.World;
import net.minecraft.world.chunk.Chunk;
import net.minecraft.world.chunk.storage.AnvilChunkLoader;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * B-54 — persists R196 {@code animals_spawned} (R196 AnvilChunkLoader.java:282
 * write / :498 read). The 1.12 write/read methods work on the Level compound
 * directly (no "Level" wrapper), so the key rides the chunk root.
 */
@Mixin(AnvilChunkLoader.class)
public abstract class MixinAnvilChunkLoader {

    @Inject(method = "writeChunkToNBT", at = @At("TAIL"))
    private void etim$writeAnimalsSpawned(Chunk chunkIn, World worldIn, NBTTagCompound compound, CallbackInfo ci) {
        compound.setInteger("animals_spawned", ((ETIMAnimalsSpawnedDuck) chunkIn).etim$getAnimalsSpawned());
    }

    @Inject(method = "readChunkFromNBT", at = @At("RETURN"))
    private void etim$readAnimalsSpawned(World worldIn, NBTTagCompound compound, CallbackInfoReturnable<Chunk> cir) {
        Chunk chunk = cir.getReturnValue();
        if (chunk != null) {
            ((ETIMAnimalsSpawnedDuck) chunk).etim$setAnimalsSpawned(compound.getInteger("animals_spawned"));
        }
    }
}
