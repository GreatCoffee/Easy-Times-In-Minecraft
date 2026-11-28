package io.github.etim.etim.playerstate;

import net.minecraft.init.Bootstrap;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VF — the R196 XP curve
 * ({@link ETIMXp#pointsForLevel}, {@link ETIMXp#levelForPoints}, {@link ETIMXp#barFor}).
 */
class XpCurveTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void pointsFollowTheClosedForm() {
        assertEquals(0, ETIMXp.pointsForLevel(0));
        assertEquals(20, ETIMXp.pointsForLevel(1));
        assertEquals(50, ETIMXp.pointsForLevel(2));
        assertEquals(90, ETIMXp.pointsForLevel(3));
        assertEquals(5 * 10 * 10 + 15 * 10, ETIMXp.pointsForLevel(10));
    }

    @Test
    void negativeAndOverCapLevels() {
        assertEquals(0, ETIMXp.pointsForLevel(-3));
        assertEquals(Integer.MAX_VALUE, ETIMXp.pointsForLevel(ETIMXp.MAX_LEVEL + 1));
    }

    @Test
    void levelOwningThePoolIsTheInverse() {
        assertEquals(0, ETIMXp.levelForPoints(0));
        assertEquals(0, ETIMXp.levelForPoints(19));
        assertEquals(1, ETIMXp.levelForPoints(20));
        assertEquals(1, ETIMXp.levelForPoints(49));
        assertEquals(2, ETIMXp.levelForPoints(50));
        assertEquals(2, ETIMXp.levelForPoints(89));
        assertEquals(3, ETIMXp.levelForPoints(90));
    }

    @Test
    void roundTripHoldsAcrossTheLadder() {
        for (int level = 0; level <= 30; level++) {
            assertEquals(level, ETIMXp.levelForPoints(ETIMXp.pointsForLevel(level)), "level " + level);
        }
    }

    @Test
    void debtLevelsFloorAtForty() {
        assertEquals(-1, ETIMXp.levelForPoints(-1));
        assertEquals(-40, ETIMXp.levelForPoints(-800));
        assertEquals(-40, ETIMXp.levelForPoints(-100000));
    }

    @Test
    void barIsAFractionOfTheLevelSpan() {
        assertEquals(0.0F, ETIMXp.barFor(20, 1), 1.0E-4F);
        assertEquals(0.5F, ETIMXp.barFor(35, 1), 1.0E-4F);
        assertEquals(0.0F, ETIMXp.barFor(0, 0), 1.0E-4F);
        assertEquals(1.0F, ETIMXp.barFor(ETIMXp.pointsForLevel(ETIMXp.MAX_LEVEL), ETIMXp.MAX_LEVEL), 1.0E-4F);
    }

    @Test
    void barClampsAndDebtHasNoBar() {
        assertEquals(0.0F, ETIMXp.barFor(-5, -1), 1.0E-4F);
        assertTrue(ETIMXp.barFor(0, 1) <= 0.0F);
        assertTrue(ETIMXp.barFor(ETIMXp.pointsForLevel(2) + 1000, 1) >= 1.0F);
    }
}
