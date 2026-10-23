package io.github.etim.etim.client;

import io.github.etim.etim.mob.ETIMEntityBlackWidowSpider;
import io.github.etim.etim.mob.ETIMEntityDemonSpider;
import io.github.etim.etim.mob.ETIMEntityPhaseSpider;
import io.github.etim.etim.mob.ETIMEntityWeb;
import net.minecraft.client.Minecraft;
import net.minecraft.client.model.ModelSpider;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.entity.RenderLiving;
import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.client.renderer.entity.RenderSnowball;
import net.minecraft.entity.EntityLiving;
import net.minecraft.init.Items;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.client.registry.RenderingRegistry;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * Three-spider client registration (verdict G-S10 = A + user verdict
 * G-S9a/b). Vanilla ModelSpider stands in for R196 ModelArachnid; the
 * vanilla spider/cave-spider textures are tinted per species (the MITE
 * release ships no dedicated textures — user verdict: tint, not the
 * missing-texture defect). The tint rides preRenderCallback, so the vanilla
 * hurt-flash red is overridden while tinted (visual-face register).
 */
@SideOnly(Side.CLIENT)
public final class ETIMSpiderRender {

    private static final ResourceLocation SPIDER_TEXTURE =
            new ResourceLocation("textures/entity/spider/spider.png");
    private static final ResourceLocation CAVE_SPIDER_TEXTURE =
            new ResourceLocation("textures/entity/spider/cave_spider.png");

    public static void register() {
        // black widow: near-black with a red shift over the vanilla texture
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityBlackWidowSpider.class,
                manager -> new Tinted(manager, 0.6F, SPIDER_TEXTURE, 0.30F, 0.03F, 0.03F));
        // demon: ember red over the vanilla texture
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityDemonSpider.class,
                manager -> new Tinted(manager, 1.0F, SPIDER_TEXTURE, 0.55F, 0.15F, 0.10F));
        // phase spider: pale violet over the cave texture
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityPhaseSpider.class,
                manager -> new Tinted(manager, 0.6F, CAVE_SPIDER_TEXTURE, 0.75F, 0.60F, 0.95F));
        // R196 Item.thrownWeb has no 1.12 carrier — the string-item ball is the
        // approved equivalence (verdict G-S2 note)
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityWeb.class,
                manager -> new RenderSnowball(manager, Items.STRING,
                        Minecraft.getMinecraft().getRenderItem()));
    }

    static final class Tinted extends RenderLiving<EntityLiving> {
        private final ResourceLocation texture;
        private final float scale;
        private final float r;
        private final float g;
        private final float b;

        Tinted(RenderManager manager, float scale, ResourceLocation texture,
                float r, float g, float b) {
            super(manager, new ModelSpider(), 0.5F);
            this.texture = texture;
            this.scale = scale;
            this.r = r;
            this.g = g;
            this.b = b;
        }

        @Override
        protected ResourceLocation getEntityTexture(EntityLiving entity) {
            return this.texture;
        }

        @Override
        protected void preRenderCallback(EntityLiving entity, float partialTicks) {
            super.preRenderCallback(entity, partialTicks);
            GlStateManager.scale(this.scale, this.scale, this.scale); // R196 Render*Spider GL11 face
            GlStateManager.color(this.r, this.g, this.b, 1.0F);
        }
    }

    private ETIMSpiderRender() {
    }
}
