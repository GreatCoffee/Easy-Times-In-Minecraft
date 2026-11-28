package io.github.etim.etim.quality;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VF — the R196 quality ordinals
 * ({@link ETIMQuality#minOrdinal}, {@link ETIMQuality#maxOrdinal},
 * {@link ETIMQuality#qualityAdjustedDifficulty}, {@link ETIMQuality#getExperienceCost},
 * {@link ETIMQuality#getMaxQualityFor}).
 */
class QualityOrdinalTest {

    private static final int AVERAGE = EnumQuality.AVERAGE.ordinal();
    private static final int LEGENDARY = EnumQuality.LEGENDARY.ordinal();

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void averageIsTheOrdinalTwo() {
        assertEquals(2, AVERAGE);
        assertEquals(7, LEGENDARY);
    }

    @Test
    void minOrdinalFollowsLevelTensAndClampsAtZero() {
        assertEquals(AVERAGE, ETIMQuality.minOrdinal(0));
        assertEquals(AVERAGE, ETIMQuality.minOrdinal(9));
        assertEquals(1, ETIMQuality.minOrdinal(-10));
        assertEquals(0, ETIMQuality.minOrdinal(-20));
        assertEquals(0, ETIMQuality.minOrdinal(-500));
    }

    @Test
    void noExperienceFallsToTheFloor() {
        assertEquals(1, ETIMQuality.maxOrdinal(1, LEGENDARY, 0, 10.0F));
        assertEquals(1, ETIMQuality.maxOrdinal(1, LEGENDARY, -40, 10.0F));
    }

    @Test
    void hugeBudgetReachesTheItemCap() {
        assertEquals(LEGENDARY, ETIMQuality.maxOrdinal(AVERAGE, LEGENDARY, 100000, 1.0F));
    }

    @Test
    void itemCapBelowFloorStillReturnsTheFloor() {
        int min = AVERAGE;
        assertEquals(min, ETIMQuality.maxOrdinal(min, min, 100000, 1.0F));
    }

    @Test
    void difficultyDoublesPerStepAboveAverage() {
        assertEquals(10.0F, ETIMQuality.qualityAdjustedDifficulty(10.0F, AVERAGE), 1.0E-4F);
        assertEquals(20.0F, ETIMQuality.qualityAdjustedDifficulty(10.0F, AVERAGE + 1), 1.0E-4F);
        assertEquals(40.0F, ETIMQuality.qualityAdjustedDifficulty(10.0F, AVERAGE + 2), 1.0E-4F);
        assertEquals(80.0F, ETIMQuality.qualityAdjustedDifficulty(10.0F, AVERAGE + 3), 1.0E-4F);
    }

    @Test
    void belowAverageIsNotDiscounted() {
        assertEquals(10.0F, ETIMQuality.qualityAdjustedDifficulty(10.0F, AVERAGE - 1), 1.0E-4F);
        assertEquals(10.0F, ETIMQuality.qualityAdjustedDifficulty(10.0F, 0), 1.0E-4F);
    }

    @Test
    void experienceCostIsDifficultyOverFiveRounded() {
        assertEquals(0, ETIMQuality.getExperienceCost(0.0F));
        assertEquals(2, ETIMQuality.getExperienceCost(10.0F));
        assertEquals(1, ETIMQuality.getExperienceCost(7.0F));
        assertEquals(8, ETIMQuality.getExperienceCost(40.0F));
        assertEquals(20, ETIMQuality.getExperienceCost(100.0F));
    }

    @Test
    void plainVanillaItemsCapAtAverage() {
        ItemStack iron = new ItemStack(Items.IRON_INGOT);
        assertTrue(ETIMQuality.getMaxQualityFor(iron.getItem()).ordinal() <= LEGENDARY);
    }
}
