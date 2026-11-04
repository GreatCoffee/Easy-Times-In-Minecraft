package io.github.etim.etim.mixins;

import io.github.etim.etim.farm.ETIMFarm;
import net.minecraft.block.BlockFarmland;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.biome.Biome;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.Random;

/**
 * Farmland-moisture batch (条 283, D-1/D-2 甲): the R196 moisture machine
 * replaces the vanilla {@code updateTick} WHOLE (1.12: rain/water → instant
 * 7, no temperature gate; R196: the water/snow-ice scan hydrates to 7, rain
 * is a +1-per-random-tick DRIP, and the drying face rides
 * {@code chanceOfDrying = temperature − 0.15 − (highHumidity?0.5)} with the
 * 3×3-above crops/ no-crops dirt-decay face).
 *
 * <p>Order (R196 BlockFarmland.updateTick :47-65 one-hand): water nearby →
 * water() (dry→7; A-2 already-wet = no-op); else rain → wetness+1 drip; else
 * the drying roll (dot = clamp≥0) → wetness−1, or at wetness 0 the dirt
 * decay (air above AND no crops nearby — the 3×3 face).</p>
 *
 * <p>消 face bridge (终审 裁量③): the R196 {@code canLightningStrikeAt}
 * rain face rides {@code world.isRainingAt(pos.up())} (the C-16 three-claw
 * note — rainStrength>0.2/canSnowAt/blood-moon are NOT ported). The decay
 * face pays the vanilla {@code turnToDirt} (B-14 — the entity lift-up half
 * stays).</p>
 */
@Mixin(BlockFarmland.class)
public abstract class MixinBlockFarmland {

    @org.spongepowered.asm.mixin.Shadow
    protected static void turnToDirt(World worldIn, BlockPos pos) {
        throw new AssertionError("shadow");
    }

    @Inject(method = "updateTick", at = @At("HEAD"), cancellable = true)
    private void etim$r196MoistureTick(World world, BlockPos pos, IBlockState state, Random rand, CallbackInfo ci) {
        if (world.isRemote) {
            return; // vanilla body is server-side only; leave it for the pool-off/正 face
        }
        int moisture = state.getValue(BlockFarmland.MOISTURE);
        if (ETIMFarm.waterNearbyR196(world, pos)) {
            if (moisture < 7) {
                world.setBlockState(pos, state.withProperty(BlockFarmland.MOISTURE, 7), 2);
                ETIMFarm.row("moisture tick pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                        + " src=water wet=" + moisture + "→" + 7);
            }
        } else if (world.isRainingAt(pos.up())) {
            if (moisture < 7) {
                int next = moisture + 1; // D-1 甲: the rain DRIP (+1 per random tick)
                world.setBlockState(pos, state.withProperty(BlockFarmland.MOISTURE, next), 2);
                ETIMFarm.row("moisture tick pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                        + " src=rain wet=" + moisture + "→" + next);
            }
        } else {
            Biome biome = world.getBiome(pos);
            float chance = biome.getDefaultTemperature() - 0.15F
                    - (biome.isHighHumidity() ? 0.5F : 0.0F);
            if (chance < 0.0F) {
                chance = 0.0F;
            }
            if (rand.nextFloat() >= chance) {
                ETIMFarm.row("moisture chance pos=" + pos.getX() + "," + pos.getZ()
                        + " temp=" + String.format(java.util.Locale.ROOT, "%.2f", biome.getDefaultTemperature())
                        + " humid=" + (biome.isHighHumidity() ? 1 : 0)
                        + " chance=" + String.format(java.util.Locale.ROOT, "%.2f", chance) + " ksip=keep");
            } else if (moisture > 0) {
                int next = moisture - 1;
                world.setBlockState(pos, state.withProperty(BlockFarmland.MOISTURE, next), 2);
                ETIMFarm.row("moisture tick pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                        + " src=dry wet=" + moisture + "→" + next);
            } else if (world.isAirBlock(pos.up()) && !ETIMFarm.cropsNearbyR196(world, pos)) {
                turnToDirt(world, pos); // B-14: the entity lift-up half STAYS
                ETIMFarm.row("moisture decay pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                        + " → dirt (no crops nearby)");
            }
        }
        ci.cancel();
    }
}
