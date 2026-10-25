package io.github.etim.etim.client;

import io.github.etim.etim.mob.ETIMEntityAncientBoneLord;
import io.github.etim.etim.mob.ETIMEntityArrow;
import io.github.etim.etim.mob.ETIMEntityBoneLord;
import io.github.etim.etim.mob.ETIMEntityLongdead;
import io.github.etim.etim.mob.ETIMEntityLongdeadGuardian;
import io.github.etim.etim.mob.ETIMEntityRevenant;

import net.minecraft.client.model.ModelSkeleton;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.entity.RenderBiped;
import net.minecraft.client.renderer.entity.RenderSkeleton;
import net.minecraft.client.renderer.entity.RenderZombie;
import net.minecraft.entity.monster.AbstractSkeleton;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.client.registry.RenderingRegistry;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * Revenant/bone-lord client registration (mob 批). The R196 RenderManager
 * :56/:71 face reuses the host renderers — RenderZombie for the revenant,
 * RenderSkeleton for the bone lord — so both factories bind the vanilla
 * renderer classes directly (single RenderManager ctor each).
 *
 * <p>underworld 批 (2026-10-25, D-7 裁定 = 原版骷髅贴图 + tint, 照蜘蛛先例):
 * the trio rides the ETIMSpiderRender Tinted shape — the vanilla skeleton
 * texture per species with the tint riding preRenderCallback (the vanilla
 * hurt-flash red is overridden while tinted). Visual-face register — the
 * shade columns are the register's own (no R196 carrier); users can restage
 * them (视觉面，用户可再裁).</p>
 */
@SideOnly(Side.CLIENT)
public final class ETIMMobRender {

    private static final ResourceLocation SKELETON_TEXTURE =
            new ResourceLocation("textures/entity/skeleton/skeleton.png");

    /** Registers the two factories (call from the client side of preInit). */
    public static void register() {
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityRevenant.class, RenderZombie::new);
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityBoneLord.class, RenderSkeleton::new);
        // underworld 批 (2026-10-25) — the trio, D-7 tint face.
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityAncientBoneLord.class,
                manager -> new TintedSkeleton(manager, 0.85F, 0.65F, 0.20F)); // dark gold
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityLongdead.class,
                manager -> new TintedSkeleton(manager, 0.55F, 0.60F, 0.75F)); // cold slate blue
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityLongdeadGuardian.class,
                manager -> new TintedSkeleton(manager, 0.75F, 0.35F, 0.15F)); // dark copper
        // Batch B (2026-10-25) — the identity arrow (D-19/D-22 shared-texture tier).
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityArrow.class, ETIMArrowRender::new);
    }

    /** The ETIMSpiderRender.Tinted shape over the vanilla skeleton renderer stack. */
    private static final class TintedSkeleton extends RenderBiped<AbstractSkeleton> {

        private final float r;
        private final float g;
        private final float b;

        TintedSkeleton(net.minecraft.client.renderer.entity.RenderManager manager, float r, float g, float b) {
            super(manager, new ModelSkeleton(), 0.5F);
            this.r = r;
            this.g = g;
            this.b = b;
        }

        @Override
        protected ResourceLocation getEntityTexture(AbstractSkeleton entity) {
            return SKELETON_TEXTURE; // D-7 — the vanilla skeleton texture
        }

        @Override
        protected void preRenderCallback(AbstractSkeleton entity, float partialTicks) {
            super.preRenderCallback(entity, partialTicks);
            GlStateManager.color(this.r, this.g, this.b, 1.0F);
        }
    }

    private ETIMMobRender() {
    }
}
