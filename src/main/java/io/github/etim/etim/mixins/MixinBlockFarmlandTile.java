package io.github.etim.etim.mixins;

import io.github.etim.etim.tileentity.ETIMFarmlandTile;

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
 * farm1 (batch B4, audit20 条 254-257 D-1): the fertilized-bit carrier for
 * vanilla farmland — a TE instead of the R196 metadata bit-8 (1.12 dead:
 * {@code getStateFromMeta = meta & 7} + palette-only chunk storage, 终审
 * 条 257 亲证；HC census 挂账行 spare). The two hooked methods are declared
 * on {@code Block} itself (Block.java:1610/:1623) — a mixin on
 * BlockFarmland would never match them (targets must declare the method),
 * so this mixin pins Block and filters by instance identity.
 *
 * <p>Side effects (终审 B-7): the only referent of {@code hasTileEntity} in
 * Block's own faces is {@code isTileProvider}-defaulted {@code false}, so
 * every non-farmland block keeps returning its native value; BlockFarmland
 * overrides {@code isFullCube=false} itself so the render side is untouched.
 * The TE dies with the block (vanilla removes the TE on setBlockState —
 * turnToDirt included), which is exactly R196's "fertilized lives with the
 * block" semantics.</p>
 */
@Mixin(Block.class)
public abstract class MixinBlockFarmlandTile {

    @Inject(
            method = "hasTileEntity(Lnet/minecraft/block/state/IBlockState;)Z",
            at = @At("HEAD"),
            cancellable = true,
            remap = false
    )
    private void etim$farmlandHasTe(IBlockState state, CallbackInfoReturnable<Boolean> cir) {
        if ((Object) this == Blocks.FARMLAND) {
            cir.setReturnValue(true);
        }
    }

    @Inject(
            method = "createTileEntity(Lnet/minecraft/world/World;Lnet/minecraft/block/state/IBlockState;)Lnet/minecraft/tileentity/TileEntity;",
            at = @At("HEAD"),
            cancellable = true,
            remap = false
    )
    private void etim$farmlandCreateTe(World world, IBlockState state,
                                       CallbackInfoReturnable<TileEntity> cir) {
        if ((Object) this == Blocks.FARMLAND) {
            cir.setReturnValue(new ETIMFarmlandTile());
        }
    }
}
