package io.github.etim.etim.mob;

import io.github.etim.etim.ETIMConfig;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * B-70VO: R196 牲畜年龄曲线（EntityAgeable :49-51 / :57-59）的纯算术。
 */
class LivestockAgeTest {

    private boolean saved;

    @BeforeEach
    void save() {
        saved = ETIMConfig.livestockNeedsR196;
        ETIMConfig.livestockNeedsR196 = true;
    }

    @AfterEach
    void restore() {
        ETIMConfig.livestockNeedsR196 = saved;
    }

    @Test
    void newbornAgeLocksWhenNegative() {
        assertEquals(-64000, ETIMLivestockEvents.r196NewbornAge(-1));
        assertEquals(-64000, ETIMLivestockEvents.r196NewbornAge(-24000));
    }

    @Test
    void newbornAgeLeavesAdultsAlone() {
        assertEquals(0, ETIMLivestockEvents.r196NewbornAge(0));
        assertEquals(6000, ETIMLivestockEvents.r196NewbornAge(6000));
    }

    @Test
    void breedCooldownStretchesSixThousandToSixteenThousand() {
        assertEquals(16000, ETIMLivestockEvents.r196BreedCooldown(6000));
    }

    @Test
    void breedCooldownLocksNewborns() {
        assertEquals(-64000, ETIMLivestockEvents.r196BreedCooldown(-1));
        assertEquals(-64000, ETIMLivestockEvents.r196BreedCooldown(-500));
    }

    @Test
    void breedCooldownPassesOtherValues() {
        assertEquals(0, ETIMLivestockEvents.r196BreedCooldown(0));
        assertEquals(5999, ETIMLivestockEvents.r196BreedCooldown(5999));
        assertEquals(6001, ETIMLivestockEvents.r196BreedCooldown(6001));
    }

    @Test
    void switchOffKeepsVanillaAges() {
        ETIMConfig.livestockNeedsR196 = false;
        assertEquals(-1, ETIMLivestockEvents.r196NewbornAge(-1));
        assertEquals(6000, ETIMLivestockEvents.r196BreedCooldown(6000));
        assertEquals(0, ETIMLivestockEvents.r196BreedCooldown(0));
    }
}
