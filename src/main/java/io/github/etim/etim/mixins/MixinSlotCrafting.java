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
 * Task 2.3 (hunger): starving players cannot take crafting output (R196
 * {@code MITEContainerCrafting}: the {@code crafting_ticks} timer only
 * advances while {@code player.crafting_proceed && player.hasFoodEnergy()}
 * (:96) — the hunger gate freezes the timer, so no starved player ever
 * completes a craft; ETIM's barehands no-timer funnel deny is the same
 * outcome.
 *
 * <p>HEAD is safe-ish for the deny semantics: the ingredient consumption
 * loop lives INSIDE {@code onTake}, so cancelling at HEAD leaves the crafting
 * matrix intact. The stage-3 result-slot lock lives in {@link MixinSlot}
 * (canTakeStack) and the click signal in {@link MixinContainer} (slotClick) —
 * per the R196 original structure, NOT here: vanilla 1.12.2 hands the result
 * to the cursor and clears the slot BEFORE onTake, so a HEAD-cancel here
 * cannot reclaim the product.</p>
 *
 * <p>Note: the modular driver (ETIMCrafting) auto-grants finished crafts
 * through this same onTake; starving players never reach completion because
 * the driver freezes.</p>
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
