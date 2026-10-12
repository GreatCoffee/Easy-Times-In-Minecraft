package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.furnace.FurnaceHeat;
import net.minecraft.inventory.IInventory;
import net.minecraft.item.ItemStack;
import net.minecraft.item.crafting.FurnaceRecipes;
import net.minecraft.tileentity.TileEntityFurnace;
import net.minecraft.tileentity.TileEntityHopper;
import net.minecraft.util.EnumFacing;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * The vanilla hopper push (run26 12:2x stack-proof): transferItemsOut 鈫? * putStackInInventoryAllSlots 鈫?insertStack 鈫?furnace
 * setInventorySlotContents 鈥?the probe rounds showed this line writing
 * straight past the furnace-side admission hooks (deny row and write row
 * coexisted in the same tick), so R196 搂2.5's 銆宧opper 鍚岄棬銆?is enforced on
 * the push primitive itself: if the destination is a furnace and the item
 * violates input-recipe / fuel-heat admission, the whole insertStack call is
 * cancelled and the ORIGINAL stack is returned as the leftover 鈥?the
 * caller's own restock loop (transferItemsOut :274) then puts it back into
 * the hopper. Lossless: nothing drops mid-transfer.
 */
@Mixin(TileEntityHopper.class)
public abstract class MixinTileEntityHopper {

    /** Push-loop dedup (same storm as the sink side 鈥?13:49 round, one line per signature). */
    @Unique
    private static String etim$lastPushSig = "";

    @Inject(
            method = "insertStack",
            at = @At("HEAD"),
            cancellable = true,
            remap = true
    )
    private static void etim$hopperSinkGate(IInventory source, IInventory destination, ItemStack stack,
            int index, EnumFacing direction, CallbackInfoReturnable<ItemStack> cir) {
        if (stack.isEmpty()
                || !ETIMConfig.furnaceHeatSystem
                || !(destination instanceof TileEntityFurnace)) {
            return;
        }
        if (!FurnaceHeat.isEnabled()) {
            return;
        }
        String item = stack.getItem().getRegistryName().toString();
        if (index == 0
                && ETIMConfig.furnaceInputRecipeGate
                && FurnaceRecipes.instance().getSmeltingResult(stack).isEmpty()) {
            String sig = item + "@no-recipe";
            if (ETIMConfig.furnaceDebugLog && !sig.equals(etim$lastPushSig)) {
                etim$lastPushSig = sig;
                ETIM.LOGGER.info("[FurnaceLog] hopper push denied no-recipe item=" + item + " [server]");
            }
            cir.setReturnValue(stack);
            return;
        }
        if (index == 1) {
            int heat = FurnaceHeat.getHeatOf(stack);
            if (heat <= 0 || heat > FurnaceHeat.getVanillaCap()) {
                String sig = item + "@fuel" + heat;
                if (ETIMConfig.furnaceDebugLog && !sig.equals(etim$lastPushSig)) {
                    etim$lastPushSig = sig;
                    ETIM.LOGGER.info("[FurnaceLog] hopper push denied fuel heat=" + heat
                            + " cap=" + FurnaceHeat.getVanillaCap() + " item=" + item + " [server]");
                }
                cir.setReturnValue(stack);
                return;
            }
        }
    }
}

