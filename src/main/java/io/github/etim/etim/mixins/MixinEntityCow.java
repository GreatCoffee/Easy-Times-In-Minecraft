package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.passive.EntityCow;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumHand;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * B-10 (条 300) — the R196 milking face. Vanilla 1.12 EntityCow gives an
 * infinite milk bucket for one empty bucket (no meter); R196
 * ItemVessel.tryEntityInteraction :100-115 gates the serve on the FULL
 * milk meter ({@code standard_volume * 25} with the bucket's 4 = 100 = the
 * whole 0..100 meter) and drains exactly that on serve. While
 * livestockProductionR196 is on, ANY empty-bucket click on a cow is answered
 * by ETIMLivestockEvents.milkClick (serve / deny row) and the vanilla body
 * must not run — an un-cancelled vanilla path would resurrect infinite
 * milk. With the switch off the vanilla body stands untouched.
 */
@Mixin(EntityCow.class)
public abstract class MixinEntityCow {

    @Inject(method = "processInteract", at = @At("HEAD"), cancellable = true)
    private void etim$milkGate(EntityPlayer player, EnumHand hand, CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.livestockProductionR196) {
            return;
        }
        ItemStack stack = player.getHeldItem(hand);
        if (stack.getItem() != Items.BUCKET || stack.isEmpty()) {
            return; // non-bucket hands keep the vanilla processInteract path
        }
        cir.setReturnValue(ETIMLivestockEvents.milkClick((EntityCow) (Object) this, player, hand));
    }
}
