package io.github.etim.etim.playerstate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * B-70VP: R196 睡眠窗口与日出倒计时（World.java:1694-1696 / 睡觉门 :537-549 的时间轴）。
 */
class SleepClockTest {

    @Test
    void windowOpensBeforeDawn() {
        assertTrue(ETIMSleepClock.windowOpen(0));
        assertTrue(ETIMSleepClock.windowOpen(3999));
    }

    @Test
    void windowClosesAtFourThousand() {
        assertFalse(ETIMSleepClock.windowOpen(4000));
        assertFalse(ETIMSleepClock.windowOpen(12000));
        assertFalse(ETIMSleepClock.windowOpen(20999));
    }

    @Test
    void windowReopensAtTwentyOneThousand() {
        assertTrue(ETIMSleepClock.windowOpen(21000));
        assertTrue(ETIMSleepClock.windowOpen(23999));
    }

    @Test
    void sunriseCountdownSameDay() {
        assertEquals(5000, ETIMSleepClock.ticksTillSunrise(0));
        assertEquals(1, ETIMSleepClock.ticksTillSunrise(4999));
    }

    @Test
    void sunriseCountdownWrapsAfterFiveThousand() {
        assertEquals(24000, ETIMSleepClock.ticksTillSunrise(5000));
        assertEquals(23000, ETIMSleepClock.ticksTillSunrise(6000));
        assertEquals(5000, ETIMSleepClock.ticksTillSunrise(24000));
    }

    @Test
    void countdownNeverExceedsOneDay() {
        for (long t = 0; t < 24000; t += 137) {
            int ticks = ETIMSleepClock.ticksTillSunrise(t);
            assertTrue(ticks >= 1 && ticks <= 24000, "t=" + t + " ticks=" + ticks);
        }
    }
}
