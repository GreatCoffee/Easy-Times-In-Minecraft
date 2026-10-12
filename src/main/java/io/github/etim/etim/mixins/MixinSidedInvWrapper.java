package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.furnace.FurnaceHeat;
import net.minecraft.item.ItemStack;
import net.minecraft.item.crafting.FurnaceRecipes;
import net.minecraft.tileentity.TileEntityFurnace;
import net.minecraft.util.EnumFacing;
import net.minecraft.inventory.ISidedInventory;
import net.minecraftforge.items.wrapper.SidedInvWrapper;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * THE AUTOMATION SINK (run26 12:0x round, stack-probed): hopper pushes land
 * as {@code SidedInvWrapper.insertItem :120 -> furnace
 * setInventorySlotContents} 鈥?the Forge cap automation route. The wrapper's
 * own consult rows ({@code inv.canInsertItem()/isItemValidForSlot()}) are the
 * theoretical gate, but the probe rounds showed slot writes slip past the
 * TileEntityFurnace-side hooks in the field, so R196 搂2.5's 銆宧opper 鍚岄棬銆? * rule is enforced AT THE SINK: every wrapper insert targeting a furnace is
 * judged here by the SAME admission rules (input slot: recipe exists; fuel
 * slot: heat > 0 && heat &lt;= cap). Non-furnace wrappers stay untouched.
 */
@Mixin(value = SidedInvWrapper.class, remap = false)
public abstract class MixinSidedInvWrapper {

    @Shadow
    protected ISidedInventory inv;

    @Shadow
    protected EnumFacing side;

    /** Sink-storm dedup: sim consults run EVERY SERVER TICK per adjacent hopper
     * (13:49 round's 100+ row burst for one dirt hopper). One line per
     * (item@branch) signature is enough for the judgment channel. */
    @Unique
    private static String etim$lastSinkSig = "";

    @Inject(method = "insertItem", at = @At("HEAD"), cancellable = true, remap = false)
    private void etim$sinkGate(int slot, ItemStack stack, boolean simulate,
            CallbackInfoReturnable<ItemStack> info) {
        if (stack.isEmpty()
                || !ETIMConfig.furnaceHeatSystem
                || !(this.inv instanceof TileEntityFurnace)) {
            return; // non-furnace targets stay vanilla
        }
        int sideSlot = net.minecraftforge.items.wrapper.SidedInvWrapper.getSlot(this.inv, slot, this.side);
        if (sideSlot == -1) {
            return;
        }
        if (!FurnaceHeat.isEnabled()) {
            return;
        }
        if (sideSlot == 0
                && ETIMConfig.furnaceInputRecipeGate
                && FurnaceRecipes.instance().getSmeltingResult(stack).isEmpty()) {
            String sig = stack.getItem().getRegistryName().toString() + "@no-recipe";
            if (ETIMConfig.furnaceDebugLog && !sig.equals(etim$lastSinkSig)) {
                etim$lastSinkSig = sig;
                ETIM.LOGGER.info("[FurnaceLog] sink denied no-recipe item="
                        + stack.getItem().getRegistryName().toString()
                        + " sim=" + simulate
                        + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
            }
            info.setReturnValue(stack); // full refusal: the item stays put
            return;
        }
        if (sideSlot == 1) {
            int heat = FurnaceHeat.getHeatOf(stack);
            if (heat <= 0 || heat > FurnaceHeat.getVanillaCap()) {
                String sig = stack.getItem().getRegistryName().toString() + "@fuel" + heat;
                if (ETIMConfig.furnaceDebugLog && !sig.equals(etim$lastSinkSig)) {
                    etim$lastSinkSig = sig;
                    ETIM.LOGGER.info("[FurnaceLog] sink denied fuel heat=" + heat
                            + " cap=" + FurnaceHeat.getVanillaCap()
                            + " item=" + stack.getItem().getRegistryName().toString()
                            + " sim=" + simulate
                            + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
                }
                info.setReturnValue(stack);
                return;
            }
        }
    }
}

