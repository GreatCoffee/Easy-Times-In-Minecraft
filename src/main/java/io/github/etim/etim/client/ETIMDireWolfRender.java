package io.github.etim.etim.client;

import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.client.renderer.entity.RenderWolf;
import net.minecraft.entity.passive.EntityWolf;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * B-61 — R196 {@code RenderDireWolf} ({@code extends RenderWolf}, shadow 0.5F,
 * pre-render scale 1.1, four textures under {@code textures/entity/dire_wolf/}:
 * neutral / tame / angry / collar).
 *
 * <p>1.12's {@link RenderWolf} already owns the body, the tail and the shake
 * animation; only the texture pick and the 1.1 scale differ. The collar
 * overlay pass is deferred (C-B61 collar pass).</p>
 */
@SideOnly(Side.CLIENT)
public class ETIMDireWolfRender extends RenderWolf {

    private static final ResourceLocation NEUTRAL = new ResourceLocation("etim:textures/entity/dire_wolf/neutral.png");
    private static final ResourceLocation TAME = new ResourceLocation("etim:textures/entity/dire_wolf/tame.png");
    private static final ResourceLocation ANGRY = new ResourceLocation("etim:textures/entity/dire_wolf/angry.png");

    public ETIMDireWolfRender(RenderManager manager) {
        super(manager);
        this.shadowSize = 0.5F;
    }

    @Override
    protected ResourceLocation getEntityTexture(EntityWolf entity) {
        if (entity.isAngry()) {
            return ANGRY;
        }
        return entity.isTamed() ? TAME : NEUTRAL;
    }

    @Override
    protected void preRenderCallback(EntityWolf entity, float partialTickTime) {
        GlStateManager.scale(1.1F, 1.1F, 1.1F); // R196 RenderDireWolf scale
    }
}
