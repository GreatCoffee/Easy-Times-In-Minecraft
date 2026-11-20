package io.github.etim.etim.client;

import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.client.renderer.entity.RenderSlime;
import net.minecraft.entity.monster.EntitySlime;
import net.minecraft.util.ResourceLocation;

/**
 * B-44 census A :90 ooze renderer. R196 RenderGelatinousCube uses the
 * dedicated {@code textures/entity/slime/ooze} model; 1.12 ships only the
 * vanilla slime texture, so the vanilla model/texture is reused with the
 * R196 gray-ooze tint (D-9/C-4, same tint pattern as the spider/skeleton
 * batches).
 */
public final class OozeRender extends RenderSlime {

    private static final ResourceLocation SLIME_TEXTURE =
            new ResourceLocation("textures/entity/slime/slime.png");

    public OozeRender(RenderManager renderManager) {
        super(renderManager);
    }

    @Override
    protected ResourceLocation getEntityTexture(EntitySlime entity) {
        return SLIME_TEXTURE;
    }

    @Override
    protected void preRenderCallback(EntitySlime entity, float partialTickTime) {
        super.preRenderCallback(entity, partialTickTime);
        GlStateManager.color(0.55F, 0.55F, 0.50F, 1.0F);
    }
}
