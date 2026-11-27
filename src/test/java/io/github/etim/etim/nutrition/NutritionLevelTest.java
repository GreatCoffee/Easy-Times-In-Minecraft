package io.github.etim.etim.nutrition;

import net.minecraft.init.Bootstrap;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** R196 insulin band ladder and the lag mirror (ServerPlayer.setInsulinResistance). */
class NutritionLevelTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    private static final int MILD = 100;
    private static final int MODERATE = 200;
    private static final int SEVERE = 300;

    private static int raw(int value) {
        return NutritionSystem.rawLevel(value, MILD, MODERATE, SEVERE);
    }

    private static int mirror(int value, int held) {
        return NutritionSystem.mirrorLevel(value, held, MILD, MODERATE, SEVERE);
    }

    @Test
    void rawBandsAreInclusiveAtThreshold() {
        assertEquals(NutritionSystem.LEVEL_NONE, raw(0));
        assertEquals(NutritionSystem.LEVEL_NONE, raw(99));
        assertEquals(NutritionSystem.LEVEL_MILD, raw(100));
        assertEquals(NutritionSystem.LEVEL_MILD, raw(199));
        assertEquals(NutritionSystem.LEVEL_MODERATE, raw(200));
        assertEquals(NutritionSystem.LEVEL_MODERATE, raw(299));
        assertEquals(NutritionSystem.LEVEL_SEVERE, raw(300));
        assertEquals(NutritionSystem.LEVEL_SEVERE, raw(10000));
    }

    @Test
    void negativeValueIsNone() {
        assertEquals(NutritionSystem.LEVEL_NONE, raw(-50));
    }

    @Test
    void curedValueDropsEverything() {
        assertEquals(NutritionSystem.LEVEL_NONE, mirror(0, NutritionSystem.LEVEL_SEVERE));
        assertEquals(NutritionSystem.LEVEL_NONE, mirror(-5, NutritionSystem.LEVEL_MILD));
    }

    @Test
    void belowMildKeepsMildOnceHeld() {
        assertEquals(NutritionSystem.LEVEL_MILD, mirror(50, NutritionSystem.LEVEL_MODERATE));
        assertEquals(NutritionSystem.LEVEL_MILD, mirror(99, NutritionSystem.LEVEL_SEVERE));
    }

    @Test
    void belowMildStaysNoneWhenNothingHeld() {
        assertEquals(NutritionSystem.LEVEL_NONE, mirror(50, NutritionSystem.LEVEL_NONE));
    }

    @Test
    void risingAdoptsRawBand() {
        assertEquals(NutritionSystem.LEVEL_MODERATE, mirror(250, NutritionSystem.LEVEL_MILD));
        assertEquals(NutritionSystem.LEVEL_SEVERE, mirror(400, NutritionSystem.LEVEL_MODERATE));
    }

    @Test
    void freshPlayerTakesRawBand() {
        assertEquals(NutritionSystem.LEVEL_MILD, mirror(150, NutritionSystem.LEVEL_NONE));
        assertEquals(NutritionSystem.LEVEL_SEVERE, mirror(500, NutritionSystem.LEVEL_NONE));
    }

    @Test
    void decayKeepsOneBandAboveRawCappedByHeld() {
        // held severe, raw drops to none -> one band above raw = mild
        assertEquals(NutritionSystem.LEVEL_MILD, mirror(10, NutritionSystem.LEVEL_SEVERE));
        // held severe, raw mild -> min(severe, mild+1) = moderate
        assertEquals(NutritionSystem.LEVEL_MODERATE, mirror(120, NutritionSystem.LEVEL_SEVERE));
        // held moderate, raw none -> mild
        assertEquals(NutritionSystem.LEVEL_MILD, mirror(10, NutritionSystem.LEVEL_MODERATE));
    }

    @Test
    void equalBandStaysPut() {
        assertEquals(NutritionSystem.LEVEL_MODERATE, mirror(220, NutritionSystem.LEVEL_MODERATE));
        assertEquals(NutritionSystem.LEVEL_SEVERE, mirror(900, NutritionSystem.LEVEL_SEVERE));
    }

    @Test
    void mirrorNeverExceedsSevere() {
        for (int value = -10; value <= 1000; value += 17) {
            for (int held = 0; held <= 3; held++) {
                int out = mirror(value, held);
                assertEquals(true, out >= NutritionSystem.LEVEL_NONE && out <= NutritionSystem.LEVEL_SEVERE,
                        "value=" + value + " held=" + held + " out=" + out);
            }
        }
    }

    @Test
    void realConfigDelegationMatchesSeam() {
        for (int level = 0; level < 40; level++) {
            assertEquals(NutritionSystem.rawLevel(level * 10, io.github.etim.etim.ETIMConfig.insulinThresholdMild,
                            io.github.etim.etim.ETIMConfig.insulinThresholdModerate,
                            io.github.etim.etim.ETIMConfig.insulinThresholdSevere),
                    NutritionSystem.rawLevel(level * 10));
        }
    }
}
