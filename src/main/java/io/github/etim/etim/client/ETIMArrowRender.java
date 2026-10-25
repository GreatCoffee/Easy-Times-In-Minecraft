package io.github.etim.etim.client;

import io.github.etim.etim.mob.ETIMEntityArrow;
import net.minecraft.client.renderer.entity.RenderArrow;
import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.client.renderer.entity.RenderTippedArrow;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * The batch-B arrow renderer (NE-10 / D-22 texture-sharing tier — zero new
 * assets): 1.12's {@code RenderArrow} is abstract (client/renderer/entity/
 * RenderArrow.java:13) and the texture rides the subclass
 * {@code getEntityTexture}; {@code RenderTippedArrow.RES_ARROW} is public
 * (:11) — binding it hands the identity entity the vanilla arrow look, so the
 * R196 per-material {@code textures/entity/arrows/<material>.png} table
 * (R196 RenderArrow.java:15-20) stays deferred (A-5 option ②, later
 * art-side batch). Visual face — not a judged value; the visual confirmation
 * is W8, performed by the user (AGENTS client-face operation discipline).
 */
@SideOnly(Side.CLIENT)
public final class ETIMArrowRender extends RenderArrow<ETIMEntityArrow> {

    public ETIMArrowRender(RenderManager manager) {
        super(manager);
    }

    @Override
    protected ResourceLocation getEntityTexture(ETIMEntityArrow entity) {
        return RenderTippedArrow.RES_ARROW; // D-22 shared vanilla arrow texture
    }
}
