package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.ETIM;
import io.github.etim.etim.mob.ETIMWorldGenSpawning;
import net.minecraft.world.World;
import net.minecraft.world.WorldEntitySpawner;
import net.minecraft.world.biome.Biome;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.Random;

/**
 * B-54 — replaces the chunk-populate animal pass (ChunkGeneratorOverworld
 * :473-475 call site, after the {@code TerrainGen.populate(ANIMALS)} gate)
 * with the R196 {@code SpawnerAnimals.performWorldGenSpawning} face. With
 * {@code mobWorldGenSpawnR196} off the vanilla body runs untouched.
 */
@Mixin(WorldEntitySpawner.class)
public abstract class MixinWorldEntitySpawner {

    @Inject(method = "performWorldGenSpawning", at = @At("HEAD"), cancellable = true)
    private static void etim$worldGenSpawn(World worldIn, Biome biomeIn, int centerX, int centerZ,
            int diameterX, int diameterZ, Random randomIn, CallbackInfo ci) {
        if (!ETIMConfig.mobWorldGenSpawnR196) {
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[WorldGenSpawnLog] hook dim={} flag=false skip", worldIn.provider.getDimension());
            }
            return;
        }
        if (worldIn instanceof net.minecraft.world.WorldServer) {
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[WorldGenSpawnLog] hook dim={} center=({},{}) biome={}",
                        worldIn.provider.getDimension(), centerX, centerZ, biomeIn.getRegistryName());
            }
            ETIMWorldGenSpawning.perform(worldIn, biomeIn, centerX, centerZ, diameterX, diameterZ, randomIn);
            ci.cancel();
        }
    }
}
