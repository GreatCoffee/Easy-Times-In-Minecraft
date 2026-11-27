package io.github.etim.etim.hunger;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * R196 {@code EntityPlayer.addMovementStat} 的位移→饥饿换算（B-70UV）。
 */
class EnduranceGatesTest {

    @Test
    void oneBlockWalkIsOneHundredCentimetres() {
        assertEquals(100, EnduranceGates.distanceCm(1.0D, 0.0D, 0.0D, false, false));
        assertEquals(100, EnduranceGates.distanceCm(0.0D, 0.0D, -1.0D, false, false));
    }

    @Test
    void walkIgnoresVerticalComponent() {
        // 行走按 2D：跳跃的 dy 不计（R196 :1700 的口径）。
        assertEquals(100, EnduranceGates.distanceCm(1.0D, 0.8D, 0.0D, false, false));
        assertEquals(128, EnduranceGates.distanceCm(1.0D, 0.8D, 0.0D, true, false));
    }

    @Test
    void swimUsesThreeDimensions() {
        assertEquals(300, EnduranceGates.distanceCm(0.0D, 3.0D, 0.0D, true, false));
    }

    @Test
    void diagonalRoundsLikeVanilla() {
        // sqrt(2)*100 = 141.42 → 141（Math.round(float)）。
        assertEquals(141, EnduranceGates.distanceCm(1.0D, 0.0D, 1.0D, false, false));
        // 0.005 * 1.0 → 0.5cm 四舍五入到 1。
        assertEquals(1, EnduranceGates.distanceCm(0.005D, 0.0D, 0.0D, false, false));
    }

    @Test
    void sleepingForcesZero() {
        assertEquals(0, EnduranceGates.distanceCm(4.0D, 2.0D, 3.0D, true, true));
    }

    @Test
    void standingStillIsZero() {
        assertEquals(0, EnduranceGates.distanceCm(0.0D, 0.0D, 0.0D, true, false));
    }

    @Test
    void perMeterScalesByRateAndCentimetres() {
        assertEquals(0.05F, EnduranceGates.perMeter(5.0F, 1), 1.0E-6F);
        assertEquals(0.5F, EnduranceGates.perMeter(5.0F, 10), 1.0E-6F);
        assertEquals(0.0F, EnduranceGates.perMeter(5.0F, 0), 1.0E-6F);
    }

    @Test
    void sprintRateIsAppliedToSameCentimetres() {
        float walk = EnduranceGates.perMeter(1.0F, 250);
        float sprint = EnduranceGates.perMeter(3.0F, 250);
        assertEquals(3.0F * walk, sprint, 1.0E-6F);
    }

    @Test
    void ladderChargesUpwardOnly() {
        assertEquals(0.5F, EnduranceGates.ladderDrain(1.0D, 2.0F), 1.0E-6F);
        assertEquals(0.0F, EnduranceGates.ladderDrain(-1.0D, 2.0F), 1.0E-6F);
        assertEquals(0.0F, EnduranceGates.ladderDrain(0.0D, 2.0F), 1.0E-6F);
    }

    @Test
    void ladderDrainNeverNegative() {
        assertTrue(EnduranceGates.ladderDrain(0.2D, 4.0F) > 0.0F);
    }
}
