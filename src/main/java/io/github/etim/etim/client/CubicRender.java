package io.github.etim.etim.client;

import io.github.etim.etim.mob.ETIMEntityCubic;
import net.minecraft.client.model.ModelSlime;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.entity.RenderLiving;
import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.util.ResourceLocation;

/**
 * B-57 — the 1.12 stand-in for R196 {@code RenderGelatinousCube}
 * (RenderGelatinousCube.java:1-70): one {@link ModelSlime} shell plus the
 * per-family texture (`textures/entity/slime/{jelly,blob,ooze,pudding}.png`),
 * scaled by the R196 squish formula and the cubic size.
 */
public class CubicRender extends RenderLiving<ETIMEntityCubic> {

    private final ResourceLocation texture;

    public CubicRender(RenderManager manager, ResourceLocation texture) {
        super(manager, new ModelSlime(16), 0.25F);
        this.texture = texture;
    }

    @Override
    public void doRender(ETIMEntityCubic entity, double x, double y, double z, float entityYaw, float partialTicks) {
        this.shadowSize = 0.25F * (float) entity.getCubicSize();
        super.doRender(entity, x, y, z, entityYaw, partialTicks);
    }

    @Override
    protected void preRenderCallback(ETIMEntityCubic cubic, float partialTickTime) {
        GlStateManager.scale(0.999F, 0.999F, 0.999F);
        float size = (float) cubic.getCubicSize();
        float squish = (cubic.prevSquishFactor + (cubic.squishFactor - cubic.prevSquishFactor) * partialTickTime)
                / (size * 0.5F + 1.0F);
        float inverse = 1.0F / (squish + 1.0F);
        GlStateManager.scale(inverse * size, 1.0F / inverse * size, inverse * size);
    }

    /** R196 squish wobble: the outer shell drops while the cube is in the air. */
    @Override
    protected float handleRotationFloat(ETIMEntityCubic livingBase, float partialTicks) {
        return super.handleRotationFloat(livingBase, partialTicks);
    }

    @Override
    protected ResourceLocation getEntityTexture(ETIMEntityCubic entity) {
        return this.texture;
    }
}
