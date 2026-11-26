package io.github.etim.etim.crafting;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * B-70TG: R196 crafting period / quality-budget arithmetic, pure-function
 * coverage for the B-volume judgement values (audit 7 §1.2–§3.2).
 *
 * <p>AVERAGE is ordinal 2 on the eight-rung ladder (EnumQuality), so the
 * max-ordinal walk starts at the item's top rung and stops above 2.</p>
 */
class CraftingGatesTest {

    private static final float CURVE = 0.8F;
    private static final int AVERAGE = 2;

    // ------------------------------------------------------ unmodified period

    @Test
    void belowTwentyFiveClampsTo25() {
        assertEquals(25, CraftingGates.unmodifiedPeriod(0.0F, CURVE));
        assertEquals(25, CraftingGates.unmodifiedPeriod(24.9F, CURVE));
    }

    @Test
    void inRangeRoundsToNearestTick() {
        assertEquals(25, CraftingGates.unmodifiedPeriod(25.0F, CURVE));
        assertEquals(50, CraftingGates.unmodifiedPeriod(50.0F, CURVE));
        assertEquals(99, CraftingGates.unmodifiedPeriod(99.4F, CURVE));
        assertEquals(100, CraftingGates.unmodifiedPeriod(100.0F, CURVE));
    }

    @Test
    void aboveHundredUsesPowerCurve() {
        // 1^0.8 = 1 → 101; 25^0.8 = 13.13 → 113; 100^0.8 = 39.81 → 140.
        assertEquals(101, CraftingGates.unmodifiedPeriod(101.0F, CURVE));
        assertEquals(113, CraftingGates.unmodifiedPeriod(125.0F, CURVE));
        assertEquals(140, CraftingGates.unmodifiedPeriod(200.0F, CURVE));
    }

    @Test
    void exponentOneIsIdentityAboveHundred() {
        assertEquals(150, CraftingGates.unmodifiedPeriod(150.0F, 1.0F));
    }

    // --------------------------------------------------------------- period

    @Test
    void levelZeroNoBenchKeepsUnmodified() {
        assertEquals(100, CraftingGates.period(100, 0, 0.0F, 0.02F, 25));
    }

    @Test
    void levelsAndBenchDivide() {
        assertEquals(83, CraftingGates.period(100, 10, 0.0F, 0.02F, 25)); // 100/1.2
        assertEquals(33, CraftingGates.period(100, 100, 0.0F, 0.02F, 25)); // 100/3
        assertEquals(83, CraftingGates.period(100, 0, 0.2F, 0.02F, 25)); // bench 0.2
        assertEquals(45, CraftingGates.period(100, 50, 0.2F, 0.02F, 25)); // 100/2.2
    }

    @Test
    void floorWins() {
        assertEquals(25, CraftingGates.period(25, 100, 10.0F, 0.02F, 25)); // 25/13 → 25
        assertEquals(1, CraftingGates.period(25, 100, 10.0F, 0.02F, 1));
    }

    // ------------------------------------------------ quality difficulty/cost

    @Test
    void averageRungIsUnadjusted() {
        assertEquals(10.0F, CraftingGates.qualityAdjustedDifficulty(10.0F, AVERAGE, AVERAGE));
    }

    @Test
    void rungsAboveAverageDouble() {
        assertEquals(20.0F, CraftingGates.qualityAdjustedDifficulty(10.0F, 3, AVERAGE));
        assertEquals(80.0F, CraftingGates.qualityAdjustedDifficulty(10.0F, 5, AVERAGE));
        assertEquals(320.0F, CraftingGates.qualityAdjustedDifficulty(10.0F, 7, AVERAGE));
    }

    @Test
    void belowAverageIsNotDiscounted() {
        assertEquals(10.0F, CraftingGates.qualityAdjustedDifficulty(10.0F, 0, AVERAGE));
        assertEquals(10.0F, CraftingGates.qualityAdjustedDifficulty(10.0F, 1, AVERAGE));
    }

    @Test
    void experienceCostRoundsByFive() {
        assertEquals(0, CraftingGates.experienceCost(0.0F));
        assertEquals(1, CraftingGates.experienceCost(2.5F));
        assertEquals(1, CraftingGates.experienceCost(7.4F));
        assertEquals(8, CraftingGates.experienceCost(40.0F));
        assertEquals(20, CraftingGates.experienceCost(100.0F));
    }

    // ------------------------------------------------------ picker min / max

    @Test
    void minStaysAtAverageForNormalLevels() {
        assertEquals(2, CraftingGates.minOrdinal(0, AVERAGE));
        assertEquals(2, CraftingGates.minOrdinal(9, AVERAGE));
        assertEquals(2, CraftingGates.minOrdinal(100, AVERAGE));
    }

    @Test
    void negativeLevelLowersTheFloor() {
        assertEquals(1, CraftingGates.minOrdinal(-10, AVERAGE));
        assertEquals(0, CraftingGates.minOrdinal(-20, AVERAGE));
        assertEquals(0, CraftingGates.minOrdinal(-100, AVERAGE)); // clamped at 0
    }

    @Test
    void noBudgetFallsToMin() {
        assertEquals(2, CraftingGates.maxOrdinal(2, 7, AVERAGE, 0, 10.0F));
        assertEquals(2, CraftingGates.maxOrdinal(2, 7, AVERAGE, -5, 10.0F));
    }

    @Test
    void budgetPicksFirstAffordableRung() {
        // difficulty 10 → rung 3 costs 4, 4 costs 8, 5 costs 16, 6 costs 32, 7 costs 64
        assertEquals(3, CraftingGates.maxOrdinal(2, 7, AVERAGE, 4, 10.0F));
        assertEquals(3, CraftingGates.maxOrdinal(2, 7, AVERAGE, 5, 10.0F));
        assertEquals(4, CraftingGates.maxOrdinal(2, 7, AVERAGE, 8, 10.0F));
        assertEquals(7, CraftingGates.maxOrdinal(2, 7, AVERAGE, 64, 10.0F));
    }

    @Test
    void insufficientForAnyRungFallsToMin() {
        assertEquals(2, CraftingGates.maxOrdinal(2, 7, AVERAGE, 3, 10.0F));
    }

    @Test
    void averageRungIsNeverBudgetChecked() {
        // item max == average: no walk, min returned even with a huge budget.
        assertEquals(2, CraftingGates.maxOrdinal(2, 2, AVERAGE, 100000, 10.0F));
    }

    @Test
    void higherDifficultyDemandsMoreBudget() {
        assertEquals(4, CraftingGates.maxOrdinal(2, 7, AVERAGE, 8, 10.0F)); // rung 4 costs exactly 8
        assertEquals(2, CraftingGates.maxOrdinal(2, 7, AVERAGE, 8, 40.0F)); // rung 3 now costs 16
    }
}
