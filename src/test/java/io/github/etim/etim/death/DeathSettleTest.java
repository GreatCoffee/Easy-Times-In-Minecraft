package io.github.etim.etim.death;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * B-70VS: the R196 sub-level death settlement arithmetic
 * ({@code ServerPlayer:953-957}), extracted into {@link ETIMDeathXp#settleFor}
 * and {@link ETIMDeathXp#levelForSettle}.
 */
public class DeathSettleTest {

    @BeforeAll
    static void boot() {
        net.minecraft.init.Bootstrap.register();
    }

    @Test
    void unitAndFloorAreR196Constants() {
        assertEquals(20, ETIMDeathXp.SETTLE_UNIT);
        assertEquals(-800, ETIMDeathXp.SETTLE_FLOOR);
    }

    @Test
    void zeroTotalSettlesOneUnitDown() {
        assertEquals(-20, ETIMDeathXp.settleFor(0, 123));
    }

    @Test
    void nineteenTotalSettlesToMinusOne() {
        assertEquals(-1, ETIMDeathXp.settleFor(19, 123));
    }

    @Test
    void atOrAboveUnitKeepsStaleValue() {
        assertEquals(-40, ETIMDeathXp.settleFor(20, -40));
        assertEquals(7, ETIMDeathXp.settleFor(100, 7));
        assertEquals(0, ETIMDeathXp.settleFor(20, 0));
    }

    @Test
    void deepDebtClampsAtFloor() {
        assertEquals(-800, ETIMDeathXp.settleFor(-790, 0));
        assertEquals(-800, ETIMDeathXp.settleFor(-5000, 0));
    }

    @Test
    void levelIsTotalOverTwenty() {
        assertEquals(-40, ETIMDeathXp.levelForSettle(-800));
        assertEquals(-5, ETIMDeathXp.levelForSettle(-100));
        assertEquals(0, ETIMDeathXp.levelForSettle(-19));
        assertEquals(0, ETIMDeathXp.levelForSettle(0));
        assertEquals(0, ETIMDeathXp.levelForSettle(50));
    }

    @Test
    void levelAlsoClampsAtTheFloor() {
        assertEquals(-40, ETIMDeathXp.levelForSettle(-1000));
    }
}
