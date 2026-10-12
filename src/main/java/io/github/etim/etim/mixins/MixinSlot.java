package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.IInventory;
import net.minecraft.inventory.Slot;
import net.minecraft.inventory.SlotCrafting;
import net.minecraft.item.ItemStack;
import net.minecraft.tileentity.TileEntityFurnace;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Stage 3 (batch 1), R196-p(struct): R196 {@code SlotCrafting.canTakeStack}
 * returns false unconditionally (:146-148), which is what makes the result
 * slot permanently untouchable — every vanilla take path (PICKUP/THROW/SWAP/
 * QUICK_MOVE/PICKUP_ALL) checks {@code canTakeStack} BEFORE mutating anything,
 * so a click on the result slot is a clean no-op with no cursor/slot drift.
 * The product only reaches the player via the timer's auto-grant (R196
 * onUpdate onPickupFromSlot). The start signal comes from the slotClick hook
 * (see {@link MixinContainer}).
 *
 * <p>ETIM ports this but keeps vanilla instant crafting when the timer is
 * off (config) or for creative-skip players, so the gate is conditional.</p>
 */
@Mixin(Slot.class)
public abstract class MixinSlot {

    @Shadow
    private int slotNumber;

    @Shadow
    public IInventory inventory;

    /**
     * Same static signature dedup pattern as MixinSlotFurnaceFuel (hover storm). */
    @Unique
    private static String etim$lastInputDenySig = "";

    /**
     * Universal furnace-slot predicate (run26 13:48 microscope round): on the
     * CLIENT the vanilla furnace GUI's slots are backed by
     * {@code ContainerLocalMenu} — a keyed copy fed by container packets —
     * NOT by the client TileEntityFurnace; that is why every
     * {@code instanceof TileEntityFurnace}-keyed CLIENT gate stayed silent
     * while dirt 64 was painted inside slot 0 (the drag-split data sits in
     * the LocalMenu, server truth stayed empty, GUI close rolled it back).
     * BOTH sides can be keyed identically through
     * {@link net.minecraft.world.IInteractionObject#getGuiID()}:
     * server TE furnace reports "minecraft:furnace", client LocalMenu
     * carries the same guiId from S2DPacketOpenWindow. No client-only class
     * is referenced, so dedicated servers stay safe.
     */
    @SuppressWarnings("RedundantIfStatement")
    private static boolean etim$isFurnaceInventory(net.minecraft.inventory.IInventory inv) {
        if (inv instanceof net.minecraft.tileentity.TileEntityFurnace) {
            return true;
        }
        return inv instanceof net.minecraft.world.IInteractionObject
                && "minecraft:furnace".equals(((net.minecraft.world.IInteractionObject) inv).getGuiID());
    }

