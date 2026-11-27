package io.github.etim.etim.fishing;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * R196 {@code EntityFishHook :153-174} 的时钟与级联链（B-70UV）。
 */
class FishingGatesTest {

    private static final int MIN = 20;
    private static final int MAX = 1200;
    private static final float FORTUNE = 1.5F;
    private static final float WORM = 2.0F;

    private static int[] cascade(int adj, int fortune, int lure, boolean worm, boolean light, boolean blue) {
        return FishingGates.cascade(adj, fortune, lure, worm, light, blue, MIN, MAX, FORTUNE, WORM);
    }

    @Test
    void adjustedTimeShiftsBySixThousand() {
        assertEquals(6000, FishingGates.adjustedTime(0L));
        assertEquals(0, FishingGates.adjustedTime(18000L));
        assertEquals(5999, FishingGates.adjustedTime(23999L));
    }

    @Test
    void adjustedTimeWrapsAcrossDays() {
        assertEquals(6000, FishingGates.adjustedTime(24000L));
        assertEquals(1, FishingGates.adjustedTime(24000L * 3L + 18001L));
    }

    @Test
    void clockDistancePicksNearerPeak() {
        assertEquals(0, FishingGates.clockDistance(5500));
        assertEquals(0, FishingGates.clockDistance(17500));
        assertEquals(500, FishingGates.clockDistance(5000));
        assertEquals(500, FishingGates.clockDistance(18000));
        assertEquals(5000, FishingGates.clockDistance(10500));
    }

    @Test
    void blueMoonEveryOneTwentyEightDays() {
        // R196 :2395 — (day + 1) % 128 == 0，day 从 0 起。
        assertTrue(FishingGates.blueMoonCycle(24000L * 127L));
        assertFalse(FishingGates.blueMoonCycle(24000L * 126L));
        assertTrue(FishingGates.blueMoonCycle(24000L * 255L));
    }

    @Test
    void cascadeAtPeakGivesFullChance() {
        // dist=0 → timeFactor=0 → ci0=0 被 clamp 到 MIN（R196 同口径）。
        assertArrayEquals(new int[]{MIN, MIN, MIN, MIN, MIN}, cascade(5500, 0, 0, false, false, false));
    }

    @Test
    void cascadeTimeFactorUsesSixtyTickUnit() {
        // dist=3000 → 600 * (3000/600) = 3000 → clamp 到 MAX。
        assertArrayEquals(new int[]{MAX, MAX, MAX, MAX, MAX}, cascade(2500, 0, 0, false, false, false));
    }

    @Test
    void cascadeLightHalvesAfterClamp() {
        int[] noLight = cascade(8000, 0, 0, false, false, false);
        int[] light = cascade(8000, 0, 0, false, true, false);
        assertTrue(noLight[0] > MIN);
        assertEquals(noLight[0] / 2, light[1]);
        assertEquals(light[1], light[2]);
    }

    @Test
    void cascadeBlueMoonForcesSixHundred() {
        // 蓝月面固定 600（再 clamp），与时钟无关。
        int[] blue = cascade(3000, 0, 0, false, false, true);
        assertEquals(600, blue[0]);
        assertEquals(300, cascade(3000, 0, 0, false, true, true)[1]);
    }

    @Test
    void cascadeFortuneAndLureMultiply() {
        // 从 600 起：600 → ×1.5 → 900 → ×1.5 → 1350。
        int[] one = cascade(3000, 1, 0, false, false, true);
        int[] two = cascade(3000, 2, 0, false, false, true);
        assertEquals(900, one[3]);
        assertEquals(1350, two[3]);
    }

    @Test
    void cascadeLureCountsSameAsFortune() {
        assertEquals(cascade(3000, 2, 0, false, false, true)[3], cascade(3000, 0, 2, false, false, true)[3]);
    }

    @Test
    void cascadeWormMultipliesLastStageOnly() {
        int[] dry = cascade(3000, 0, 0, false, false, true);
        int[] worm = cascade(3000, 0, 0, true, false, true);
        assertEquals(dry[3], worm[3]);
        assertEquals((int) (worm[3] * WORM), worm[4]);
    }

    @Test
    void cascadeNeverReturnsZero() {
        // 下限保护：任何输入下 ci4 至少 1（否则 nextInt(0) 崩）。
        int[] tiny = FishingGates.cascade(5500, 0, 0, false, false, false, 0, 0, 0.5F, 0.5F);
        assertTrue(tiny[4] >= 1);
    }

    @Test
    void cascadeClampsOnlyTheFirstStage() {
        // R196 only clamps ci0; later stages may exceed max (vanilla same).
        int[] huge = cascade(2500, 6, 6, true, false, false);
        assertEquals(MAX, huge[0]);
        assertTrue(huge[4] > MAX);
    }
}
