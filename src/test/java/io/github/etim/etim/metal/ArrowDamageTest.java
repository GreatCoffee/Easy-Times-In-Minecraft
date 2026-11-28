package io.github.etim.etim.metal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * B-70VQ: 金属箭的基础伤害表（R196 ItemArrow :72-75 的 0.5 + bonus/2）。
 */
class ArrowDamageTest {

    @Test
    void copperAndSilverShareTheBase() {
        assertEquals(2.0D, ETIMItemArrow.damage(ETIMMetals.COPPER));
        assertEquals(2.0D, ETIMItemArrow.damage(ETIMMetals.SILVER));
    }

    @Test
    void ancientMetalSitsOneStepUp() {
        assertEquals(2.5D, ETIMItemArrow.damage(ETIMMetals.ANCIENT_METAL));
    }

    @Test
    void mithrilAndAdamantiumClimb() {
        assertEquals(3.0D, ETIMItemArrow.damage(ETIMMetals.MITHRIL));
        assertEquals(3.5D, ETIMItemArrow.damage(ETIMMetals.ADAMANTIUM));
    }

    @Test
    void rustedIronAndGoldAreTheWeakest() {
        assertEquals(1.5D, ETIMItemArrow.damage(ETIMMetals.RUSTED_IRON));
        assertEquals(1.5D, ETIMItemArrow.damage(ETIMMetals.GOLD));
    }

    @Test
    void formulaTracksTheDamageBonusColumn() {
        for (ETIMMetals m : ETIMMetals.values()) {
            assertEquals(0.5D + m.damageBonus * 0.5D, ETIMItemArrow.damage(m), 1e-9, m.name);
        }
    }

    @Test
    void damageIsMonotonicInTheBonus() {
        assertTrue(ETIMItemArrow.damage(ETIMMetals.ADAMANTIUM) > ETIMItemArrow.damage(ETIMMetals.MITHRIL));
        assertTrue(ETIMItemArrow.damage(ETIMMetals.MITHRIL) > ETIMItemArrow.damage(ETIMMetals.ANCIENT_METAL));
        assertTrue(ETIMItemArrow.damage(ETIMMetals.ANCIENT_METAL) > ETIMItemArrow.damage(ETIMMetals.COPPER));
        assertTrue(ETIMItemArrow.damage(ETIMMetals.COPPER) > ETIMItemArrow.damage(ETIMMetals.RUSTED_IRON));
    }
}
