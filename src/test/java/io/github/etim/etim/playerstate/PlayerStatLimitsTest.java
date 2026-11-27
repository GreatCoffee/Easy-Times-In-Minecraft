package io.github.etim.etim.playerstate;

import net.minecraft.init.Bootstrap;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** R196 cap ladder (PlayerStatLimits), pure formula seams. */
class PlayerStatLimitsTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    private static final int BASE = 6;
    private static final int GROWTH = 2;
    private static final int MAX = 20;

    private static int cap(int level) {
        return PlayerStatLimits.capFor(level, BASE, GROWTH, MAX);
    }

    @Test
    void levelZeroIsBase() {
        assertEquals(6, cap(0));
    }

    @Test
    void firstBandEndsAtFour() {
        assertEquals(6, cap(4));
        assertEquals(8, cap(5));
    }

    @Test
    void reachesVanillaMaxAtThirtyFive() {
        assertEquals(20, cap(35));
        assertEquals(20, cap(100));
    }

    @Test
    void clampsAtMaximumBeforeThirtyFive() {
        // 6 + level/5*2 >= 20 from level 35 on; never overshoots.
        for (int level = 35; level < 200; level++) {
            assertEquals(20, cap(level), "level " + level);
        }
    }

    @Test
    void negativeLevelsNeverDropBelowBase() {
        assertEquals(6, cap(-5));
        assertEquals(6, cap(-30));
    }

    @Test
    void growthIsFloorDivision() {
        // level 9 -> 9/5 = 1 band
        assertEquals(8, cap(9));
        assertEquals(10, cap(10));
    }

    @Test
    void iconCountIsHalfPoints() {
        assertEquals(3, PlayerStatLimits.getIconCount(0));
        assertEquals(4, PlayerStatLimits.getIconCount(5));
        assertEquals(10, PlayerStatLimits.getIconCount(35));
    }

    @Test
    void zeroGrowthConfigKeepsFlatCap() {
        assertEquals(6, PlayerStatLimits.capFor(50, 6, 0, 20));
    }

    @Test
    void maximumBelowBaseWinsAtTheEnd() {
        // capMaximum is applied last (R196 min(max(...))), so a mis-set maximum wins.
        assertEquals(5, PlayerStatLimits.capFor(0, 6, 2, 5));
    }

    @Test
    void realConfigDelegationMatchesSeam() {
        assertEquals(PlayerStatLimits.capFor(0, io.github.etim.etim.ETIMConfig.capAtLevel0,
                io.github.etim.etim.ETIMConfig.capGrowthPerFiveLevels,
                io.github.etim.etim.ETIMConfig.capMaximum), PlayerStatLimits.getHealthFoodCap(0));
        assertEquals(PlayerStatLimits.capFor(35, io.github.etim.etim.ETIMConfig.capAtLevel0,
                io.github.etim.etim.ETIMConfig.capGrowthPerFiveLevels,
                io.github.etim.etim.ETIMConfig.capMaximum), PlayerStatLimits.getHealthFoodCap(35));
    }
}
