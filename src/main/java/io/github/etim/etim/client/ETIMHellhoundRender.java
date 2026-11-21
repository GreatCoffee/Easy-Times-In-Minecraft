package io.github.etim.etim.client;

import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.client.renderer.entity.RenderWolf;
import net.minecraft.entity.passive.EntityWolf;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * B-61 — R196 {@code RenderHellhound} ({@code extends RenderWolf}, shadow 0.5F,
 * a single texture under {@code textures/entity/hellhound/hellhound.png}; the
 * {@code hellhound_glow} companion layer is not carried over).
 */
@SideOnly(Side.CLIENT)
public class ETIMHellhoundRender extends RenderWolf {

    private static final ResourceLocation TEXTURE =
            new ResourceLocation("etim:textures/entity/hellhound/hellhound.png");

    public ETIMHellhoundRender(RenderManager manager) {
        super(manager);
        this.shadowSize = 0.5F;
    }

    @Override
    protected ResourceLocation getEntityTexture(EntityWolf entity) {
        return TEXTURE;
    }
}
