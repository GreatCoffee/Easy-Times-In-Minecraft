package io.github.etim.etim.combat;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** B-70VA: R196 附魔预算放大（EnchantmentHelper.java:225-250）。 */
class EnchantGatesTest {

    @Test
    void zeroEnchantabilityZeroesBudget() {
        assertEquals(0, EnchantGates.altered(30, 0));
        assertEquals(0, EnchantGates.altered(30, -5));
    }

    @Test
    void budgetAtOrBelowEnchantabilityIsUnchanged() {
        assertEquals(0, EnchantGates.altered(0, 10));
        assertEquals(7, EnchantGates.altered(7, 10));
        assertEquals(10, EnchantGates.altered(10, 10));
    }

    @Test
    void firstStretchAddsHalfPerPoint() {
        // E=10: 11..20 每点 +0.5 → 15 级 = 10 + 2.5 = 12.5 → 13
        assertEquals(13, EnchantGates.altered(15, 10));
        // 20 级 = 10 + 5 = 15
        assertEquals(15, EnchantGates.altered(20, 10));
    }

    @Test
    void secondStretchAddsQuarterPerPoint() {
        // 21..30 每点 +0.25 → 30 级 = 15 + 2.5 = 17.5 → 18
        assertEquals(18, EnchantGates.altered(30, 10));
    }

    @Test
    void beyondThirdEIsTruncated() {
        assertEquals(18, EnchantGates.altered(31, 10));
        assertEquals(18, EnchantGates.altered(100, 10));
    }

    @Test
    void roundingIsHalfUp() {
        // E=4: 5..8 每点 +0.5 → 6 级 = 4 + 1 = 5
        assertEquals(5, EnchantGates.altered(6, 4));
        // E=3: 4..6 每点 +0.5 → 5 级 = 3 + 1 = 4；7..9 每点 +0.25 → 7 级 = 4.5 → 5
        assertEquals(4, EnchantGates.altered(5, 3));
        assertEquals(5, EnchantGates.altered(7, 3));
    }

    @Test
    void enchantabilityOneStretchesToThree() {
        // E=1: 2 级 = 1.5 → 2；3 级 = 1.75 → 2；4 级截断
        assertEquals(2, EnchantGates.altered(2, 1));
        assertEquals(2, EnchantGates.altered(3, 1));
        assertEquals(2, EnchantGates.altered(9, 1));
    }
}
