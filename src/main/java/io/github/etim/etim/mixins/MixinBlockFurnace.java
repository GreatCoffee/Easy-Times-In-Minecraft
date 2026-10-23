package io.github.etim.etim.mixins;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import io.github.etim.etim.metal.ETIMBlockFurnace;
import net.minecraft.block.BlockFurnace;
import net.minecraft.block.state.IBlockState;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * Batch B1 (终审 B-4 双方块同构): the vanilla furnace loop fires the STATIC
 * {@code BlockFurnace.setState} (TileEntityFurnace.update →
 * BlockFurnace.setState :303-306) which is HARDCODED to the vanilla
 * FURNACE/LIT_FURNACE pair — an ETIM furnace would be silently replaced by
 * a vanilla one on its first ignition. This HEAD route hands ETIM blocks
 * their own twin swap (R196 updateFurnaceBlockState shape: keep-inventory
 * swap + re-validated TE) and leaves every vanilla call untouched.
 */
@Mixin(BlockFurnace.class)
public abstract class MixinBlockFurnace {

    @Inject(
            method = "setState",
            at = @At("HEAD"),
            cancellable = true,
            remap = true
    )
    private static void etim$routeEtimTwinSwap(boolean active, World worldIn, BlockPos pos, CallbackInfo ci) {
        IBlockState state = worldIn.getBlockState(pos);
        if (state.getBlock() instanceof ETIMBlockFurnace) {
            ((ETIMBlockFurnace) state.getBlock()).setBurningTwin(active, worldIn, pos, state);
            ci.cancel();
        }
    }
}
