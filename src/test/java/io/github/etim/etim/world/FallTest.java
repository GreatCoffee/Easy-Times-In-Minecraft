package io.github.etim.etim.world;

import net.minecraft.init.Bootstrap;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * B-70TJ: R196 fall formula (census F :85, {@code EntityLivingBase.java:1010-1109})
 * as pure arithmetic — no server, no entity effects.
 */
class FallTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    private static void eq(float expected, float actual) {
        assertEquals(expected, actual, 1.0E-4F);
    }

    @Test
    void safeHeightIsTwoAndAHalfBlocks() {
        eq(0.0F, ETIMFall.rawDamage(2.5F, 0));
        eq(-0.2F, ETIMFall.rawDamage(2.4F, 0));
        eq(0.2F, ETIMFall.rawDamage(2.6F, 0));
    }

    @Test
    void rawDamageIsDoubled() {
        // (10 - 2.5) * 2 = 15, vanilla would be 7.
        eq(15.0F, ETIMFall.rawDamage(10.0F, 0));
        eq(3.0F, ETIMFall.rawDamage(4.0F, 0));
        eq(35.0F, ETIMFall.rawDamage(20.0F, 0));
    }

    @Test
    void jumpBonusSubtractsBeforeDoubling() {
        // Jump Boost I (amplifier 0) => bonus 1: (10 - 2.5 - 1) * 2 = 13.
        eq(13.0F, ETIMFall.rawDamage(10.0F, 1));
        // Jump Boost II (amplifier 1) => bonus 2: 11.
        eq(11.0F, ETIMFall.rawDamage(10.0F, 2));
    }

    @Test
    void rawBelowOneIsIgnored() {
        eq(0.0F, ETIMFall.afterCushioning(0.5F, 0.0F));
        eq(0.0F, ETIMFall.afterCushioning(0.999F, 0.2F));
    }

    @Test
    void cushioningSubtractsTenThenScales() {
        // raw 15, c 0.2 => (15 - 2) * 0.8 = 10.4.
        eq(10.4F, ETIMFall.afterCushioning(15.0F, 0.2F));
        // raw 15, c 0.5 => (15 - 5) * 0.5 = 5.
        eq(5.0F, ETIMFall.afterCushioning(15.0F, 0.5F));
        // raw 15, c 0.8 => (15 - 8) * 0.2 = 1.4.
        eq(1.4F, ETIMFall.afterCushioning(15.0F, 0.8F));
    }

    @Test
    void fullCushioningRemovesAllDamage() {
        eq(0.0F, ETIMFall.afterCushioning(15.0F, 1.0F));
        eq(0.0F, ETIMFall.afterCushioning(100.0F, 1.0F));
    }

    @Test
    void negativeResultClampsToZero() {
        // raw 6, c 0.9 => (6 - 9) * 0.1 = -0.3 -> 0.
        eq(0.0F, ETIMFall.afterCushioning(6.0F, 0.9F));
    }
}
