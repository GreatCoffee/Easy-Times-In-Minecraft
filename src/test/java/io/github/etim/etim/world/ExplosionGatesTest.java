package io.github.etim.etim.world;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import net.minecraft.init.Bootstrap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70UP: pure-half tests for the R196 explosion chain (ExplosionGates).
 *
 * <p>Every expectation is the R196 formula from Explosion.java:111-112 and
 * Block.java:1984-2093, not a snapshot of current behaviour.</p>
 */
class ExplosionGatesTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    /** Deterministic roll source. */
    private static ExplosionGates.Rolls rolls(final float... values) {
        final int[] index = {0};
        return () -> {
            int i = index[0]++;
            if (i >= values.length) {
                throw new IllegalStateException("roll source exhausted at " + i);
            }
            return values[i];
        };
    }

    // ---- entityDamage (Explosion.java:111) ----

    @Test
    void damageAtCentreIsFull() {
        // size 1 -> effective 4; at distance 0 with full density:
        // 4 * 1 * 4 * 2/3 = 10.6667
        assertEquals(10.6667F, ExplosionGates.entityDamage(1.0F, 0.0D, 1.0D), 0.0002F);
    }

    @Test
    void damageHalvesAtHalfRange() {
        // factor = 1 - 2/4 = 0.5 -> 4 * 0.5 * 4 * 2/3 = 5.3333
        assertEquals(5.3333F, ExplosionGates.entityDamage(1.0F, 2.0D, 1.0D), 0.0002F);
    }

    @Test
    void damageIsZeroBeyondEffectiveRadius() {
        assertEquals(0.0F, ExplosionGates.entityDamage(1.0F, 4.5D, 1.0D), 0.0F);
    }

    @Test
    void damageAtExactRadiusIsZero() {
        // distance == effective: factor is 0, so the 0.5 floor applies.
        assertEquals(0.0F, ExplosionGates.entityDamage(1.0F, 4.0D, 1.0D), 0.0F);
    }

    @Test
    void densityScalesDamage() {
        assertEquals(0.0F, ExplosionGates.entityDamage(1.0F, 2.0D, 0.0D), 0.0F);
        assertEquals(2.6667F, ExplosionGates.entityDamage(1.0F, 2.0D, 0.5D), 0.0002F);
    }

    @Test
    void subHalfDamageFloorsToZero() {
        // 0.4 * 1 * 0.001 * 2.6667 = 0.00107 -> 0
        assertEquals(0.0F, ExplosionGates.entityDamage(0.1F, 0.0D, 0.001D), 0.0F);
    }

    @Test
    void biggerEntityHasBiggerRadius() {
        float small = ExplosionGates.entityDamage(1.5F, 3.0D, 1.0D);
        float big = ExplosionGates.entityDamage(3.0F, 3.0D, 1.0D);
        assertTrue(big > small, "size 3 should out-damage size 1.5 at the same distance");
    }

    @Test
    void damageMonotonicInDistance() {
        float near = ExplosionGates.entityDamage(1.0F, 1.0D, 1.0D);
        float far = ExplosionGates.entityDamage(1.0F, 3.9D, 1.0D);
        assertTrue(near > far);
    }

    // ---- spookUntil / livestockReach (Explosion.java:112) ----

    @Test
    void spookWindowBaseAndRoll() {
        assertEquals(1400L, ExplosionGates.spookUntil(1000L, 0));
        assertEquals(1799L, ExplosionGates.spookUntil(1000L, 399));
    }

    @Test
    void livestockReachNeverNegative() {
        assertEquals(0.0D, ExplosionGates.livestockReach(1.0F), 0.0D);
        assertEquals(0.0D, ExplosionGates.livestockReach(0.5F), 0.0D);
        assertEquals(4.0D, ExplosionGates.livestockReach(2.0F), 0.0D);
        assertEquals(8.0D, ExplosionGates.livestockReach(3.0F), 0.0D);
    }

    // ---- chanceFor (Block.java:1984-1992) ----

    @Test
    void chanceClasses() {
        assertEquals(1.0F, ExplosionGates.chanceFor(ExplosionGates.ChanceClass.NORMAL), 0.0F);
        assertEquals(0.4F, ExplosionGates.chanceFor(ExplosionGates.ChanceClass.FRAGILE), 0.0F);
        assertEquals(0.0F, ExplosionGates.chanceFor(ExplosionGates.ChanceClass.INERT), 0.0F);
    }

    // ---- keep (Block.java:2001-2040) ----

    @Test
    void keepAllOnCertainChance() {
        assertEquals(3, ExplosionGates.keep(3, 1.0F, rolls(0.0F, 0.0F, 0.0F)));
    }

    @Test
    void keepNothingOnZeroChance() {
        assertEquals(0, ExplosionGates.keep(3, 0.0F, rolls()));
    }

    @Test
    void keepPartialMatchesPerUnitRolls() {
        assertEquals(2, ExplosionGates.keep(3, 0.5F, rolls(0.1F, 0.6F, 0.4F)));
    }

    @Test
    void extraRollAboveOneChance() {
        // 2 units at 1.5 -> both kept, extra roll 0.3 < 0.5 -> 3
        assertEquals(3, ExplosionGates.keep(2, 1.5F, rolls(0.9F, 0.9F, 0.3F)));
    }

    @Test
    void extraRollCanMiss() {
        assertEquals(2, ExplosionGates.keep(2, 1.5F, rolls(0.9F, 0.9F, 0.9F)));
    }

    @Test
    void keepCapsAtCountPlusOne() {
        assertEquals(2, ExplosionGates.keep(1, 2.0F, rolls(0.1F, 0.1F)));
    }

    @Test
    void keepZeroCountIsZero() {
        assertEquals(0, ExplosionGates.keep(0, 1.0F, rolls()));
    }

    // ---- experience (Block.java:2042-2057) ----

    @Test
    void experienceScalesWithDrops() {
        assertEquals(15, ExplosionGates.experience(5, 3, false));
    }

    @Test
    void lapisIsExempt() {
        assertEquals(0, ExplosionGates.experience(5, 3, true));
    }

    @Test
    void experienceZeroOnNoDropsOrNoBase() {
        assertEquals(0, ExplosionGates.experience(5, 0, false));
        assertEquals(0, ExplosionGates.experience(0, 4, false));
    }

    // ---- motionSpeed (Block.java:2059-2093) ----

    @Test
    void motionSpeedRange() {
        assertEquals(0.25D, ExplosionGates.motionSpeed(0.0F), 1.0E-9D);
        assertEquals(0.60D, ExplosionGates.motionSpeed(1.0F), 1.0E-9D);
        assertEquals(0.425D, ExplosionGates.motionSpeed(0.5F), 1.0E-9D);
    }
}
