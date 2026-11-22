package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.world.ETIMMountRules;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.item.ItemSkull;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * R196 skulls are {@code BlockMounted} instances and go through
 * {@code canMountToBlock} ({@code BlockSkull.java:57-73}); 1.12
 * {@link ItemSkull#onItemUse} bypasses {@code World#mayPlace} and writes the
 * block directly ({@code ItemSkull.java:70-78}), so the mount rules never run
 * for them. The landing cell and the mounting face are therefore recomputed
 * here exactly as that method does it ({@code ItemSkull.java:43-66}) and fed to
 * {@link ETIMMountRules#rejectsPlacement}.
 */
@Mixin(ItemSkull.class)
public abstract class MixinItemSkull {

    @Inject(
            method = "onItemUse",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$denyMountedSkull(
            EntityPlayer player, World worldIn, BlockPos pos, EnumHand hand,
            EnumFacing facing, float hitX, float hitY, float hitZ,
            CallbackInfoReturnable<EnumActionResult> cir) {
        if (!ETIMConfig.mountedR196 || facing == EnumFacing.DOWN) {
            return; // DOWN is rejected by vanilla itself
        }
        BlockPos landing = pos;
        EnumFacing mountedOn = facing;
        IBlockState clicked = worldIn.getBlockState(landing);
        if (clicked.getBlock().isReplaceable(worldIn, landing)) {
            // ItemSkull.java:49-53 — a replaceable click means the top face of
            // the block below is the support.
            mountedOn = EnumFacing.UP;
            landing = landing.down();
            clicked = worldIn.getBlockState(landing);
        }
        if (!clicked.getBlock().isReplaceable(worldIn, landing)) {
            if (!clicked.getMaterial().isSolid() && !worldIn.isSideSolid(landing, mountedOn, true)) {
                return; // vanilla fails this click on its own
            }
            landing = landing.offset(mountedOn);
        }
        if (ETIMMountRules.rejectsPlacement(worldIn, landing, mountedOn, Blocks.SKULL)) {
            cir.setReturnValue(EnumActionResult.FAIL);
        }
    }
}
