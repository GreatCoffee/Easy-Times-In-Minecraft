package io.github.etim.etim.mixins;

import net.minecraft.block.BlockAnvil;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * 金属砧块批 T4① — the R196 above-cell gate (R196 BlockAnvil :68-81:
 * {@code onBlockActivated} refuses when the cell ABOVE the anvil is not
 * air/passable). Vanilla 1.12 has no such gate (终审定谳: :115-123 opens the
 * GUI unconditionally, displayGui(IInteractionObject, pos) — the mixin is the
 * minimal HEAD injection, both sides).
 *
 * <p>R196 :69 = {@code !world.isAirOrPassableBlock(x, y+1, z, false)} — the
 * 1.12 counterpart is the block material's replaceability (air, grass, snow
 * layers et al are replaceable); a solid block or a tile-entity block above
 * (e.g. a chest) refuses the GUI.</p>
 *
 * <p>The TE check (R196 :74-77) is a no-op here (终审补-3): the vanilla face
 * resolves its interaction object from the blockstate, no TE involved.</p>
 */
@Mixin(BlockAnvil.class)
public abstract class MixinBlockAnvil {

    @Inject(method = "onBlockActivated", at = @At("HEAD"), cancellable = true)
    private void etim$aboveCellGate(World worldIn, BlockPos pos, IBlockState state, EntityPlayer playerIn,
                                    EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ,
                                    CallbackInfoReturnable<Boolean> cir) {
        if (worldIn.getBlockState(pos.up()).getMaterial().isReplaceable()) {
            return; // the cell above passes — vanilla flow opens the GUI
        }
        cir.setReturnValue(false); // R196 :69 — blocked above, no GUI
    }
}
