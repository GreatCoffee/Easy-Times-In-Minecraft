package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.farm.ETIMFarm;
import io.github.etim.etim.weather.ETIMRain;
import net.minecraft.block.BlockDirt;
import net.minecraft.block.BlockMycelium;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.Random;

/**
 * B-19 (C-16-5 residual rain consumers) — R196 {@code BlockMycelium
 * .updateTick :119-121}: the daylight mycelium death seat,
 * <pre>else if (world.isDaytime() &amp;&amp;
 *        (!world.isPrecipitating(true) || world.isFreezing(x, z)))
 *     return world.setBlock(x, y, z, Block.dirt.blockID);</pre>
 * The shelter-sided R196 mycelium: the 1.12 vanilla body has NO rain face
 * at all, and R196's SUNLIT mycelium survives ONLY while (non-freezing)
 * rain falls; the umbrella door (:64, dark side {@code blockLightValue ≤
 * 13 && !isOutdoors}, tolerance = {@code getLightValueTolerance() :41-43}
 * = 13) never takes this branch. Composition:
 * <ul>
 *   <li>1.12 carriers — {@code isDaytime()} = {@code provider.isDaytime()}
 *       (skylightSubtracted &lt; 4, the vanilla daylight band);
 *       {@code isPrecipitating(true)} = {@link ETIMRain#isPrecipitating}
 *       (C-16 batch, the rain-strength ramp field);
 *       {@code isFreezing(x,z)} = {@code biome.isFreezing()} =
 *       {@link ETIMRain#isFreezing} (temperature ≤ 0.15F verbatim).</li>
 *   <li>the umbrella proxy — {@code getLightFromNeighbors(pos.up()) ≤ 13
 *       && !canSeeSky(pos)}; R196 {@code isOutdoors} is the reach-outdoors
 *       recursion 1.12 has no API for (C-note 2: direct sky-line proxy).</li>
 *   <li>the vanilla body continues untouched when this face does not fire
 *       — the spread arm stays 1.12 (C-note 1: R196's dark-spread family is
 *       a separate debt; a rainy day leaves the sunlit site ALIVE exactly
 *       as here).</li>
 * </ul>
 * Judge row: {@code [FarmLog] mycelium src=rainDeath …} — the block-face
 * farm lane ({@code farmDebugLog} gate, the blight-row family shape).
 */
@Mixin(BlockMycelium.class)
public abstract class MixinBlockMycelium {

    @Inject(method = "updateTick", at = @At("HEAD"), cancellable = true)
    private void etim$rainDeath(World worldIn, BlockPos pos, IBlockState state, Random rand, CallbackInfo ci) {
        if (!worldIn.isRemote) {
            if (!ETIMConfig.livestockNeedsR196) {
                return; // D-1 — the family flag seat (B-18 precedent), the vanilla body keeps its flow
            }
            if (!worldIn.isDaytime()) {
                return; // R196 :119 — the daylight gate (night mycelium never dies here)
            }
            boolean rain = ETIMRain.isPrecipitating(worldIn);
            boolean freezing = ETIMRain.isFreezing(worldIn.getBiome(pos));
            if (rain && !freezing) {
                return; // R196 survival seat — non-freezing rain shields the sunlit site
            }
            if (worldIn.getLightFromNeighbors(pos.up()) <= 13 && !worldIn.canSeeSky(pos.up())) {
                return; // R196 :64 umbrella — dark & indoor sites never take the death branch
                       // (canSeeSky on the block ITSELF is heightmap-level in 1.12 — a solid
                       // top block never "sees" the sky; the AIR CELL ABOVE pos is the
                       // R196 isOutdoors image, the B-6 farmland carrier's +1 judge point)
            }
            ETIMFarm.row("mycelium src=rainDeath pos=" + key(pos)
                    + " light=" + worldIn.getLightFromNeighbors(pos.up())
                    + " rain=" + rain + " freezing=" + freezing
                    + " sky=" + worldIn.canSeeSky(pos.up()));
            worldIn.setBlockState(pos, Blocks.DIRT.getDefaultState()
                    .withProperty(BlockDirt.VARIANT, BlockDirt.DirtType.DIRT)); // R196 :120 — dirt
            ci.cancel();
        }
    }

    private static String key(BlockPos pos) {
        return pos.getX() + "," + pos.getY() + "," + pos.getZ();
    }
}
