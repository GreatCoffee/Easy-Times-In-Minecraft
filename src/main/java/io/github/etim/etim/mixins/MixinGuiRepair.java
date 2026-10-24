package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMContainerRepairDuck;
import net.minecraft.client.gui.GuiRepair;
import net.minecraft.client.resources.I18n;
import net.minecraft.inventory.Slot;
import net.minecraft.util.text.TextFormatting;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * 批三修理面 T6② — the anvil GUI's gold fail hints (R196 GuiContainer
 * :235-243 一手: hovering the output slot while the repair container carries
 * a fail condition appends the gold line — fail 1 =
 * {@code container.repair.insufficientSkill}, fail 2 =
 * {@code container.repair.needsHarderAnvil}). The fail state is computed by
 * the SAME plan face on the client's own container instance (the plan is
 * pure) — no network state.
 *
 * <p>B-ANV-1 修 (金属砧块批): the hint rides {@code drawScreen} TAIL —
 * SCREEN space, after the GUI's popMatrix (GuiContainer.drawScreen :100-101
 * translates the matrix for the foreground layer and pops it afterwards, and
 * the vanilla tooltip face :193 runs outside it). The batch-3 face injected
 * {@code drawGuiContainerForegroundLayer} TAIL with the raw screen
 * mouseX/mouseY → the GL translate shifted the tooltip a second time and
 * clipped it. drawScreen TAIL also keeps the tooltip topmost.</p>
 *
 * <p>Client render only ([AGENTS rule 9]: the gates behind it are
 * log-judged server-side via [CraftingLog] fail/take rows).</p>
 */
@Mixin(GuiRepair.class)
public abstract class MixinGuiRepair {

    @Inject(
            method = "drawScreen(IIF)V",
            at = @At("TAIL")
    )
    private void etim$repairFailHints(int mouseX, int mouseY, float partialTicks, CallbackInfo ci) {
        if (!ETIMConfig.metalAnvilRepair) {
            return;
        }
        GuiRepair self = (GuiRepair) (Object) this;
        Slot hovered = ((GuiContainerAccessor) (Object) this).etim$getHoveredSlot();
        if (hovered == null || hovered.getSlotIndex() != 2) {
            return; // R196 :235 — the hints ride the output-slot hover only
        }
        if (!(self.inventorySlots instanceof ETIMContainerRepairDuck)) {
            return;
        }
        int fail = ((ETIMContainerRepairDuck) self.inventorySlots).etimFailState();
        if (fail == 0) {
            return;
        }
        String key = fail == 2
                ? "container.repair.needsHarderAnvil"
                : "container.repair.insufficientSkill";
        self.drawHoveringText(TextFormatting.GOLD + I18n.format(key), mouseX, mouseY);
    }
}
