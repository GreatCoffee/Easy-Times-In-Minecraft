package io.github.etim.etim.mob;

import net.minecraft.init.Bootstrap;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** R196 moon derivation (ETIMMoonState): phase ladder, night clock, spawn weights. */
class MoonPhaseTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @AfterEach
    void resetOverride() {
        ETIMMoonState.setOverride("");
    }

    @Test
    void blueOutranksBloodOnCommonMultiples() {
        assertEquals(ETIMMoonState.Phase.BLUE, ETIMMoonState.phaseForDay(128));
        assertEquals(ETIMMoonState.Phase.BLOOD, ETIMMoonState.phaseForDay(32));
        assertEquals(ETIMMoonState.Phase.BLUE, ETIMMoonState.phaseForDay(0));
    }

    @Test
    void fullAndNewOnEveryEighthDay() {
        assertEquals(ETIMMoonState.Phase.FULL, ETIMMoonState.phaseForDay(8));
        assertEquals(ETIMMoonState.Phase.NEW, ETIMMoonState.phaseForDay(12));
        assertEquals(ETIMMoonState.Phase.OTHER, ETIMMoonState.phaseForDay(7));
        assertEquals(ETIMMoonState.Phase.OTHER, ETIMMoonState.phaseForDay(13));
    }

    @Test
    void overrideWinsOverArithmetic() {
        ETIMMoonState.setOverride("blood");
        assertEquals(ETIMMoonState.Phase.BLOOD, ETIMMoonState.phaseForDay(8));
        ETIMMoonState.setOverride(" blue ");
        assertEquals(ETIMMoonState.Phase.BLUE, ETIMMoonState.phaseForDay(7));
        ETIMMoonState.setOverride("nonsense");
        assertEquals(ETIMMoonState.Phase.FULL, ETIMMoonState.phaseForDay(8));
    }

    @Test
    void nightRejectDenominators() {
        assertEquals(54, ETIMMoonState.nightRejectDenominator(ETIMMoonState.Phase.BLUE));
        assertEquals(2, ETIMMoonState.nightRejectDenominator(ETIMMoonState.Phase.BLOOD));
        assertEquals(3, ETIMMoonState.nightRejectDenominator(ETIMMoonState.Phase.FULL));
        assertEquals(6, ETIMMoonState.nightRejectDenominator(ETIMMoonState.Phase.NEW));
        assertEquals(4, ETIMMoonState.nightRejectDenominator(ETIMMoonState.Phase.OTHER));
    }

    @Test
    void deepDensityMultipliers() {
        assertEquals(1.5F, ETIMMoonState.deepDensityMultiplier(ETIMMoonState.Phase.BLOOD));
        assertEquals(1.25F, ETIMMoonState.deepDensityMultiplier(ETIMMoonState.Phase.FULL));
        assertEquals(1.0F, ETIMMoonState.deepDensityMultiplier(ETIMMoonState.Phase.BLUE));
        assertEquals(1.0F, ETIMMoonState.deepDensityMultiplier(ETIMMoonState.Phase.OTHER));
    }

    @Test
    void blueMoonAnimalPeriodOnlyOnBlue() {
        assertTrue(ETIMMoonState.blueMoonAnimalPeriod(ETIMMoonState.Phase.BLUE));
        assertFalse(ETIMMoonState.blueMoonAnimalPeriod(ETIMMoonState.Phase.BLOOD));
    }

    @Test
    void nightWindowOnTotalWorldTime() {
        // adjusted = (t%24000 + 6000) % 24000; night iff NOT (5000, 19000)
        assertFalse(ETIMMoonState.isNightAt(0L));      // adjusted 6000 -> day
        assertFalse(ETIMMoonState.isNightAt(5000L));   // adjusted 11000 -> day
        assertTrue(ETIMMoonState.isNightAt(13000L));   // adjusted 19000 -> boundary night
        assertTrue(ETIMMoonState.isNightAt(18000L));   // adjusted 0 -> midnight
        assertTrue(ETIMMoonState.isNightAt(-1000L));   // adjusted 5000 -> boundary night
    }

    @Test
    void lightBypassFlagRoundTrips() {
        ETIMMoonState.setAnimalLightBypass(true);
        assertTrue(ETIMMoonState.animalLightBypass());
        ETIMMoonState.setAnimalLightBypass(false);
        assertFalse(ETIMMoonState.animalLightBypass());
    }
}
