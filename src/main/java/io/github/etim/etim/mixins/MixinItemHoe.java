package io.github.etim.etim.mixins;

import io.github.etim.etim.hunger.ETIMEndurance;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemHoe;
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
 * Endurance hoe drain (v2+ Endurance order, R196 ItemHoe:75-77 = on a
 * successful till the server charges {@code blockHardness / 2 × endurance
 * modifier}). 1.12 has no successful-till event (UseHoeEvent is the
 * pre-try cancellable hook, not the success face — 终审授权提醒), so this
 * mixin reads the onItemUse return: SUCCESS covers the R196 grass/dirt face
 * plus the 1.12 superset (grass_path, coarse_dirt — D-E2, all variants
 * charge).
 *
 * <p>The original block's hardness is captured at HEAD because the SUCCESS
 * branches have already swapped the block to farmland/dirt by the time their
 * return is reached. The drain inject sits at {@code RETURN} — every return
 * — NOT at {@code TAIL}: 1.12 {@code ItemHoe.onItemUse} returns SUCCESS via
 * early returns and its trailing RETURN is the {@code PASS} face, so a TAIL
 * hook never sees a till (judged R8, endurance-verdict: hoeDrain 恒 0 + the
 * missing stamp let the till's own PlaceEvent charge as a full-hardness
 * placement). The SUCCESS guard filters the FAIL/PASS returns. The charge
 * funnel is server-side only; the client's prediction SUCCESS is a no-op.
 * The same tick's PlaceEvent (the till wrapped in
 * ForgeHooks.onPlaceItemIntoWorld) is skipped inside
 * {@code ETIMEndurance.chargePlace} via the stamp set at the SUCCESS
 * return.</p>
 */
@Mixin(ItemHoe.class)
public abstract class MixinItemHoe {

    private static final ThreadLocal<IBlockState> etim$captured = new ThreadLocal<IBlockState>();

    @Inject(method = "onItemUse", at = @At("HEAD"))
    private void etim$capture(EntityPlayer player, World world, BlockPos pos, EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ, CallbackInfoReturnable<EnumActionResult> cir) {
        etim$captured.set(world.getBlockState(pos));
    }

    @Inject(method = "onItemUse", at = @At("RETURN"))
    private void etim$hoeDrain(EntityPlayer player, World world, BlockPos pos, EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ, CallbackInfoReturnable<EnumActionResult> cir) {
        IBlockState captured = etim$captured.get();
        etim$captured.remove();
        if (cir.getReturnValue() != EnumActionResult.SUCCESS || captured == null) {
            return;
        }
        ETIMEndurance.chargeHoe(player, captured.getBlockHardness(world, pos));
    }
}
