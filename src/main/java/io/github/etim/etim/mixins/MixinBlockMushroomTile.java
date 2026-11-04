package io.github.etim.etim.mixins;

import io.github.etim.etim.farm.ETIMMushroomGrowthTile;

import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Farmland-moisture B-3 修 TE seam (W-FM7 回归 A-2, audit20 条 284): vanilla
 * {@code Chunk.addTileEntity} only collects a {@code world.setTileEntity}
 * call when {@code state.hasTileEntity()} is true — the default is false for
 * every non-provider block, so the mushroom stage TE was silently dropped
 * (the same seam farm1 closed for farmland with
 * {@link MixinBlockFarmlandTile}). Two needles declared on {@code Block}
 * itself, filtered by instance identity to the small mushrooms.
 */
@Mixin(Block.class)
public abstract class MixinBlockMushroomTile {

    @Inject(
            method = "hasTileEntity(Lnet/minecraft/block/state/IBlockState;)Z",
            at = @At("HEAD"),
            cancellable = true,
            remap = false
    )
    private void etim$mushroomHasTe(IBlockState state, CallbackInfoReturnable<Boolean> cir) {
        if ((Object) this == Blocks.BROWN_MUSHROOM || (Object) this == Blocks.RED_MUSHROOM) {
            cir.setReturnValue(true);
        }
    }

    @Inject(
            method = "createTileEntity(Lnet/minecraft/world/World;Lnet/minecraft/block/state/IBlockState;)Lnet/minecraft/tileentity/TileEntity;",
            at = @At("HEAD"),
            cancellable = true,
            remap = false
    )
    private void etim$mushroomCreateTe(World world, IBlockState state,
                                       CallbackInfoReturnable<TileEntity> cir) {
        if ((Object) this == Blocks.BROWN_MUSHROOM || (Object) this == Blocks.RED_MUSHROOM) {
            cir.setReturnValue(new ETIMMushroomGrowthTile());
        }
    }
}
