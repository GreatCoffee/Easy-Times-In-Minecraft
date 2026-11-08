package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.farm.ETIMFarm;
import io.github.etim.etim.weather.ETIMRain;
import net.minecraft.block.BlockDirt;
import net.minecraft.block.BlockMushroom;
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
 * B-19 + B-21 — the full R196 {@code BlockMycelium.updateTick :47-124}
 * algorithm carried in ONE HEAD injection (cancellable), replacing the
 * vanilla 1.12 body entirely while {@code livestockNeedsR196} is on (the
 * B-18 flag-seat precedent; flag OFF = the vanilla body byte-identical):
 * <ul>
 *   <li>{@code :56-58} water-above → dirt (R196 :56 — NO 1/4 gate, it sits
 *       before {@code :60});</li>
 *   <li>{@code :60-62} the 1/4 roll ({@code nextInt(4) > 0 → return}) —
 *       B-21 correction: the B-19 death face rode EVERY random tick, R196
 *       gates the whole body (death included) behind this roll;</li>
 *   <li>{@code :64} the umbrella door —
 *       {@code blockLightValue(y+1) ≤ 13 && !isOutdoors} where the
 *       tolerance is {@code getLightValueTolerance() :41-43} = 13 and the
 *       1.12 {@code isOutdoors} proxy is {@code !canSeeSky(pos.up())} (the
 *       B-19 verdict-carried image — {@code canSeeSky} on the block itself
 *       is heightmap-level in 1.12); the umbrella sites NEVER take the
 *       death branch;</li>
 *   <li>{@code :66-82} the 1/256 mushroom spawn — {@code isAirBlock(up)}
 *       first, then the 9×5×9 (dx −4..4, dy −2..2, dz −4..4) mushroom
 *       census; more than 2 neighbors = return false (the R196 cap —
 *       spawn rows/skip rows both judged);</li>
 *   <li>{@code :84-118} the 8-sample dark spread — every attempt draws
 *       {@code dx=rand(3)−1, dy=rand(5)−2, dz=rand(3)−1}; the R196
 *       break-check condition is LITERAL —
 *       {@code dy != -1 && dy != 0 && dy != 1 || dx == 0 || dz == 0}
 *       (dy=±2 vertical hops or the straight-line horizontal crawls;
 *       diagonals with dy∈{−1,0,1} are NOT break-checked inside the loop)
 *       — each break candidate needs the target block ∈ {dirt, grass,
 *       tilledField}, target light (y+1) ≤ 13 and {@code isLegalAt}; after
 *       the loop the LAST drawn candidate runs the full tail validation
 *       ({@code isLegalAt && !isLiquidBlock(y+1) && the block-light face
 *       again && the block type} + {@code !isOutdoors}) and a pass spreads
 *       mycelium — R196 verbatim, tail orders included;</li>
 *   <li>{@code :119-121} the daylight death face — {@code isDaytime() &&
 *       (!rain || freezing) → dirt} (B-19 as-is); the rainy non-freezing
 *       day shields the sunlit site.</li>
 * </ul>
 * 1.12 carriers: {@code getBlockLightValue(x,y+1,z)} =
 * {@link World#getLightFromNeighbors}, {@code isOutdoors(x,y,z)} =
 * the {@code canSeeSky(pos.up())} proxy, {@code isLiquidBlock} =
 * {@code material().isLiquid()}, {@code isLegalAt} =
 * {@code isValidPosition(world, pos)} (C-note ③, the MITE block-legality
 * face has no exact 1.12 API; the spread-target family dirt/grass/
 * tilledField passes this family's check), {@code blockLightFace targets}
 * read the C-16 {@link ETIMRain} helpers for the death seat only.
 * The MITE {@code super.updateTick} boolean base face has no 1.12
 * counterpart (C-note ②).
 * Judge rows (the block-face farm lane, {@code farmDebugLog} gate, the
 * B-19 family shape): {@code mycelium src=rainDeath …} (unchanged byte
 * shape), {@code mycelium src=waterAbove …}, {@code mycelium src=spawn …},
 * {@code mycelium src=skip reason=neighborCap …}, {@code mycelium
 * src=spread …}.
 */
@Mixin(BlockMycelium.class)
public abstract class MixinBlockMycelium {

    private static final int LIGHT_TOLERANCE = 13; // R196 :41-43 getLightValueTolerance()

    @Inject(method = "updateTick", at = @At("HEAD"), cancellable = true)
    private void etim$r196UpdateTick(World worldIn, BlockPos pos, IBlockState state, Random rand, CallbackInfo ci) {
        if (!worldIn.isRemote) {
            if (!ETIMConfig.livestockNeedsR196) {
                return; // the flag seat — flag off = the vanilla body keeps its flow
            }
            // R196 :56-58 — the water-above face (no 1/4 gate, it precedes :60)
            if (worldIn.getBlockState(pos.up()).getMaterial() == net.minecraft.block.material.Material.WATER) {
                ETIMFarm.row("mycelium src=waterAbove pos=" + key(pos));
                toDirt(worldIn, pos);
                ci.cancel();
                return;
            }
            // R196 :60-62 — the 1/4 roll gates the whole body (spread AND death)
            if (rand.nextInt(4) > 0) {
                ci.cancel(); // the 3/4 miss — R196 consumed the tick, the vanilla flow stays retired
                return;
            }
            // R196 :64 — the umbrella door (dark = light ≤ 13 && !isOutdoors)
            boolean dark = worldIn.getLightFromNeighbors(pos.up()) <= LIGHT_TOLERANCE
                    && !worldIn.canSeeSky(pos.up());
            if (dark) {
                // R196 :66-82 — the 1/256 mushroom spawn with the 9×5×9 census cap
                if (rand.nextInt(256) == 0 && worldIn.isAirBlock(pos.up())) {
                    int mushrooms = countMushrooms(worldIn, pos);
                    if (mushrooms > 2) {
                        ETIMFarm.row("mycelium src=skip reason=neighborCap count=" + mushrooms
                                + " pos=" + key(pos));
                        ci.cancel();
                        return;
                    }
                    worldIn.setBlockState(pos.up(), Blocks.BROWN_MUSHROOM.getDefaultState()); // R196 :79
                    ETIMFarm.row("mycelium src=spawn pos=" + key(pos.up()) + " neighborCount=" + mushrooms);
                    ci.cancel();
                    return;
                }
                // R196 :84-118 — the 8-sample dark spread (the LITERAL break-check)
                int dx = 0;
                int dy = 0;
                int dz = 0;
                for (int attempt = 0; attempt < 8; attempt++) {
                    dx = rand.nextInt(3) - 1;
                    dy = rand.nextInt(5) - 2;
                    dz = rand.nextInt(3) - 1;
                    if ((dy != -1 && dy != 0 && dy != 1) || dx == 0 || dz == 0) { // R196 :87 literal
                        BlockPos target = pos.add(dx, dy, dz);
                        IBlockState ts = worldIn.getBlockState(target);
                        if (isSpreadTarget(ts)
                                && worldIn.getLightFromNeighbors(target.up()) <= LIGHT_TOLERANCE
                                && canCarry(worldIn, target)) { // isLegalAt carrier (C-note ③)
                            break;
                        }
                    }
                }
                BlockPos target = pos.add(dx, dy, dz);
                IBlockState ts = worldIn.getBlockState(target);
                // R196 :102-118 — the tail validation (the last drawn candidate, break or not)
                if (canCarry(worldIn, target)
                        && !worldIn.getBlockState(target.up()).getMaterial().isLiquid()
                        && isSpreadTarget(ts)
                        && worldIn.getLightFromNeighbors(target.up()) <= LIGHT_TOLERANCE
                        && !worldIn.canSeeSky(target.up())) {
                    worldIn.setBlockState(target, Blocks.MYCELIUM.getDefaultState()); // R196 :117
                    ETIMFarm.row("mycelium src=spread from=" + key(pos) + " to=" + key(target)
                            + " dx=" + dx + " dy=" + dy + " dz=" + dz + " attempts=8");
                }
                ci.cancel();
                return;
            }
            // R196 :119-121 — the daylight death face (B-19 byte-kept)
            if (worldIn.isDaytime()) {
                boolean rain = ETIMRain.isPrecipitating(worldIn);
                boolean freezing = ETIMRain.isFreezing(worldIn.getBiome(pos));
                if (rain && !freezing) {
                    ci.cancel(); // the survival seat — the rainy day shields the sunlit site (R196 else-if not taken)
                    return;
                }
                ETIMFarm.row("mycelium src=rainDeath pos=" + key(pos)
                        + " light=" + worldIn.getLightFromNeighbors(pos.up())
                        + " rain=" + rain + " freezing=" + freezing
                        + " sky=" + worldIn.canSeeSky(pos.up()));
                toDirt(worldIn, pos);
                ci.cancel();
                return;
            }
            ci.cancel(); // night non-dark: R196 does nothing, the vanilla flow stays retired
        }
    }

    private void toDirt(World worldIn, BlockPos pos) {
        worldIn.setBlockState(pos, Blocks.DIRT.getDefaultState()
                .withProperty(BlockDirt.VARIANT, BlockDirt.DirtType.DIRT)); // R196 :120 / :57
    }

    private static boolean isSpreadTarget(IBlockState state) {
        net.minecraft.block.Block block = state.getBlock();
        return block == Blocks.DIRT || block == Blocks.GRASS || block == Blocks.FARMLAND; // R196 :90/:113
    }

    /** R196 {@code isLegalAt} carrier (C-note ③) — the MITE metadata legality
     *  face maps to the below-support check (the same image the
     *  farmland/canSustain family uses in 1.12; a dirt/grass/tilledField
     *  target with solid ground below is always legal). */
    private static boolean canCarry(World worldIn, BlockPos pos) {
        IBlockState below = worldIn.getBlockState(pos.down());
        return below.isTopSolid()
                || below.getMaterial() == net.minecraft.block.material.Material.GROUND
                || below.getMaterial() == net.minecraft.block.material.Material.ROCK;
    }

    /** R196 :68-80 — the 9×5×9 mushroom census, early-out above 2. */
    private static int countMushrooms(World world, BlockPos pos) {
        int mushrooms = 0;
        for (int dx = -4; dx <= 4; dx++) {
            for (int dy = -2; dy <= 2; dy++) {
                for (int dz = -4; dz <= 4; dz++) {
                    if (world.getBlockState(pos.add(dx, dy, dz)).getBlock() instanceof BlockMushroom) {
                        if (++mushrooms > 2) {
                            return mushrooms;
                        }
                    }
                }
            }
        }
        return mushrooms;
    }

    private static String key(BlockPos pos) {
        return pos.getX() + "," + pos.getY() + "," + pos.getZ();
    }
}
