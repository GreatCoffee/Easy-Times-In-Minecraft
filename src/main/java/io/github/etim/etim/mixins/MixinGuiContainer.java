package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.crafting.CraftingProgressNetwork;
import io.github.etim.etim.client.FurnaceTooltipHints;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.inventory.GuiContainer;
import net.minecraft.client.gui.inventory.GuiCrafting;
import net.minecraft.client.gui.inventory.GuiInventory;
import net.minecraft.client.renderer.BufferBuilder;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.Tessellator;
import net.minecraft.client.renderer.vertex.DefaultVertexFormats;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ResourceLocation;
import org.lwjgl.opengl.GL11;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Stage 3 (batch 2): the crafting progress fills the arrow between the grid
 * and the result slot in WHITE (the MITE R196/GUI look). Both vanilla
 * crafting GUIs get a shot-of-white texture overlay clipped to the elapsed
 * fraction of the arrow glyphs measured off the vanilla textures at the
 * pixel level (2026-10-12 audit): crafting_table.png arrow silhouette =
 * screen (90..111, 35..49), inventory.png arrow = screen (135..150, 29..41).
 * The vanilla sprite palette: GUI panel grey = 192, arrow silhouette =
 * 128 — the white textures are the 128-silhouette recolored (192-panels
 * masked OUT, otherwise the whole crop rect fills as a solid blob). The server pushes the timer via
 * {@link CraftingProgressNetwork} (push-on-change + 4-tick cadence; the
 * client interpolates between pushes at the 50 ms tick cadence).
 *
 * <p>Drawn at {@code drawScreen} TAIL (over items — the result slot is empty
 * until completion, so nothing overlaps the glyph region).</p>
 */
@Mixin(GuiContainer.class)
public abstract class MixinGuiContainer {

    @Shadow
    protected int guiLeft;

    @Shadow
    protected int guiTop;

    @Shadow
    public net.minecraft.inventory.Container inventorySlots;

    @Shadow
    protected net.minecraft.inventory.Slot hoveredSlot;

    private static final ResourceLocation ARROW_TEXTURE =
            new ResourceLocation("etim", "textures/gui/craft_arrow_white.png");
    private static final ResourceLocation ARROW_TEXTURE_INV =
            new ResourceLocation("etim", "textures/gui/craft_arrow_white_inv.png");

    // Glyph placement inside each texture (pixels) — measured OFF THE VANILLA
    // PNGS at the PIXEL level (arrow_shape_dump, 2026-10-12): GUI panel is
    // bucket 12 (192), the ARROW SILHOUETTE is bucket 8 (128). Crop rects are
    // exactly each silhouette's bounds: craft arrow = atlas (90,35)-(111,49)
    // 22×15, inventory arrow = atlas (135,29)-(150,41) 16×13.
    private static final int GLYPH_U = 0;
    private static final int GLYPH_V = 0;
    private static final int GLYPH_W_WORKBENCH = 22;
    private static final int GLYPH_H_WORKBENCH = 15;
    private static final int GLYPH_W_INVENTORY = 16;
    private static final int GLYPH_H_INVENTORY = 13;
    private static final int TEX_W_WORKBENCH = 22;
    private static final int TEX_H_WORKBENCH = 15;
    private static final int TEX_W_INVENTORY = 16;
    private static final int TEX_H_INVENTORY = 13;

