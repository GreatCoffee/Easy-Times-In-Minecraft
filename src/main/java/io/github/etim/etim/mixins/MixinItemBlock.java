package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMHunger;
import io.github.etim.etim.world.ETIMMountRules;
import net.minecraft.block.Block;
import net.minecraft.block.BlockTrapDoor;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemBlock;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Task 2.3: starving players cannot place hard blocks (R196
 * {@code Block.tryPlaceFromHeldItem}, Block.java:2821-2823 — the gate is
 * {@code hardness > 0 && !player.hasFoodEnergy() && !player.inCreativeMode()
 * ? false : tryPlaceBlock(...)}). The verdict runs BEFORE any placement is
 * attempted, on both sides of the try chain: nothing is placed, no ghost
 * block, no place sound (a post-place Forge {@code PlaceEvent} revert would
 * flash a phantom block instead — not R196 semantics).
 *
 * <p>The R196 gate checks the hardness of the block METADATA that would be
 * placed; {@code getStateForPlacement} is skipped (its sole purpose is
 * exotic orientation states) and hardness is read from the planted state.
 * Dispensers place without ItemBlock — R196 exempts them the same way.</p>
 */
@Mixin(ItemBlock.class)
public abstract class MixinItemBlock {

    @Shadow
    @Final
    protected Block block;

    @Inject(
            method = "onItemUse",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$denyHardBlockWhileStarving(
            EntityPlayer player, World worldIn, BlockPos pos, EnumHand hand,
            EnumFacing facing, float hitX, float hitY, float hitZ,
            CallbackInfoReturnable<EnumActionResult> cir) {
        if (!ETIMConfig.hungerPlaceDeny || ETIMHunger.hasFoodEnergy(player) || player.capabilities.isCreativeMode) {
            return;
        }
        ItemStack stack = player.getHeldItem(hand);
        if (stack.isEmpty()) {
            return;
        }
        // ItemBlock's item meta IS the block planted meta (Item.getMetadata is
        // identity here — the exact call onItemUse itself makes).
        IBlockState state = this.block.getStateFromMeta(stack.getMetadata());
        if (state.getBlockHardness(worldIn, pos) <= 0.0F) {
            return;
        }
        cir.setReturnValue(EnumActionResult.FAIL);
        if (!worldIn.isRemote) {
            ETIMHunger.sendDeniedFeedback(player, "etim.hunger.placeDeny");
        }
    }

    /**
     * Trapdoor mounts depend on the half the door itself would take
     * ({@code BlockTrapDoor.java:172-190}); {@code World#mayPlace} carries no
     * state, so the half is resolved here from the click and handed to
     * {@link ETIMMountRules#rejectsPlacement(World, BlockPos, EnumFacing, Block, Boolean)}.
     * The geometry of the click mirrors {@code ItemBlock.onItemUse} itself
     * ({@code ItemBlock.java:45-48} / {@code BlockTrapDoor.java:174-183}).
     */
    @Inject(
            method = "onItemUse",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$denyMismatchedTrapdoor(
            EntityPlayer player, World worldIn, BlockPos pos, EnumHand hand,
            EnumFacing facing, float hitX, float hitY, float hitZ,
            CallbackInfoReturnable<EnumActionResult> cir) {
        if (!ETIMConfig.mountedR196 || !(this.block instanceof BlockTrapDoor)) {
            return;
        }
        BlockPos target = worldIn.getBlockState(pos).getBlock().isReplaceable(worldIn, pos)
                ? pos : pos.offset(facing);
        boolean lower = facing.getAxis().isHorizontal() ? hitY <= 0.5F : facing == EnumFacing.UP;
        if (ETIMMountRules.rejectsPlacement(worldIn, target, facing, this.block, Boolean.valueOf(lower))) {
            cir.setReturnValue(EnumActionResult.FAIL);
        }
    }
}
