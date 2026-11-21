package io.github.etim.etim.client;

import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.entity.RenderBiped;
import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.entity.EntityLiving;
import net.minecraft.util.ResourceLocation;

/**
 * B-59 — R196 {@code RenderGhoul} / {@code RenderWight} / {@code RenderShadow}
 * (each {@code RenderBiped(new ModelInvisibleStalker(), 0.5F)} with one
 * texture): one renderer class, three textures.
 *
 * <p>B-60 D-3 adds the alpha channel that R196 uses for the stalker
 * ({@code RenderInvisibleStalker.getModelOpacity() = 0.05F}): vanilla
 * {@code RenderLivingBase.doRender} enables alpha testing (threshold 0.1) so a
 * plain {@code color(...,0.05F)} would be clipped away — the ghost needs blend
 * with the alpha test off.</p>
 */
public class ETIMUndeadRender<T extends EntityLiving> extends RenderBiped<T> {

    private final ResourceLocation texture;
    private final float alpha;

    public ETIMUndeadRender(RenderManager manager, ResourceLocation texture) {
        this(manager, texture, 1.0F);
    }

    public ETIMUndeadRender(RenderManager manager, ResourceLocation texture, float alpha) {
        super(manager, new ETIMModelStalker(), 0.5F); // R196 shadow size 0.5F
        this.texture = texture;
        this.alpha = alpha;
    }

    @Override
    protected ResourceLocation getEntityTexture(T entity) {
        return this.texture;
    }

    @Override
    protected void renderModel(T entity, float limbSwing, float limbSwingAmount, float ageInTicks,
            float netHeadYaw, float headPitch, float scaleFactor) {
        if (this.alpha >= 1.0F) {
            super.renderModel(entity, limbSwing, limbSwingAmount, ageInTicks, netHeadYaw, headPitch, scaleFactor);
            return;
        }
        GlStateManager.disableAlpha();
        GlStateManager.enableBlend();
        GlStateManager.tryBlendFuncSeparate(770, 771, 1, 0);
        GlStateManager.color(1.0F, 1.0F, 1.0F, this.alpha);
        super.renderModel(entity, limbSwing, limbSwingAmount, ageInTicks, netHeadYaw, headPitch, scaleFactor);
        GlStateManager.color(1.0F, 1.0F, 1.0F, 1.0F);
        GlStateManager.disableBlend();
        GlStateManager.enableAlpha();
    }
}
