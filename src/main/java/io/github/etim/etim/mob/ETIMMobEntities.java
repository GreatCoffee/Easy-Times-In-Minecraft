package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;

import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.registry.EntityRegistry;

/**
 * R196 revenant/bone-lord entity registrations (mob 批 T1①/T2①, 2026-10-24).
 * No spawn-egg faces (the R196 universe has none); ids are mod-scoped and
 * continue the spider block (1..4 → 5/6). BoneLord id 6, Revenant 5.
 */
public final class ETIMMobEntities {

    public static void register() {
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "revenant"),
                ETIMEntityRevenant.class, "etim.revenant", 5, ETIM.instance(), 64, 3, true);
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "bonelord"),
                ETIMEntityBoneLord.class, "etim.bonelord", 6, ETIM.instance(), 64, 3, true);
    }

    private ETIMMobEntities() {
    }
}
