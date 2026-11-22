package io.github.etim.etim.mixins;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import net.minecraft.block.Block;
import net.minecraft.entity.Entity;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.world.ETIMMountRules;

/**
 * R196 {@code BlockMounted.canMountToBlock} rejection arms at the 1.12 funnel.
 *
 * <p>{@code World#mayPlace(Block, BlockPos, boolean, EnumFacing, Entity)}
 * ({@code world/World.java:3425-3443}) is the one gate every item placement
 * passes — {@code ItemBlock.canPlaceBlockOnSide} calls it with the final cell
 * and the clicked face, and {@code Block.canPlaceBlockOnSide} defaults to it
 * too. Cancelling here refuses the mount for every routed placement path
 * (player right click, dispenser, structure block) without touching the
 * per-block {@code canPlaceBlockAt} bodies.</p>
 *
 * <p>{@code sidePlacedOn} is the clicked support face, which is exactly R196's
 * {@code face} argument; the support block sits at
 * {@code pos.offset(sidePlacedOn.getOpposite())}.</p>
 */
@Mixin(World.class)
public abstract class MixinWorldMayPlace {

    @Inject(method = "mayPlace", at = @At("HEAD"), cancellable = true)
    private void etim$mountRules(Block blockIn, BlockPos pos, boolean skipCollisionCheck,
                                 EnumFacing sidePlacedOn, Entity placer,
                                 CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mountedR196 || sidePlacedOn == null) {
            return;
        }
        World world = (World) (Object) this;
        if (ETIMMountRules.isMountedBlock(blockIn)
                && ETIMMountRules.rejectsPlacement(world, pos, sidePlacedOn, blockIn)) {
            cir.setReturnValue(false);
        }
    }
}
