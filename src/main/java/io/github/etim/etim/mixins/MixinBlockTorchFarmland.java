package io.github.etim.etim.mixins;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.IBlockAccess;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

/**
 * R196 {@code BlockMounted.canMountToBlock} first arm ({@code :20-21}):
 * a tilled field mounts anything. The rejection hook
 * ({@code MixinWorldMayPlace}) can only refuse, so the grant needs its own
 * seam: 1.12 asks the support block itself through
 * {@code Block.canPlaceTorchOnTop} ({@code block/Block.java:1919-1925},
 * reached from {@code BlockTorch.canPlaceOn} at {@code :98-102}), which
 * returns {@code state.isTopSolid()} — {@code isOpaque() && isFullCube()} —
 * while farmland is 15/16 high ({@code block/BlockFarmland.java:58
 * isFullCube = false}). The torch would place and then pop on the first
 * neighbour update.
 *
 * <p>Only the torch carrier is widened ({@code C-B69-7}); the other 1.12
 * mounted classes never route through this method and keep their vanilla
 * support tests.</p>
 */
@Mixin(Block.class)
public abstract class MixinBlockTorchFarmland {

    @Inject(method = "canPlaceTorchOnTop", at = @At("HEAD"), cancellable = true, remap = false)
    private void etim$tilledFieldTorch(IBlockState state, IBlockAccess world, BlockPos pos,
                                       CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mountedR196 || (Object) this != Blocks.FARMLAND) {
            return;
        }
        if (ETIMConfig.blockDebugLog) {
            ETIM.LOGGER.info("[MountLog] rule=tilled-field-grant face=up block=torch"
                            + " support=minecraft:farmland result=allow pos={},{},{} [server]",
                    pos.getX(), pos.getY() + 1, pos.getZ());
        }
        cir.setReturnValue(true);
    }
}
