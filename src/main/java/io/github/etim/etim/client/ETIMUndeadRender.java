package io.github.etim.etim.client;

import net.minecraft.client.renderer.entity.RenderBiped;
import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.entity.EntityLiving;
import net.minecraft.util.ResourceLocation;

/**
 * B-59 — R196 {@code RenderGhoul} / {@code RenderWight} / {@code RenderShadow}
 * (each {@code RenderBiped(new ModelInvisibleStalker(), 0.5F)} with one
 * texture): one renderer class, three textures.
 */
public class ETIMUndeadRender<T extends EntityLiving> extends RenderBiped<T> {

    private final ResourceLocation texture;

    public ETIMUndeadRender(RenderManager manager, ResourceLocation texture) {
        super(manager, new ETIMModelStalker(), 0.5F); // R196 shadow size 0.5F
        this.texture = texture;
    }

    @Override
    protected ResourceLocation getEntityTexture(T entity) {
        return this.texture;
    }
}