    @Inject(
            method = "canTakeStack",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$lockCraftingResult(EntityPlayer player, CallbackInfoReturnable<Boolean> cir) {
        if (((Object) this instanceof SlotCrafting)
                && ETIMConfig.craftingTimer
                && !(ETIMConfig.craftingSkipCreative && player != null && player.capabilities.isCreativeMode)) {
            cir.setReturnValue(false);
        }
    }

    /**
     * R196 §3.1 (TileEntityFurnace.java:360-368) on the GUI drag path: the
     * furnace INPUT slot (slot 0) only accepts items that have a smelting
     * recipe — walking the same gate the hopper side uses (MixinTileEntityFurnace
     * etim$hopperFuelGate). Vanilla {@code Slot.isItemValid} is unconditional
     * true (decomp :55-57); the filter narrows to the exact furnace-input
     * slot so every other container slot keeps vanilla behavior.
     */
    /**
     * Put-level roof gate (run26 13:36 round): the tile floor gate
     * (MixinTileEntityFurnace.etim$inputRecipeFloorGate) never fired for the
     * reported ghost — NO [client] write probe line exists anywhere in the
     * log even though dirt 64 was PAINTED inside slot 0 (screenshot) while
     * the server kept it EMPTY (rollback on GUI close). So the painter is a
     * client-only path that changes the slot's backing stack WITHOUT
     * TileEntityFurnace.setInventorySlotContents. Every stack change into
     * any Slot — vanilla clicks, vanilla drag distribution (putStack at
     * Container drag end), container transfer, mod mouse helpers
     * (MouseTweaks / inventorysorter style), packet sync — funnels through
     * Slot.putStack, so the veto lives HERE: client prediction dies in
     * place (no paint, no ghost, no rollback) and any real server-side
     * writer is refused identically. STACK fingerprint keeps naming whatever
     * new exotic path shows up (AGENTS rule 9).
     */
    @Unique
    private static String etim$lastPutDenySig = "";

    @Inject(
            method = "putStack",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$furnacePutGate(ItemStack stack, CallbackInfo cir) {
        if (stack == null || stack.isEmpty()
                || !ETIMConfig.furnaceHeatSystem
                || !io.github.etim.etim.furnace.FurnaceHeat.isEnabled()
                || !etim$isFurnaceInventory(this.inventory)) {
            return;
        }
        boolean deny = false;
        String why = "";
        if (this.slotNumber == 0
                && ETIMConfig.furnaceInputRecipeGate
                && net.minecraft.item.crafting.FurnaceRecipes.instance()
                        .getSmeltingResult(stack).isEmpty()) {
            deny = true;
            why = "no-recipe";
        } else if (this.slotNumber == 1) {
            int heat = io.github.etim.etim.furnace.FurnaceHeat.getHeatOf(stack);
            if (heat <= 0 || heat > io.github.etim.etim.furnace.FurnaceHeat.getVanillaCap()) {
                deny = true;
                why = "heat=" + heat + " cap=" + io.github.etim.etim.furnace.FurnaceHeat.getVanillaCap();
            }
        }
        if (!deny) {
            return;
        }
        cir.cancel();
        StackTraceElement[] frames = new Throwable().getStackTrace();
        String caller = frames.length > 2 ? frames[2].toString() : "unknown";
        String item = stack.getItem().getRegistryName().toString();
        String sig = item + "@" + this.slotNumber + "@" + why + "@" + caller;
        if (ETIMConfig.furnaceDebugLog && !sig.equals(etim$lastPutDenySig)) {
            etim$lastPutDenySig = sig;
            StringBuilder sb = new StringBuilder(
                    "[FurnaceLog] put denied slot=" + this.slotNumber + " (" + why + ") item=" + item + " STACK:");
            for (int i = 2; i < Math.min(frames.length, 12); i++) {
                sb.append("\n                    at ").append(frames[i]);
            }
            io.github.etim.etim.ETIM.LOGGER.info(sb.append(
                    Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]").toString());
        }
    }

    @Inject(
            method = "isItemValid",
            at = @At("RETURN"),
            cancellable = true
    )
    private void etim$furnaceInputRecipeGate(ItemStack stack, CallbackInfoReturnable<Boolean> cir) {
        if (!cir.getReturnValueZ()
                || !ETIMConfig.furnaceHeatSystem
                || !ETIMConfig.furnaceInputRecipeGate
                || this.slotNumber != 0
                || !etim$isFurnaceInventory(this.inventory)) {
            return;
        }
        if (!net.minecraft.item.crafting.FurnaceRecipes.instance()
                .getSmeltingResult(stack).isEmpty()) {
            return;
        }
        cir.setReturnValue(false);
        String sig = stack.getItem().getRegistryName().toString() + "#input-slot";
        if (sig.equals(etim$lastInputDenySig)) {
            return;
        }
        etim$lastInputDenySig = sig;
        ETIM.LOGGER.info("[FurnaceLog] input denied no-recipe item=" + sig.split("#")[0]
                + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
    }
}
