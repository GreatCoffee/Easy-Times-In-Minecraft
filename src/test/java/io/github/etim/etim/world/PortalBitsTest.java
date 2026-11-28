package io.github.etim.etim.world;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * B-70VP: 传送门 metadata 的「符门位 + 目的地位」映射（R196 BlockPortal :279-281 / :387-402）。
 */
class PortalBitsTest {

    @Test
    void runegateBitIsEight() {
        assertEquals(8, ETIMBlockPortal.IS_RUNEGATE);
        assertFalse(ETIMBlockPortal.isRunegate(0));
        assertFalse(ETIMBlockPortal.isRunegate(2));
        assertTrue(ETIMBlockPortal.isRunegate(8));
        assertTrue(ETIMBlockPortal.isRunegate(9));
        assertTrue(ETIMBlockPortal.isRunegate(10));
    }

    @Test
    void destinationStripsRunegateBit() {
        assertEquals(0, ETIMBlockPortal.getDestinationBit(0));
        assertEquals(0, ETIMBlockPortal.getDestinationBit(8));
        assertEquals(1, ETIMBlockPortal.getDestinationBit(9));
        assertEquals(2, ETIMBlockPortal.getDestinationBit(10));
    }

    @Test
    void dimensionZeroMapsToOverworld() {
        assertEquals(ETIMBlockPortal.DESTINATION_OVERWORLD, ETIMBlockPortal.getDestinationBitForDimensionId(0));
    }

    @Test
    void underworldDimensionMapsToBitOne() {
        assertEquals(1, ETIMBlockPortal.getDestinationBitForDimensionId(ETIMDimensions.UNDERWORLD));
    }

    @Test
    void netherMapsToBitTwo() {
        assertEquals(2, ETIMBlockPortal.getDestinationBitForDimensionId(-1));
    }

    @Test
    void unknownDimensionFallsBackToOverworld() {
        assertEquals(0, ETIMBlockPortal.getDestinationBitForDimensionId(7));
        assertEquals(0, ETIMBlockPortal.getDestinationBitForDimensionId(-42));
    }

    @Test
    void destinationPropertyCoversAllBits() {
        assertEquals("destination", ETIMBlockPortal.DESTINATION.getName());
        assertEquals(ETIMBlockPortal.DESTINATION_NETHER, ETIMBlockPortal.DESTINATION.getAllowedValues().stream()
            .mapToInt(Integer::intValue).max().orElse(-1));
        assertEquals(ETIMBlockPortal.DESTINATION_OVERWORLD, ETIMBlockPortal.DESTINATION.getAllowedValues().stream()
            .mapToInt(Integer::intValue).min().orElse(-1));
    }
}
