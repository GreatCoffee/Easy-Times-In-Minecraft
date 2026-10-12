package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.crafting.ETIMCrafting;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.ClickType;
import net.minecraft.inventory.Container;
import net.minecraft.item.ItemStack;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Stage 3 (batch 1), R196-p(struct): R196's {@code onSlotClicked} signal runs
 * BEFORE the canTakeStack check in the vanilla pickup branch (1.6.4
 * slotClick:304 → :309). ETIM ports it as a HEAD signal on
 * {@code Container.slotClick} for PICKUP clicks on the crafting result slot:
 * the click arms {@code crafting_proceed} (click-to-start, R196
 * SlotCrafting.onSlotClicked:194-203) and never mutates anything — the result
 * slot is already untouchable via {@link MixinSlot}'s canTakeStack lock.
 */
@Mixin(Container.class)
public abstract class MixinContainer {

    private static final Logger FLM_LOG = LogManager.getLogger("[CraftingLog]");

    @Inject(
            method = "slotClick",
            at = @At("HEAD")
    )
    private void etim$signalCraftingResultClick(int slotId, int dragType, ClickType clickTypeIn, EntityPlayer playerIn, CallbackInfoReturnable<ItemStack> cir) {
        // shift 位（audit 12 §2.4 / javap 601-610）：MITE 的 slotClick 对
        // SlotCrafting 直接跳过 shift 分支并落到普通处理 → shift+左 = arm、
        // shift+右 = cycle。1.12 vanilla 把 shift 击编码为 QUICK_MOVE
        // （mode=1、button 原样 0/1），按同一 button 值放行。
        if ((clickTypeIn != ClickType.PICKUP && clickTypeIn != ClickType.QUICK_MOVE) || slotId != 0
                || !(((Container) (Object) this).getSlot(0) instanceof net.minecraft.inventory.SlotCrafting)) {
            return;
        }
        // Client/server PAIRED probe (run26 152-round: the right-click button
        // never reaches the server as 1 — a click storm of PICKUP(0) rows was
        // all it produced; a mod in the chain rewrites the click. The echo
        // shares the [CraftingLog] channel so the pair can be matched: the
        // client Container.slotClick fires FIRST (PlayerController.windowClick)
        // before the packet leaves.)
        if (playerIn.world.isRemote) {
            FLM_LOG.log(Level.INFO, "CLIENT result click btn=" + dragType
                    + " cursor=" + (!playerIn.inventory.getItemStack().isEmpty()));
            return;
        }
        ETIMCrafting.onCraftingResultClicked(playerIn, slotId, dragType);
    }

    /**
     * run26 D7 round (user-visible): manually placing non-admissible items
     * into the furnace GUI slots PASSED client-side — the "placed" look was
     * the server-authoritative rollback at GUI close. The furnace-side hooks
     * deny correctly, but vanilla's PICKUP/SWAP prediction does not consult
     * Slot.isItemValid before painting its own slot state, so this HEAD veto
     * on slotClick kills the click BEFORE prediction (client) and BEFORE
     * mutation (server): no slot write, cursor keeps the item, no ghost.
     * Applies to the furnace container only (input slot 0 / fuel slot 1),
     * same R196 admission rules as the hopper push gate.
     */
    @Inject(method = "slotClick", at = @At("HEAD"), cancellable = true)
    private void etim$furnacePlaceDeny(int slotId, int dragType, ClickType clickTypeIn, EntityPlayer playerIn,
            CallbackInfoReturnable<ItemStack> cir) {
        if (!((Object) this instanceof net.minecraft.inventory.ContainerFurnace)) {
            return;
        }
        if (clickTypeIn != ClickType.PICKUP && clickTypeIn != ClickType.SWAP) {
            return;
        }
        if (slotId != 0 && slotId != 1) {
            return;
        }
        ItemStack carried = playerIn == null ? ItemStack.EMPTY : playerIn.inventory.getItemStack();
        if (carried.isEmpty() || !ETIMConfig.furnaceHeatSystem
                || !io.github.etim.etim.furnace.FurnaceHeat.isEnabled()) {
            return;
        }
        boolean deny = false;
        String why = "";
        if (slotId == 0 && ETIMConfig.furnaceInputRecipeGate
                && net.minecraft.item.crafting.FurnaceRecipes.instance().getSmeltingResult(carried).isEmpty()) {
            deny = true;
            why = "no-recipe";
        } else if (slotId == 1) {
            int heat = io.github.etim.etim.furnace.FurnaceHeat.getHeatOf(carried);
            if (heat <= 0 || heat > io.github.etim.etim.furnace.FurnaceHeat.getVanillaCap()) {
                deny = true;
                why = "heat=" + heat + " cap=" + io.github.etim.etim.furnace.FurnaceHeat.getVanillaCap();
            }
        }
        if (deny) {
            cir.setReturnValue(ItemStack.EMPTY);
            String denySig = carried.getItem().getRegistryName().toString() + "@" + slotId + "@" + why;
            boolean server = Thread.currentThread().getName().contains("Server");
            // Slot key includes the END: the client try and the server echo
            // alternate on every denied click and would clobber one
            // single-slot last-sig per (item×slot×why) (13:56 round).
            String key = denySig + "@" + (server ? "s" : "c");
            if (ETIMConfig.furnaceDebugLog && !etim$placeDenySeen.contains(key)) {
                etim$placeDenySeen.add(key);
                io.github.etim.etim.ETIM.LOGGER.info("[FurnaceLog] gui place denied (" + why + ") item="
                        + carried.getItem().getRegistryName().toString()
                        + (server ? " [server]" : " [client]"));
            }
        }
    }

    /** One line per (item×slot×why×end) signature, per session. */
    @Unique
    private static final java.util.Set<String> etim$placeDenySeen = new java.util.HashSet<>();
}
