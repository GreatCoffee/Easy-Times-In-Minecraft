package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMMining;
import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemSword;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Task 2.2: route the block-dig progress through the R196 formula
 * ({@link ETIMMining#getProgressPerTick}). This Block method is the single
 * funnel behind {@code IBlockState#getPlayerRelativeBlockHardness}, consumed
 * by BOTH the client digging clock and the server progress/reporting path —
 * one injection keeps both sides in the same tick math.
 *
 * <p>Creative mode keeps the vanilla piano (instant break) untouched, and
 * {@code miningReform = false} falls back to the vanilla body entirely.</p>
 */
@Mixin(Block.class)
public abstract class MixinBlock {

    @Inject(
            method = "getPlayerRelativeBlockHardness(Lnet/minecraft/block/state/IBlockState;Lnet/minecraft/entity/player/EntityPlayer;Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;)F",
            at = @At("HEAD"),
            cancellable = true)
    private void etim$r196ProgressPerTick(IBlockState state, EntityPlayer player, World world, BlockPos pos,
            CallbackInfoReturnable<Float> cir) {
        if (!ETIMConfig.miningReform) {
            return;
        }
        // Audit P1.4: creative WITH a sword harvests nothing at all — not
        // even block removal (ItemInWorldManager.java:127-129 door). The
        // vanilla creative channel consults the same funnel, so a 0F return
        // blocks the instant as well as progressive digging.
        if (player.capabilities.isCreativeMode) {
            cir.setReturnValue(player.getHeldItemMainhand().getItem() instanceof ItemSword ? 0.0F : 1.0F);
            return;
        }
        cir.setReturnValue(ETIMMining.getProgressPerTick(player, state, world, pos));
    }

    /**
     * Task 2.4 diagnosis workbench: raw probe on cake placement (the vanilla
     * funnel every placement path ends in). Both sides run it, so a placement
     * executed locally (prediction) still shows up as its own [client] line.
     */
    @Inject(
            method = "onBlockAdded(Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/state/IBlockState;)V",
            at = @At("HEAD")
    )
    private void etim$cakePlacedProbe(World world, BlockPos pos, IBlockState state, CallbackInfo ci) {
        if (!ETIMConfig.ingestDebugLog || !(state.getBlock() instanceof net.minecraft.block.BlockCake)) {
            return;
        }
        io.github.etim.etim.ETIM.LOGGER.info("[IngestLog] cake PLACED {} bites=0 pos={}",
                world.isRemote ? "[client]" : "[server]", pos);
    }
}
