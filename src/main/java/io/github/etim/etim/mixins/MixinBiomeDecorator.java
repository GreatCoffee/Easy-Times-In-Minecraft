package io.github.etim.etim.mixins;

import java.util.Random;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMOreGen;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.biome.BiomeDecorator;

/**
 * Batch B1 (批文项8): the R196 main-world metal ore generation, appended at
 * the TAIL of the vanilla {@code generateOres} — three ETIM rows (copper
 * freq 40 / silver 10 / mithril 10, veins 6/6/3, bands ≤128/≤96/≤32, the
 * nextInt(10)==0 frequency gate and the :278-305 height distributions) ride
 * along the untouched vanilla rows (终审 G-FB-10: adamantium has NO
 * main-world row — stage 7).
 *
 * <p>The decorator only decorates the overworld (nether/end generators
 * never call it); the dimension guard is a belt-and-braces face for
 * moddeddecorators. mixins.etim.json +1 (the batch's other new mixin is
 * MixinBlockFurnace — 批文's "+1 json face" assumed no furnace-swap
 * interception; the 双方块改判 requires it).</p>
 */
@Mixin(BiomeDecorator.class)
public abstract class MixinBiomeDecorator {

    @Shadow(remap = true)
    protected BlockPos chunkPos;

    @Inject(
            method = "generateOres",
            at = @At("TAIL"),
            remap = true
    )
    protected void etim$generateMetalOres(World worldIn, Random random, CallbackInfo ci) {
        if (!ETIMConfig.metalSystem || !ETIMConfig.metalOreGen) {
            return;
        }
        if (worldIn.provider.getDimension() != 0) {
            return;
        }
        ETIMOreGen.generateOverworld(worldIn, random, this.chunkPos);
    }
}
