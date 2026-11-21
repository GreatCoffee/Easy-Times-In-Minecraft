package io.github.etim.etim.client;

import io.github.etim.etim.mob.ETIMEntityFireElemental;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.entity.RenderBiped;
import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * B-62 D-2 — R196 {@code RenderFireElemental}: biped + ModelInvisibleStalker,
 * shadow 0.5F, single texture, {@code getModelOpacity = 0.0F}. The 1.6.4
 * renderer fed that opacity straight into GL alpha, so the fire elemental is
 * a fully transparent body (the F3+B bounding box is the only visible cue).
 * 1.12 alpha-test would clip a 0-alpha model, so the blend path mirrors
 * {@link ETIMUndeadRender}.
 */
@SideOnly(Side.CLIENT)
public class ETIMFireElementalRender extends RenderBiped<ETIMEntityFireElemental> {

    private static final ResourceLocation TEXTURE =
            new ResourceLocation("etim:textures/entity/fire_elemental.png");

    public ETIMFireElementalRender(RenderManager manager) {
        super(manager, new ETIMModelStalker(), 0.5F);
    }

    @Override
    protected ResourceLocation getEntityTexture(ETIMEntityFireElemental entity) {
        return TEXTURE;
    }

    @Override
    protected void renderModel(ETIMEntityFireElemental entity, float limbSwing, float limbSwingAmount,
            float ageInTicks, float netHeadYaw, float headPitch, float scaleFactor) {
        GlStateManager.disableAlpha();
        GlStateManager.enableBlend();
        GlStateManager.tryBlendFuncSeparate(770, 771, 1, 0);
        GlStateManager.color(1.0F, 1.0F, 1.0F, 0.0F); // R196 getModelOpacity = 0.0F
        super.renderModel(entity, limbSwing, limbSwingAmount, ageInTicks, netHeadYaw, headPitch, scaleFactor);
        GlStateManager.color(1.0F, 1.0F, 1.0F, 1.0F);
        GlStateManager.disableBlend();
        GlStateManager.enableAlpha();
    }
}
