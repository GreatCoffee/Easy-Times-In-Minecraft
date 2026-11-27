package io.github.etim.etim.metal;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;

/**
 * R196 {@code Item.getRepairItem :1229-1246} 的金属珠耐久列（B-70UV）。
 */
class AnvilGatesTest {

    @Test
    void copperAndSilverShareFour() {
        assertEquals(4.0F, AnvilGates.nuggetDurability(ETIMMetals.COPPER));
        assertEquals(4.0F, AnvilGates.nuggetDurability(ETIMMetals.SILVER));
    }

    @Test
    void goldRidesVanillaColumn() {
        assertEquals(4.0F, AnvilGates.nuggetDurability(ETIMMetals.GOLD));
    }

    @Test
    void ironSharesRustedCarrierAtEight() {
        // R196 :1237 — 铁与锈铁共用铁珠，取铁列 8（不是锈铁的 4）。
        assertEquals(8.0F, AnvilGates.nuggetDurability(ETIMMetals.RUSTED_IRON));
    }

    @Test
    void ancientMetalIsSixteen() {
        assertEquals(16.0F, AnvilGates.nuggetDurability(ETIMMetals.ANCIENT_METAL));
    }

    @Test
    void highTierScalesByFour() {
        assertEquals(64.0F, AnvilGates.nuggetDurability(ETIMMetals.MITHRIL));
        assertEquals(256.0F, AnvilGates.nuggetDurability(ETIMMetals.ADAMANTIUM));
    }

    @Test
    void unknownMaterialFloatsToMax() {
        assertEquals(Float.MAX_VALUE, AnvilGates.nuggetDurability(null));
    }

    @Test
    void byKeyResolvesEveryMetal() {
        assertSame(ETIMMetals.COPPER, AnvilGates.byKey("copper"));
        assertSame(ETIMMetals.ANCIENT_METAL, AnvilGates.byKey("ancient_metal"));
        assertSame(ETIMMetals.RUSTED_IRON, AnvilGates.byKey("rusted_iron"));
        assertNull(AnvilGates.byKey("mithril2"));
        assertNull(AnvilGates.byKey(null));
    }

    @Test
    void allSevenMetalsHaveFiniteDurability() {
        for (ETIMMetals m : ETIMMetals.values()) {
            float d = AnvilGates.nuggetDurability(m);
            assertEquals(true, d > 0.0F && d < Float.MAX_VALUE, m.name);
        }
    }
}
