package io.github.etim.etim.mob;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * B-70UQ: pure faces of the R196 despawn chain
 * (EntityAnimal.java:237-255, EntityLiving.java:740-778, EntityMob.java:259-269).
 */
class DespawnGatesTest {

    private static final int QUIET = 800;
    private static final int KILL = 2400;

    @Test
    void counterBelowQuietIsSilent() {
        assertEquals(DespawnGates.Wall.QUIET, DespawnGates.animalWall(799, false, false, QUIET, KILL));
        assertEquals(DespawnGates.Wall.QUIET, DespawnGates.animalWall(0, true, true, QUIET, KILL));
    }

    @Test
    void playerAndFenceResetTheCounter() {
        assertEquals(DespawnGates.Wall.PLAYER, DespawnGates.animalWall(900, true, false, QUIET, KILL));
        assertEquals(DespawnGates.Wall.FENCE, DespawnGates.animalWall(900, false, true, QUIET, KILL));
    }

    @Test
    void playerWinsOverFenceWhenBothAreNear() {
        assertEquals(DespawnGates.Wall.PLAYER, DespawnGates.animalWall(900, true, true, QUIET, KILL));
    }

    @Test
    void killWallSpansQuietExclusiveToKillInclusive() {
        assertEquals(DespawnGates.Wall.KILL, DespawnGates.animalWall(800, false, false, QUIET, KILL));
        assertEquals(DespawnGates.Wall.KILL, DespawnGates.animalWall(2400, false, false, QUIET, KILL));
    }

    @Test
    void pastTheKillWallTheAnimalWalksTheSharedChain() {
        assertEquals(DespawnGates.Wall.CHAIN, DespawnGates.animalWall(2401, false, false, QUIET, KILL));
        assertEquals(DespawnGates.Wall.CHAIN, DespawnGates.animalWall(99999, false, false, QUIET, KILL));
    }

    @Test
    void verticalDistanceDoublesOutsideTheGraceHour() {
        assertEquals(73.0D, DespawnGates.distanceSq(3.0D, 4.0D, 0.0D, false), 1.0E-9D);
        assertEquals(25.0D, DespawnGates.distanceSq(3.0D, 4.0D, 0.0D, true), 1.0E-9D);
    }

    @Test
    void horizontalDistanceIsUnaffected() {
        assertEquals(50.0D, DespawnGates.distanceSq(5.0D, 0.0D, 5.0D, false), 1.0E-9D);
    }

    @Test
    void killNeedsStrictlyBeyondTheRadius() {
        assertTrue(DespawnGates.beyondKill(256.0001D, 256.0D));
        assertFalse(DespawnGates.beyondKill(256.0D, 256.0D));
        assertFalse(DespawnGates.beyondKill(255.9D, 256.0D));
    }

    @Test
    void anEquippedMobHoldsBeyondTheRadius() {
        assertTrue(DespawnGates.equippedHold(300.0D, true, 256.0D));
        assertFalse(DespawnGates.equippedHold(300.0D, false, 256.0D));
        assertFalse(DespawnGates.equippedHold(200.0D, true, 256.0D));
    }

    @Test
    void rerollSpansHalfTheRangeAroundZero() {
        assertEquals(-50, DespawnGates.reroll(0.0D, 100));
        assertEquals(0, DespawnGates.reroll(0.5D, 100));
        assertEquals(49, DespawnGates.reroll(0.99D, 100));
        assertEquals(0, DespawnGates.reroll(0.0D, 1));
    }
}
