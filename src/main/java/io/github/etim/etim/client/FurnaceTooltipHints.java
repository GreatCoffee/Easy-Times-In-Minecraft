package io.github.etim.etim.client;

import net.minecraft.item.ItemStack;
import net.minecraft.util.text.TextFormatting;
import net.minecraftforge.event.entity.player.ItemTooltipEvent;
import net.minecraftforge.fml.common.eventhandler.EventPriority;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * The furnace heat tooltip row (run26 13:1x round, user-imposed UX): hovering
 * a furnace slot with an empty cursor shows the heat info as the FIRST line
 * of the VANILLA tooltip list — not a drawn overlay — via Forge's
 * ItemTooltipEvent. Future tooltip mods (NBT detail / burn time / block
 * strength listings) share the same event; a prepender of ours coexists and
 * stays a top line without fighting their overlay coordinates.
 *
 * <p>State: {@link MixinGuiContainer} (run-time client side) refreshes
 * {@link #current} + {@link #hintStack} per frame at
 * {@code GuiContainer.renderHoveredToolTip} HEAD. The stack-equality gate
 * keeps our row out of every OTHER tooltip producer (JEI ingredients,
 *是一本 mod config panels, ...) — only the exact furnace-slot stack match.</p>
 *
 * <p>Rows come pre-formatted (gold+localized) from the setter, this class
 * only places them — no client-side state beyond these two fields.</p>
 */
public final class FurnaceTooltipHints {

    private FurnaceTooltipHints() {
    }

    /** The hovered furnace slot's stack hint; null = no hint this frame. */
    public static String current = null;

    /** The stack the hint belongs to (reference-equality gate against other producers). */
    public static ItemStack hintStack = null;

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onItemTooltip(ItemTooltipEvent event) {
        String row = current;
        ItemStack expected = hintStack;
        if (row == null || expected == null
                || !ItemStack.areItemStacksEqual(event.getItemStack(), expected)) {
            return;
        }
        event.getToolTip().add(0, TextFormatting.GOLD + row);
    }
}
