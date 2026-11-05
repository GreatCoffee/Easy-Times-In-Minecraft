package io.github.etim.etim.mixins;

import io.github.etim.etim.farm.ETIMFarm;
import net.minecraft.block.BlockStem;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Farmland-moisture batch (条 283, D-3 甲 + A-4): the stem arm of the same
 * dry-farmland hard gate (判窗 亲钉 two injectors). See
 * {@link MixinBlockCropsTick} for the overflow rationale.
 */
@Mixin(BlockStem.class)
public abstract class MixinBlockStemTick {

    @Inject(method = "updateTick", at = @At("HEAD"), cancellable = true)
    private void etim$dryGate(World world, BlockPos pos, net.minecraft.block.state.IBlockState state,
                              java.util.Random rand, CallbackInfo ci) {
        if (!world.isRemote && ETIMFarm.isDryFarmland(world, pos.down())) {
            ETIMFarm.row("growth gate dry block=" + state.getBlock().getRegistryName()
                    + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
            // Drought-death batch (B-8): stem arm — R196 :63 setDead face is
            // carrier-substituted to etim:dead_stem (D-2 乙); additive only.
            ETIMFarm.droughtDeathTick(world, pos, state, rand);
            ci.cancel();
            return;
        }
        // growth-rate batch (B-9): the stem freeze face — R196 :68 reads only
        // the lower light bound (see growthFreezeProbe's stem branch).
        if (!world.isRemote && ETIMFarm.growthFreezeProbe(world, pos, state.getBlock())) {
            ci.cancel();
        }
    }
}
