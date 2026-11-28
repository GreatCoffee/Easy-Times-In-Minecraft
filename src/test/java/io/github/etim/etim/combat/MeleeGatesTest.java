package io.github.etim.etim.combat;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** B-70VA: Melee 三项附魔的纯算术（R196 stun / vampiric / disarming）。 */
class MeleeGatesTest {

    @Test
    void stunPassesIsStrictlyGreater() {
        assertTrue(MeleeGates.stunPasses(1, 0.5F));
        assertFalse(MeleeGates.stunPasses(1, 1.0F));
        assertFalse(MeleeGates.stunPasses(0, 0.0F));
        assertTrue(MeleeGates.stunPasses(3, 2.999F));
    }

    @Test
    void stunAmplitudeMultipliesPerLevel() {
        assertEquals(0, MeleeGates.stunAmplitude(0, 2));
        assertEquals(2, MeleeGates.stunAmplitude(1, 2));
        assertEquals(6, MeleeGates.stunAmplitude(3, 2));
    }

    @Test
    void stunDurationMultipliesPerLevel() {
        assertEquals(40, MeleeGates.stunDuration(2, 20));
        assertEquals(100, MeleeGates.stunDuration(5, 20));
    }

    @Test
    void vampiricTransferFloorsAtMinimum() {
        assertEquals(2, MeleeGates.vampiricTransfer(10.0F, 0.5F, 0.0F, 2));
        assertEquals(2, MeleeGates.vampiricTransfer(1.0F, 0.1F, 0.5F, 2));
        assertEquals(5, MeleeGates.vampiricTransfer(10.0F, 0.5F, 1.0F, 2));
    }

    @Test
    void vampiricTransferTruncatesThenClamps() {
        // 10 * 0.35 * 0.9 = 3.15 -> 3
        assertEquals(3, MeleeGates.vampiricTransfer(10.0F, 0.35F, 0.9F, 1));
        // 3 * 1.0 * 0.5 = 1.5 -> 1
        assertEquals(1, MeleeGates.vampiricTransfer(3.0F, 1.0F, 0.5F, 1));
    }

    @Test
    void vampiricTransferZeroDamageStillPaysMinimum() {
        // 纯函数按 R196 顺序：先乘后夹，0 伤害也落到下限（调用方在外面先拦 damage<=0）
        assertEquals(2, MeleeGates.vampiricTransfer(0.0F, 0.5F, 0.5F, 2));
    }

    @Test
    void disarmPassesOnStrictlyLowerRoll() {
        assertTrue(MeleeGates.disarmPasses(1, 0.19F, 5));
        assertFalse(MeleeGates.disarmPasses(1, 0.20F, 5));
        assertTrue(MeleeGates.disarmPasses(5, 0.99F, 5));
        assertFalse(MeleeGates.disarmPasses(5, 1.0F, 5));
    }

    @Test
    void disarmRejectsNonPositiveMaxLevel() {
        assertFalse(MeleeGates.disarmPasses(3, 0.0F, 0));
        assertFalse(MeleeGates.disarmPasses(3, 0.0F, -1));
    }
}
