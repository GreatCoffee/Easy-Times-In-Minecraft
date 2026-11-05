package io.github.etim.etim.mixins;

import io.github.etim.etim.farm.ETIMFarm;
import net.minecraft.block.BlockCrops;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Farmland-moisture batch (条 283, D-3 甲): the R196 growth hard gate — dry
 * farmland means ZERO growth (R196 BlockCrops/BlockStem getGrowthRate head
 * face; farm1 C-2 收编位).
 *
 * <p>判窗 A-3 亲钉 (条 281): the gate can NOT ride {@code getGrowthChance}
 * returning 0.0F — vanilla {@code updateTick} computes
 * {@code (int)(25.0F/f) + 1}, which overflows to {@code Integer.MIN_VALUE}
 * and {@code Random.nextInt} throws {@code IllegalArgumentException} →
 * dedicated-server crash. So the gate HEAD-cancels THIS {@code updateTick}
 * directly (zero growth for the tick, no arithmetic touched). A-4: the two
 * hosts (crops / stem) each carry their own mixin (终审 B-15 one-class-one-file).</p>
 */
@Mixin(BlockCrops.class)
public abstract class MixinBlockCropsTick {

    @Inject(method = "updateTick", at = @At("HEAD"), cancellable = true)
    private void etim$dryGate(World world, BlockPos pos, net.minecraft.block.state.IBlockState state,
                              java.util.Random rand, CallbackInfo ci) {
        if (!world.isRemote && ETIMFarm.isDryFarmland(world, pos.down())) {
            ETIMFarm.row("growth gate dry block=" + state.getBlock().getRegistryName()
                    + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
            // Drought-death batch (B-8, D-4 乙补面): the R196 :66-74 death arm
            // rides the SAME face as the freeze gate — additive only, the
            // cancel below stays the 条 283 verdict unchanged.
            ETIMFarm.droughtDeathTick(world, pos, state, rand);
            ci.cancel();
            return;
        }
        // growth-rate batch (B-9, D-1/D-3 直抄): the R196 light window + the
        // temperature-zero rate gate — growth, and only growth, freezes this
        // tick (the dry gate above already owns its own branch).
        if (!world.isRemote && ETIMFarm.growthFreezeProbe(world, pos, state.getBlock())) {
            ci.cancel();
        }
    }
}
