package io.github.etim.etim.mixins;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.item.ItemSign;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.world.ETIMMountRules;

/**
 * R196 {@code BlockSign extends BlockMounted}, so both sign kinds obey
 * {@code canMountToBlock}. 1.12 {@code ItemSign.onItemUse}
 * ({@code item/ItemSign.java:31-86}) never calls {@code World#mayPlace} — it
 * only asks {@code Blocks.STANDING_SIGN.canPlaceBlockAt} ({@code :41}) and
 * then writes the block directly ({@code :54} / {@code :58}) — which is why
 * the {@link MixinWorldMayPlace} hook alone let signs through.
 *
 * <p>This HEAD gate replays the vanilla landing arithmetic and routes it into
 * the shared rules:</p>
 * <ul>
 *   <li>standing sign ({@code facing == UP}): lands at the clicked cell when
 *       that cell is replaceable ({@code :49} {@code pos.down()}), otherwise
 *       at {@code clicked.offset(UP)}; the mounting face is the top of the
 *       block below;</li>
 *   <li>wall sign (any horizontal face): lands at
 *       {@code clicked.offset(facing)} and mounts on the clicked face.</li>
 * </ul>
 *
 * <p>Server only; the client copy gets the result back from the server.</p>
 */
@Mixin(ItemSign.class)
public abstract class MixinItemSign {

    @Inject(method = "onItemUse", at = @At("HEAD"), cancellable = true)
    private void etim$mountRules(EntityPlayer player, World worldIn, BlockPos pos, EnumHand hand,
                                 EnumFacing facing, float hitX, float hitY, float hitZ,
                                 CallbackInfoReturnable<EnumActionResult> cir) {
        if (!ETIMConfig.mountedR196 || worldIn.isRemote || facing == EnumFacing.DOWN) {
            return;
        }
        IBlockState clickedState = worldIn.getBlockState(pos);
        boolean replaceable = clickedState.getBlock().isReplaceable(worldIn, pos);
        if (!clickedState.getMaterial().isSolid() && !replaceable) {
            return; // vanilla refuses this too
        }
        if (replaceable && facing != EnumFacing.UP) {
            return; // vanilla refuses this too
        }

        if (facing == EnumFacing.UP) {
            BlockPos landing = replaceable ? pos : pos.offset(EnumFacing.UP);
            Block standing = Blocks.STANDING_SIGN;
            if (ETIMMountRules.rejectsPlacement(worldIn, landing, EnumFacing.UP, standing)) {
                cir.setReturnValue(EnumActionResult.FAIL);
            }
        } else {
            BlockPos landing = pos.offset(facing);
            Block wallSign = Blocks.WALL_SIGN;
            if (ETIMMountRules.rejectsPlacement(worldIn, landing, facing, wallSign)) {
                cir.setReturnValue(EnumActionResult.FAIL);
            }
        }
    }
}
