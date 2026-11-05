package io.github.etim.etim.mixins;

import io.github.etim.etim.farm.ETIMCompost;
import net.minecraft.block.BlockChest;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.tileentity.TileEntityChest;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Manure-source batch (B-7): the chest random-tick carrier. R196 registers
 * the chest for random ticks in the block ctor ({@code BlockChest.java:14
 * setTickRandomly(true)}) and runs the worm-compost pump out of
 * {@code updateTick :180-191}; vanilla 1.12 chests are NOT random-ticked.
 * This mixin (a) flips {@code getTickRandomly} for the R196 chest pair
 * (the BlockChest base covers normal + trapped — R196 {@code BlockStrongbox
 * extends BlockChest} inherits the same ctor face) and (b) pins Block's own
 * {@code randomTick} (a mixin on BlockChest would never match the inherited
 * body — MixinBlockFarmlandTile.java:20-22 pin-Block precedent) and fires
 * the pump. The vanilla default {@code randomTick} body is an
 * effectively-empty chest {@code updateTick} pass-through, so the HEAD
 * injection without cancellation leaves the vanilla face untouched.
 */
@Mixin(net.minecraft.block.Block.class)
public abstract class MixinBlockChestTick {

    @Inject(
            method = "getTickRandomly()Z",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$chestTickRandomly(CallbackInfoReturnable<Boolean> cir) {
        // The chest pair gets the random tick lane back; R196 BlockChest.java:14.
        if ((Object) this == net.minecraft.init.Blocks.CHEST
                || (Object) this == net.minecraft.init.Blocks.TRAPPED_CHEST) {
            cir.setReturnValue(true);
        }
    }

    @Inject(
            method = "randomTick(Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/state/IBlockState;Ljava/util/Random;)V",
            at = @At("HEAD")
    )
    private void etim$chestCompostTick(World world, BlockPos pos,
                                       net.minecraft.block.state.IBlockState state,
                                       java.util.Random rand, CallbackInfo ci) {
        if (state.getBlock() instanceof BlockChest) {
            TileEntity te = world.getTileEntity(pos);
            if (te instanceof TileEntityChest) {
                ETIMCompost.checkForWormComposting((TileEntityChest) te, world, pos, rand);
            }
        }
    }
}
