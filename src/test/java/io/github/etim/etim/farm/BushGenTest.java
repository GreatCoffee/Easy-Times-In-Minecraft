package io.github.etim.etim.farm;

import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-71: R196 {@code BiomeDecorator.java:252-261} patch count — tenths 2 means
 * "nothing, or one patch on the 2-in-10 roll".
 */
public class BushGenTest {

    @Test
    void aChunkGetsNothingOrOnePatch() {
        Random rand = new Random(12345L);
        for (int i = 0; i < 2000; i++) {
            int patches = ETIMBushGen.patchesFor(rand);
            assertTrue(patches == 0 || patches == 1, "patches=" + patches);
        }
    }

    @Test
    void aboutOneChunkInFiveGetsAPatch() {
        Random rand = new Random(20261128L);
        int ones = 0;
        for (int i = 0; i < 5000; i++) {
            ones += ETIMBushGen.patchesFor(rand);
        }
        assertEquals(0.2D, (double) ones / 5000.0D, 0.02D);
    }

    @Test
    void twoTenthsMeansOneInTenLoopsOnly() {
        Random rand = new Random(7L);
        int ones = 0;
        for (int i = 0; i < 1000; i++) {
            ones += ETIMBushGen.patchesFor(rand);
            assertTrue(ones <= i + 1);
        }
        assertTrue(ones > 0);
    }
}
