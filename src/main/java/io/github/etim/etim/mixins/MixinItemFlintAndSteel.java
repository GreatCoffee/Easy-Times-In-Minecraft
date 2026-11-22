package io.github.etim.etim.mixins;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.Item;
import net.minecraft.item.ItemFlintAndSteel;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.world.ETIMSpecialBlocks;

/**
 * R196 {@code ItemFlintAndSteel.onItemRightClick} ({@code :78-90}): the
 * non-TNT branch requires an air neighbour, writes {@code Block.spark} and
 * wears one point; the spark's own {@code onBlockAdded} then decides between a
 * portal and a two-tick burn ({@code BlockSpark.java:21-27}).
 *
 * <p>1.12 instead writes fire straight away
 * ({@code item/ItemFlintAndSteel.java:43}) and wears a point even when the
 * neighbour is occupied ({@code :51}). Two fixes ride here:</p>
 * <ul>
 *   <li>the single {@code setBlockState} call in {@code onItemUse} is
 *       redirected to the spark carrier ({@code require = 1});</li>
 *   <li>a HEAD gate refuses the use when the neighbour cell is not air, which
 *       both restores R196's ordering and skips the wear. The gate computes
 *       {@code pos.offset(facing)} itself because 1.12 only offsets later,
 *       inside the method body.</li>
 * </ul>
 *
 * <p>The TNT half needs nothing: 1.12 {@code BlockTNT.onBlockActivated}
 * ({@code block/BlockTNT.java:101-112}) consumes flint-and-steel before item
 * use ever runs, which already matches R196's ignite-and-wear pair.</p>
 *
 * <p>Durability follows R196: {@code setMaxDamage(16)} in the constructor
 * tail (1.12 ships 64).</p>
 */
@Mixin(ItemFlintAndSteel.class)
public abstract class MixinItemFlintAndSteel {

    @Inject(method = "<init>", at = @At("TAIL"))
    private void etim$r196Durability(CallbackInfo ci) {
        if (!ETIMConfig.sparkR196) {
            return;
        }
        Item self = (Item) (Object) this;
        if (self.getMaxDamage() == 64) {
            self.setMaxDamage(16);
        }
    }

    @Inject(method = "onItemUse", at = @At("HEAD"), cancellable = true)
    private void etim$neighbourMustBeAir(EntityPlayer player, World worldIn, BlockPos pos, EnumHand hand,
                                         EnumFacing facing, float hitX, float hitY, float hitZ,
                                         CallbackInfoReturnable<EnumActionResult> cir) {
        if (!ETIMConfig.sparkR196) {
            return;
        }
        if (!worldIn.isAirBlock(pos.offset(facing))) {
            cir.setReturnValue(EnumActionResult.FAIL);
        }
    }

    @Redirect(
            method = "onItemUse",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/world/World;setBlockState(Lnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/state/IBlockState;I)Z"),
            require = 1
    )
    private boolean etim$sparkInsteadOfFire(World world, BlockPos pos, IBlockState state, int flags) {
        if (!ETIMConfig.sparkR196) {
            return world.setBlockState(pos, state, flags);
        }
        return world.setBlockState(pos, ETIMSpecialBlocks.SPARK.getDefaultState(), flags);
    }
}
