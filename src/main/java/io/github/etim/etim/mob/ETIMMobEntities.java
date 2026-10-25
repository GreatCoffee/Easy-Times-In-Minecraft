package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;

import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.registry.EntityRegistry;

/**
 * R196 revenant/bone-lord entity registrations (mob 批 T1①/T2①, 2026-10-24)
 * + the underworld trio (underworld 批 2026-10-25, M5 组): AncientBoneLord 7 /
 * Longdead 8 / LongdeadGuardian 9 (报告 §5.7 id 段). No spawn-egg faces (the
 * R196 universe has none); ids are mod-scoped and continue the spider block
 * (1..4 → 5/6) and the bone block (5/6 → 7/8/9).
 */
public final class ETIMMobEntities {

    public static void register() {
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "revenant"),
                ETIMEntityRevenant.class, "etim.revenant", 5, ETIM.instance(), 64, 3, true);
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "bonelord"),
                ETIMEntityBoneLord.class, "etim.bonelord", 6, ETIM.instance(), 64, 3, true);
        // underworld 批 (2026-10-25) — id 7/8/9 (报告 §5.7).
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "ancient_bone_lord"),
                ETIMEntityAncientBoneLord.class, "etim.ancient_bone_lord", 7, ETIM.instance(), 64, 3, true);
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "longdead"),
                ETIMEntityLongdead.class, "etim.longdead", 8, ETIM.instance(), 64, 3, true);
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "longdead_guardian"),
                ETIMEntityLongdeadGuardian.class, "etim.longdead_guardian", 9, ETIM.instance(), 64, 3, true);
    }

    /**
     * Batch B arrow identity (D-19/D-20): the {@code etim:metal_arrow} projectile.
     * Kept OUT of {@link #register()} — that runs before ETIMConfig.init
     * (ETIM.java:72 vs :87), so the [ArrowLog] gate would be down and the
     * register row would never print; the caller (ETIM preInit) invokes this
     * after config init. id 10 continues the 5..9 block (underworld batch §5.7).
     * Selectors resolve the ResourceLocation registryName
     * (entity/EntityList.java:128-131) — hence @e[type=etim:metal_arrow].
     */
    public static void registerArrow() {
        EntityRegistry.registerModEntity(new ResourceLocation(ETIM.MOD_ID, "metal_arrow"),
                ETIMEntityArrow.class, "etim.metal_arrow", 10, ETIM.instance(), 64, 20, true);
        ETIMArrowLog.row("arrow register id=10 name=etim:metal_arrow class="
                + ETIMEntityArrow.class.getName());
    }

    private ETIMMobEntities() {
    }
}
