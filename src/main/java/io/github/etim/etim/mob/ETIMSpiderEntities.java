package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;

import net.minecraft.entity.EntityLiving;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.registry.EntityRegistry;

/**
 * R196 three-spider entity registrations (verdict G-S10 = A). No spawn-egg
 * faces (the R196 universe has none); ids are mod-scoped 1..4. WoodSpider is
 * deliberately NOT registered — it is the BlackWidow/Phase carrier only
 * (verdict G-S5).
 */
public final class ETIMSpiderEntities {

    public static void register() {
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "black_widow_spider"),
                ETIMEntityBlackWidowSpider.class, "etim.black_widow_spider", 1, instance(), 64, 3, true);
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "demon_spider"),
                ETIMEntityDemonSpider.class, "etim.demon_spider", 2, instance(), 64, 3, true);
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "phase_spider"),
                ETIMEntityPhaseSpider.class, "etim.phase_spider", 3, instance(), 64, 3, true);
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "thrown_web"),
                ETIMEntityWeb.class, "etim.thrown_web", 4, instance(), 64, 10, true);
    }

    private static Object instance() {
        return ETIM.instance();
    }

    private ETIMSpiderEntities() {
    }
}
