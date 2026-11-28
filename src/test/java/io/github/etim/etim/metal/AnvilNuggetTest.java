package io.github.etim.etim.metal;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Items;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * B-70VR: 砧修理的「金属 → 粒」映射（R196 Item.java:1235-1237 的共用规则）。
 */
class AnvilNuggetTest {

    @BeforeAll
    static void boot() {
        Bootstrap.register();
    }

    @Test
    void nullMetalHasNoNugget() {
        assertNull(ETIMAnvilRepair.nuggetOf(null));
    }

    @Test
    void rustedIronBorrowsTheVanillaIronNugget() {
        assertEquals(Items.IRON_NUGGET, ETIMAnvilRepair.nuggetOf(ETIMMetals.RUSTED_IRON));
    }

    @Test
    void goldBorrowsTheVanillaGoldNugget() {
        assertEquals(Items.GOLD_NUGGET, ETIMAnvilRepair.nuggetOf(ETIMMetals.GOLD));
    }

    @Test
    void etimMetalsMapToTheirOwnNuggets() {
        assertEquals(ETIMItems.nuggetCopper, ETIMAnvilRepair.nuggetOf(ETIMMetals.COPPER));
        assertEquals(ETIMItems.nuggetSilver, ETIMAnvilRepair.nuggetOf(ETIMMetals.SILVER));
        assertEquals(ETIMItems.nuggetMithril, ETIMAnvilRepair.nuggetOf(ETIMMetals.MITHRIL));
        assertEquals(ETIMItems.nuggetAdamantium, ETIMAnvilRepair.nuggetOf(ETIMMetals.ADAMANTIUM));
        assertEquals(ETIMItems.nuggetAncientMetal, ETIMAnvilRepair.nuggetOf(ETIMMetals.ANCIENT_METAL));
    }

    @Test
    void everyMetalHasSomeNugget() {
        for (ETIMMetals m : ETIMMetals.values()) {
            // ETIM 自有粒在注册前为 null；原版借用的两档必须非空。
            if (m == ETIMMetals.RUSTED_IRON || m == ETIMMetals.GOLD) {
                assertEquals(true, ETIMAnvilRepair.nuggetOf(m) != null, m.name);
            }
        }
    }
}
