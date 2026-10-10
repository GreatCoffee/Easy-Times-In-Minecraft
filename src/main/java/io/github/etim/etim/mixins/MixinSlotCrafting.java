package io.github.etim.etim.mixins;

import io.github.etim.etim.hunger.ETIMHunger;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.SlotCrafting;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Task 2.3: starving players cannot take crafting output (R196
 * {@code MITEContainerCrafting}: the {@code crafting_ticks} timer only
 * advances while {@code player.crafting_proceed && player.hasFoodEnergy()}
 * (:96) — the hunger gate freezes the timer at zero, so no starved player
 * ever completes a craft; ETIM's barehands no-timer funnel deny is the
 * same outcome. Stage 3's crafting timer binds onto this same gate.
 *
 * <p>HEAD is safe-ish: the ingredient consumption loop lives INSIDE
 * {@code onTake} (the {@code getRemainingItems}/decr loop), so cancelling
 * at HEAD leaves the crafting matrix intact and consumes nothing; the
 * result slot is a synthetic phantom that recomputes from the grid.</p>
 */
@Mixin(SlotCrafting.class)
public abstract class MixinSlotCrafting {

    @Inject(
            method = "onTake",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$denyTakeWhileStarving(EntityPlayer thePlayer, ItemStack stack, CallbackInfoReturnable<ItemStack> cir) {
        if (!io.github.etim.etim.ETIMConfig.hungerCraftDeny || ETIMHunger.hasFoodEnergy(thePlayer)) {
            return;
        }
        ETIMHunger.sendDeniedFeedback(thePlayer, "etim.hunger.craftDeny");
        cir.setReturnValue(ItemStack.EMPTY);
    }
}
