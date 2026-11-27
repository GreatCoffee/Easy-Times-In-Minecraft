package io.github.etim.etim.farm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * B-70UQ: pure faces of the R196 growth-rate chain
 * (BlockGrowingPlant.java:38-84 / :162-221, BlockCrops.java:205-207).
 */
class GrowthGatesTest {

    private static final float EPS = 1.0E-6F;

    @Test
    void temperatureInsideTheWindowIsFullRate() {
        assertEquals(1.0F, GrowthGates.tempModifier(0.7F, 0.7F, 0.7F, 1.0F), EPS);
        assertEquals(1.0F, GrowthGates.tempModifier(0.5F, 0.4F, 0.8F, 1.0F), EPS);
    }

    @Test
    void temperatureOutsideTheWindowLosesOnePerDegree() {
        assertEquals(0.5F, GrowthGates.tempModifier(0.2F, 0.7F, 0.7F, 1.0F), EPS);
        assertEquals(0.7F, GrowthGates.tempModifier(1.0F, 0.7F, 0.7F, 1.0F), EPS);
    }

    @Test
    void temperatureGapBeyondToleranceFloorsAtZero() {
        assertEquals(0.0F, GrowthGates.tempModifier(5.0F, 0.7F, 0.7F, 1.0F), EPS);
        assertEquals(0.0F, GrowthGates.tempModifier(-30.0F, 0.7F, 0.7F, 1.0F), EPS);
    }

    @Test
    void widerToleranceSoftensThePenalty() {
        assertEquals(0.75F, GrowthGates.tempModifier(0.2F, 0.7F, 0.7F, 2.0F), EPS);
    }

    @Test
    void zeroNeighboursHalveTheRate() {
        assertEquals(0.5F, GrowthGates.proximity(0, false), EPS);
        assertEquals(0.5F, GrowthGates.proximity(0, true), EPS);
    }

    @Test
    void singleNeighbourWithoutExtensionIsThreeQuarters() {
        assertEquals(0.75F, GrowthGates.proximity(1, false), EPS);
    }

    @Test
    void singleNeighbourWithExtensionIsFullRate() {
        assertEquals(1.0F, GrowthGates.proximity(1, true), EPS);
    }

    @Test
    void twoOrMoreNeighboursAreAlwaysFullRate() {
        assertEquals(1.0F, GrowthGates.proximity(2, false), EPS);
        assertEquals(1.0F, GrowthGates.proximity(4, false), EPS);
    }

    @Test
    void fertilizedFactorOnlyAppliesWhenSet() {
        assertEquals(0.1F, GrowthGates.compose(0.1F, false, 3.0F, 1.0F, 1.0F, 1.0F, 1.0F), EPS);
        assertEquals(0.3F, GrowthGates.compose(0.1F, true, 3.0F, 1.0F, 1.0F, 1.0F, 1.0F), EPS);
    }

    @Test
    void everyModifierMultipliesIn() {
        // 0.1 base, fertilized x2, temp 0.5, humidity 0.5, global 1, proximity 0.75
        assertEquals(0.0375F, GrowthGates.compose(0.1F, true, 2.0F, 0.5F, 0.5F, 1.0F, 0.75F), EPS);
    }

    @Test
    void zeroFactorCollapsesTheRate() {
        assertEquals(0.0F, GrowthGates.compose(0.1F, false, 1.0F, 0.0F, 1.0F, 1.0F, 1.0F), EPS);
    }

    @Test
    void lightBelowFloorAlwaysBlocks() {
        assertTrue(GrowthGates.lightBlocked(7, false, 8, 15));
        assertTrue(GrowthGates.lightBlocked(7, true, 8, 15));
        assertTrue(GrowthGates.lightBlocked(0, true, 8, 15));
    }

    @Test
    void lightInsideTheWindowPasses() {
        assertFalse(GrowthGates.lightBlocked(8, false, 8, 15));
        assertFalse(GrowthGates.lightBlocked(15, false, 8, 15));
        assertFalse(GrowthGates.lightBlocked(12, true, 8, 15));
    }

    @Test
    void lightAboveCeilingBlocksCropsButNotStems() {
        assertTrue(GrowthGates.lightBlocked(16, false, 8, 15));
        assertFalse(GrowthGates.lightBlocked(16, true, 8, 15));
    }
}
