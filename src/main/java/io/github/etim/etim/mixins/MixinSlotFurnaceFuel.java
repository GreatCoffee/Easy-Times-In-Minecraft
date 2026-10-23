package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.furnace.FurnaceHeat;
import net.minecraft.inventory.SlotFurnaceFuel;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Stage 4 batch A: R196 SlotFuel.isItemValid on the vanilla GUI fuel slot
 * (9B §4.1 — {@code heat > 0 && heat <= furnace.getMaxHeatLevel()}, the
 * {@code heat==max passes} boundary note from the audit's comparator table):
 * a heat-0 stack (the vanilla bucket special case included) and a stack
 * hotter than the furnace's cap are both refused. The vanilla furnace is the
 * R196 cobblestone tier, so its cap is 2 — an iron-capable lava bucket (3)
 * is refused HERE as well (9B 边界：the extra tiers come with batch B).
 *
 * <p>The vanilla {@code TileEntityFurnace.isItemFuel || isBucket} accept
 * returns first; this post-hook adds ONLY the heat composite. Every refusal
 * logs to [FurnaceLog] (AGENTS.md rule 9 judgment channel).</p>
 */
@Mixin(SlotFurnaceFuel.class)
public abstract class MixinSlotFurnaceFuel {

    /**
     * Static signature dedup for the [FurnaceLog] deny line: the GUI hover
     * loop re-asks slot admission EVERY FRAME while a refused stack floats
     * over the fuel slot (the run26 11:21 round: 95+ client-thread rows in
     * one hover). One line per (item,heat) signature across the session is
     * enough judgment value; the deny itself still applies on every call.
     */
    @Unique
    private static String etim$lastFuelDenySig = "";

    @Inject(
            method = "isItemValid",
            at = @At("RETURN"),
            cancellable = true,
            remap = true
    )
    private void etim$fuelHeatGate(ItemStack stack, CallbackInfoReturnable<Boolean> cir) {
        if (!cir.getReturnValueZ() || !ETIMConfig.furnaceHeatSystem || !FurnaceHeat.isEnabled()) {
            return;
        }
        // `inventory` lives on the Slot superclass — the mixin reaches it via
        // the cast (no shadow for inherited fields).
        net.minecraft.inventory.Slot self = (net.minecraft.inventory.Slot) (Object) this;
        net.minecraft.inventory.IInventory inv = self.inventory;
        int cap = FurnaceHeat.getCapFor(inv);
        // 批文项4 — the slot layer's fuel face: the clay tier refuses large
        // items here too (boats/doors ARE fuels — the R196 SlotFuel gate).
        if (inv instanceof net.minecraft.tileentity.TileEntityFurnace
                && !FurnaceHeat.acceptsLargeItems((net.minecraft.tileentity.TileEntityFurnace) inv)
                && io.github.etim.etim.metal.ETIMFurnaceGate.isLargeItem(stack)) {
            cir.setReturnValue(false);
            String sig = stack.getItem().getRegistryName().toString() + "#large";
            if (!sig.equals(etim$lastFuelDenySig) && ETIMConfig.furnaceDebugLog) {
                etim$lastFuelDenySig = sig;
                ETIM.LOGGER.info("[FurnaceLog] fuel denied large-item furnace="
                        + FurnaceHeat.getNameFor(inv)
                        + " item=" + sig.split("#")[0]
                        + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
            }
            return;
        }
        int heat = FurnaceHeat.getHeatOf(stack);
        if (heat > 0 && heat <= cap) {
            return;
        }
        cir.setReturnValue(false);
        String sig = stack.getItem().getRegistryName().toString() + "#" + heat;
        if (sig.equals(etim$lastFuelDenySig)) {
            return;
        }
        etim$lastFuelDenySig = sig;
        if (ETIMConfig.furnaceDebugLog) {
            ETIM.LOGGER.info("[FurnaceLog] fuel admit denied heat=" + heat
                    + " cap=" + cap
                    + " furnace=" + FurnaceHeat.getNameFor(inv)
                    + " item=" + sig.split("#")[0]
                    + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
        }
    }
}
