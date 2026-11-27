package io.github.etim.etim.combat;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * B-70UQ: pure faces of the R196 butchering tables
 * (EntityCow.java:91-107, EntityPig.java:113-123, EntitySheep.java:101-117,
 * EntityHorse.java:507-527, EntitySpider.java:201).
 */
class ButcherGatesTest {

    @Test
    void cowLeatherIsOneToThree() {
        assertEquals(1, ButcherGates.cowLeather(0));
        assertEquals(2, ButcherGates.cowLeather(1));
        assertEquals(3, ButcherGates.cowLeather(2));
    }

    @Test
    void cowBeefNeedsWellness() {
        assertEquals(0, ButcherGates.cowBeefBase(false, 2, 3));
        assertEquals(1, ButcherGates.cowBeefBase(true, 0, 0));
        assertEquals(5, ButcherGates.cowBeefBase(true, 2, 2));
    }

    @Test
    void cowNudgeOnlyRollsForASingleCut() {
        assertTrue(ButcherGates.cowNudgeRolls(1));
        assertFalse(ButcherGates.cowNudgeRolls(0));
        assertFalse(ButcherGates.cowNudgeRolls(2));
    }

    @Test
    void cowNudgeCoinTurnsOneIntoTwo() {
        assertEquals(2, ButcherGates.cowBeefAfterNudge(1, 0));
        assertEquals(1, ButcherGates.cowBeefAfterNudge(1, 1));
        assertEquals(3, ButcherGates.cowBeefAfterNudge(3, 0));
    }

    @Test
    void pigPorkHasNoNudge() {
        assertEquals(0, ButcherGates.pigPork(false, 2, 3));
        assertEquals(1, ButcherGates.pigPork(true, 0, 0));
        assertEquals(6, ButcherGates.pigPork(true, 2, 3));
    }

    @Test
    void sheepMuttonNeedsWellness() {
        assertEquals(0, ButcherGates.sheepMutton(false, 1, 3));
    }

    @Test
    void sheepMuttonFloorsAtOne() {
        assertEquals(1, ButcherGates.sheepMutton(true, 0, 0));
        assertEquals(2, ButcherGates.sheepMutton(true, 0, 2));
        assertEquals(1, ButcherGates.sheepMutton(true, 1, 0));
        assertEquals(4, ButcherGates.sheepMutton(true, 1, 3));
    }

    @Test
    void sheepWoolGateExcludesShearedAndBurning() {
        assertTrue(ButcherGates.sheepWoolGate(false, false));
        assertFalse(ButcherGates.sheepWoolGate(true, false));
        assertFalse(ButcherGates.sheepWoolGate(false, true));
    }

    @Test
    void woolAndLeatherLandOnZero() {
        assertTrue(ButcherGates.sheepWoolLanded(0));
        assertFalse(ButcherGates.sheepWoolLanded(1));
        assertTrue(ButcherGates.sheepLeather(0));
        assertFalse(ButcherGates.sheepLeather(1));
    }

    @Test
    void horsePiecesAreOneToThree() {
        assertEquals(1, ButcherGates.horsePieces(0));
        assertEquals(3, ButcherGates.horsePieces(2));
    }

    @Test
    void horseMeatAddsThePlainHorseCoin() {
        assertEquals(1, ButcherGates.horseMeat(false, 0, 0));
        assertEquals(4, ButcherGates.horseMeat(false, 3, 0));
        assertEquals(2, ButcherGates.horseMeat(true, 0, 1));
        assertEquals(3, ButcherGates.horseMeat(true, 2, 0));
    }

    @Test
    void spiderEyeShortCircuitsOnTheFirstCoin() {
        assertTrue(ButcherGates.spiderEyeFirst(0));
        assertFalse(ButcherGates.spiderEyeFirst(1));
        assertFalse(ButcherGates.spiderEyeFirst(2));
        assertFalse(ButcherGates.spiderEyeLevel(0));
        assertTrue(ButcherGates.spiderEyeLevel(3));
    }

    @Test
    void wellnessIsTheMinimumOfThreeMeters() {
        assertTrue(ButcherGates.well(0.25F, 0.25F, 0.25F));
        assertFalse(ButcherGates.well(0.2499F, 1.0F, 1.0F));
        assertFalse(ButcherGates.well(1.0F, 1.0F, 0.1F));
        assertFalse(ButcherGates.well(0.0F, 0.0F, 0.0F));
        assertTrue(ButcherGates.well(1.0F, 0.9F, 0.5F));
    }
}
