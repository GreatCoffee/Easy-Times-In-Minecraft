package io.github.etim.etim.farm;

import net.minecraft.init.Blocks;
import net.minecraft.init.Bootstrap;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70TJ: two B-68 predicates that only a 90-second server window used to
 * cover — the blight seat family (A-B68 fix) and the mature-crop yield.
 */
class BlightSeatTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void anyCropIsABlightSeat() {
        assertTrue(ETIMBlight.isBlightSeat(Blocks.WHEAT));
        assertTrue(ETIMBlight.isBlightSeat(Blocks.CARROTS));
        assertTrue(ETIMBlight.isBlightSeat(Blocks.POTATOES));
        assertTrue(ETIMBlight.isBlightSeat(Blocks.BEETROOTS));
    }

    @Test
    void deadCarriersOptOut() {
        ETIMBlockDeadPlant dead = new ETIMBlockDeadPlant("dead_selftest", false);
        assertFalse(ETIMBlight.isBlightSeat(dead));
    }

    @Test
    void nonCropsAreNotSeats() {
        assertFalse(ETIMBlight.isBlightSeat(Blocks.STONE));
        assertFalse(ETIMBlight.isBlightSeat(Blocks.TALLGRASS));
        assertFalse(ETIMBlight.isBlightSeat(Blocks.REEDS));
    }

    @Test
    void baseFamilyYieldsOne() {
        Random rand = new Random(1L);
        for (int i = 0; i < 50; i++) {
            assertEquals(1, ETIMFarm.matureYield(Blocks.WHEAT, rand));
            assertEquals(1, ETIMFarm.matureYield(Blocks.BEETROOTS, rand));
        }
    }

    @Test
    void rootCropsYieldTwoOrThree() {
        Random rand = new Random(2L);
        for (int i = 0; i < 200; i++) {
            int carrot = ETIMFarm.matureYield(Blocks.CARROTS, rand);
            int potato = ETIMFarm.matureYield(Blocks.POTATOES, rand);
            assertTrue(carrot == 2 || carrot == 3, "carrot yield " + carrot);
            assertTrue(potato == 2 || potato == 3, "potato yield " + potato);
        }
    }

    @Test
    void rootCropsHitThreeAboutAQuarterOfTheTime() {
        Random rand = new Random(3L);
        int threes = 0;
        int draws = 2000;
        for (int i = 0; i < draws; i++) {
            if (ETIMFarm.matureYield(Blocks.CARROTS, rand) == 3) {
                threes++;
            }
        }
        double rate = threes / (double) draws;
        assertTrue(rate > 0.21 && rate < 0.29, "rate " + rate);
    }
}
