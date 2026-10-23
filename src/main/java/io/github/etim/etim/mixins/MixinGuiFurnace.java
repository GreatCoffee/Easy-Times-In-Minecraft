package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.furnace.FurnaceHeat;
import net.minecraft.client.gui.inventory.GuiFurnace;
import net.minecraft.client.resources.I18n;
import net.minecraft.inventory.Slot;
import net.minecraft.item.ItemStack;
import net.minecraft.util.text.TextFormatting;
import org.lwjgl.opengl.GL11;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Stage 4 batch B: the furnace GUI's gold rejection hints (R196
 * GuiFurnace.drawScreen :47-85, first-hand this run): when the cursor
 * carries an item and the hovered shed slot rejected it, overlay the plain
 * gold text — slot 0 → {@code cantSmelt} (no recipe for the carried item),
 * slot 1 → {@code notFuel} (heat < 1) then {@code tooHot} (heat > the
 * furnace's cap), and the oven {@code wontFit} (large item against a
 * small-only oven) — the last needs the batch-B furnace blocks, so only the
 * two vanilla-possible hints run in 4A.
 *
 * <p>Client render only ([AGENTS rule 9: pure client render keeps the user
 * verdict; the gates behind it are log-judged server-side]). Colors match
 * the R196 read (no EnumChatFormatting beyond GOLD, no icons).</p>
 */
@Mixin(GuiFurnace.class)
public abstract class MixinGuiFurnace {

    @Inject(
            method = "drawScreen(IIF)V",
            at = @At("TAIL")
    )
    private void etim$furnaceHints(int mouseX, int mouseY, float partialTicks, CallbackInfo cir) {
        if (!ETIMConfig.furnaceGuiHints || !FurnaceHeat.isEnabled()) {
            return;
        }
        GuiFurnace self = (GuiFurnace) (Object) this;
        ItemStack carried = self.mc.player.inventory.getItemStack();
        Slot hovered = ((GuiContainerAccessor) (Object) this).etim$getHoveredSlot();
        if (carried.isEmpty() || hovered == null) {
            return; // empty-cursor heat rows now feed the vanilla tooltip via FurnaceTooltipHints
        }
        if (hovered.isItemValid(carried)) {
            return; // vanilla accepted the offer: no hint
        }
        int slotIndex = hovered.getSlotIndex();
        if (slotIndex == 0) {
            if (net.minecraft.item.crafting.FurnaceRecipes.instance()
                    .getSmeltingResult(carried).isEmpty()) {
                self.drawHoveringText(
                        TextFormatting.GOLD + I18n.format("etim.furnace.cantSmelt"), mouseX, mouseY);
                GL11.glColor4f(1.0F, 1.0F, 1.0F, 1.0F);
            }
        } else if (slotIndex == 1) {
            int heat = FurnaceHeat.getHeatOf(carried);
            if (heat < 1) {
                self.drawHoveringText(
                        TextFormatting.GOLD + I18n.format("etim.furnace.notFuel"), mouseX, mouseY);
                GL11.glColor4f(1.0F, 1.0F, 1.0F, 1.0F);
            } else if (heat > FurnaceHeat.getCapFor(hovered.inventory)) {
                self.drawHoveringText(
                        TextFormatting.GOLD + I18n.format("etim.furnace.tooHot"), mouseX, mouseY);
                GL11.glColor4f(1.0F, 1.0F, 1.0F, 1.0F);
            }
        }
    }
}