    @Inject(
            method = "drawScreen",
            at = @At("TAIL")
    )
    private void etim$drawCraftProgressArrow(int mouseX, int mouseY, float partialTicks, CallbackInfo ci) {
        if (!ETIMConfig.craftingProgressArrow) {
            return;
        }
        ResourceLocation texture;
        int offsetX;
        int offsetY;
        int glyphW;
        int glyphH;
        int texW;
        int texH;
        Object self = this;
        if (self instanceof GuiCrafting) {
            texture = ARROW_TEXTURE;
            offsetX = 90;
            offsetY = 35;
            glyphW = GLYPH_W_WORKBENCH;
            glyphH = GLYPH_H_WORKBENCH;
            texW = TEX_W_WORKBENCH;
            texH = TEX_H_WORKBENCH;
        } else if (self instanceof GuiInventory) {
            texture = ARROW_TEXTURE_INV;
            offsetX = 135;
            offsetY = 29;
            glyphW = GLYPH_W_INVENTORY;
            glyphH = GLYPH_H_INVENTORY;
            texW = TEX_W_INVENTORY;
            texH = TEX_H_INVENTORY;
        } else {
            return;
        }
        float fraction = io.github.etim.etim.client.ClientNetworkHooks.fraction(inventorySlots.windowId);
        if (fraction <= 0.0F) {
            return;
        }
        int fillW = Math.max(1, Math.round(glyphW * fraction));
        // Pure white REPLACEMENT over the vanilla glyph: blend OFF so leftover
        // GUI blend/color state cannot wash the fill out (run25 "颜色太浅").
        GlStateManager.pushMatrix();
        GlStateManager.disableBlend();
        GlStateManager.enableAlpha();
        GlStateManager.color(1.0F, 1.0F, 1.0F, 1.0F);
        GlStateManager.disableLighting();
        Minecraft.getMinecraft().getTextureManager().bindTexture(texture);
        etim$drawScaledUv(
                guiLeft + offsetX, guiTop + offsetY,
                fillW, glyphH,
                GLYPH_U, GLYPH_V, fillW, glyphH,
                texW, texH);
        etim$drawScaledUv(
                guiLeft + offsetX, guiTop + offsetY,
                fillW, glyphH,
                GLYPH_U, GLYPH_V, fillW, glyphH,
                texW, texH); // second pass: guards against anyone re-enabling blend mid-frame
        GlStateManager.enableBlend();
        GlStateManager.popMatrix();
    }

    /** UV-sub-rect quad with an explicit texture size (drawTexturedModalRect is 256-locked). */
    private static void etim$drawScaledUv(double x, double y, double w, double h,
                                          int u, int v, int uw, int vh, int texW, int texH) {
        double u0 = u / (double) texW;
        double v0 = v / (double) texH;
        double u1 = (u + uw) / (double) texW;
        double v1 = (v + vh) / (double) texH;
        Tessellator tessellator = Tessellator.getInstance();
        BufferBuilder buffer = tessellator.getBuffer();
        buffer.begin(GL11.GL_QUADS, DefaultVertexFormats.POSITION_TEX);
        buffer.pos(x, y + h, 0.0D).tex(u0, v1).endVertex();
        buffer.pos(x + w, y + h, 0.0D).tex(u1, v1).endVertex();
        buffer.pos(x + w, y, 0.0D).tex(u1, v0).endVertex();
        buffer.pos(x, y, 0.0D).tex(u0, v0).endVertex();
        tessellator.draw();
    }

    /**
     * The furnace heat tooltip row feed (FurnaceTooltipHints): hovering a
     * furnace slot with an empty cursor ends at this point and the vanilla
     * tooltip render follows — the per-frame hint refresh runs before Forge
     * gathers the tooltip lines, so the single gold row lands on TOP of the
     * vanilla list (item name row included) without a drawn overlay that
     * covers the vanilla rows (the 13:1x round's user remark).
     */
    @Inject(method = "renderHoveredToolTip", at = @At("HEAD"), remap = true)
    private void etim$furnaceHintFeed(int mouseX, int mouseY, CallbackInfo ci) {
        String row = null;
        ItemStack hintStack = null;
        if (ETIMConfig.furnaceGuiHints
                && io.github.etim.etim.furnace.FurnaceHeat.isEnabled()
                && Minecraft.getMinecraft().player.inventory.getItemStack().isEmpty()
                && this.hoveredSlot != null
                && this.hoveredSlot.getHasStack()
                && ((Object) this instanceof net.minecraft.client.gui.inventory.GuiFurnace)) {
            ItemStack stack = this.hoveredSlot.getStack();
            hintStack = stack;
            int idx = this.hoveredSlot.getSlotIndex();
            if (idx == 0) {
                int required = io.github.etim.etim.furnace.FurnaceHeat.getRequiredHeat(stack);
                if (required > 1) {
                    row = net.minecraft.client.resources.I18n.format("etim.furnace.needed", required);
                }
            } else if (idx == 1) {
                int heat = io.github.etim.etim.furnace.FurnaceHeat.getHeatOf(stack);
                if (heat > 0) {
                    row = net.minecraft.client.resources.I18n.format("etim.furnace.curheat", heat,
                            io.github.etim.etim.furnace.FurnaceHeat.getVanillaCap());
                }
            }
        }
        io.github.etim.etim.client.FurnaceTooltipHints.current = row;
        io.github.etim.etim.client.FurnaceTooltipHints.hintStack = row == null ? null : hintStack;
    }
}
