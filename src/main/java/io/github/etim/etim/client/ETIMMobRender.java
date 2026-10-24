package io.github.etim.etim.client;

import io.github.etim.etim.mob.ETIMEntityBoneLord;
import io.github.etim.etim.mob.ETIMEntityRevenant;

import net.minecraft.client.renderer.entity.RenderSkeleton;
import net.minecraft.client.renderer.entity.RenderZombie;
import net.minecraftforge.fml.client.registry.RenderingRegistry;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * Revenant/bone-lord client registration (mob 批). The R196 RenderManager
 * :56/:71 face reuses the host renderers — RenderZombie for the revenant,
 * RenderSkeleton for the bone lord — so both factories bind the vanilla
 * renderer classes directly (single RenderManager ctor each).
 */
@SideOnly(Side.CLIENT)
public final class ETIMMobRender {

    /** Registers the two factories (call from the client side of preInit). */
    public static void register() {
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityRevenant.class, RenderZombie::new);
        RenderingRegistry.registerEntityRenderingHandler(ETIMEntityBoneLord.class, RenderSkeleton::new);
    }

    private ETIMMobRender() {
    }
}
