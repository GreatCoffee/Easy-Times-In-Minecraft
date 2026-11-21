package io.github.etim.etim.client;

import io.github.etim.etim.mob.ETIMEntityEarthElemental;
import net.minecraft.client.renderer.entity.RenderBiped;
import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * B-62 — R196 {@code RenderEarthElemental}: biped + ModelInvisibleStalker,
 * shadow 0.5F, ten material textures (stone/obsidian/netherrack/end stone/
 * clay × normal/magma, plus hardened clay).
 */
@SideOnly(Side.CLIENT)
public class ETIMEarthElementalRender extends RenderBiped<ETIMEntityEarthElemental> {

    private static final ResourceLocation STONE = tex("stone", "earth_elemental_stone");
    private static final ResourceLocation STONE_MAGMA = tex("stone", "earth_elemental_stone_magma");
    private static final ResourceLocation OBSIDIAN = tex("obsidian", "earth_elemental_obsidian");
    private static final ResourceLocation OBSIDIAN_MAGMA = tex("obsidian", "earth_elemental_obsidian_magma");
    private static final ResourceLocation NETHERRACK = tex("netherrack", "earth_elemental_netherrack");
    private static final ResourceLocation NETHERRACK_MAGMA = tex("netherrack", "earth_elemental_netherrack_magma");
    private static final ResourceLocation END_STONE = tex("end_stone", "earth_elemental_end_stone");
    private static final ResourceLocation END_STONE_MAGMA = tex("end_stone", "earth_elemental_end_stone_magma");
    private static final ResourceLocation CLAY = tex("clay", "earth_elemental_clay");
    private static final ResourceLocation CLAY_HARDENED = tex("clay", "earth_elemental_clay_hardened");

    private static ResourceLocation tex(String dir, String name) {
        return new ResourceLocation("etim:textures/entity/earth_elemental/" + dir + "/" + name + ".png");
    }

    public ETIMEarthElementalRender(RenderManager manager) {
        super(manager, new ETIMModelStalker(), 0.5F);
    }

    @Override
    protected ResourceLocation getEntityTexture(ETIMEntityEarthElemental entity) {
        switch (entity.getType()) {
            case ETIMEntityEarthElemental.STONE_MAGMA:
                return STONE_MAGMA;
            case ETIMEntityEarthElemental.OBSIDIAN_NORMAL:
                return OBSIDIAN;
            case ETIMEntityEarthElemental.OBSIDIAN_MAGMA:
                return OBSIDIAN_MAGMA;
            case ETIMEntityEarthElemental.NETHERRACK_NORMAL:
                return NETHERRACK;
            case ETIMEntityEarthElemental.NETHERRACK_MAGMA:
                return NETHERRACK_MAGMA;
            case ETIMEntityEarthElemental.END_STONE_NORMAL:
                return END_STONE;
            case ETIMEntityEarthElemental.END_STONE_MAGMA:
                return END_STONE_MAGMA;
            case ETIMEntityEarthElemental.CLAY_NORMAL:
                return CLAY;
            case ETIMEntityEarthElemental.CLAY_HARDENED:
                return CLAY_HARDENED;
            case ETIMEntityEarthElemental.STONE_NORMAL:
            default:
                return STONE;
        }
    }
}
