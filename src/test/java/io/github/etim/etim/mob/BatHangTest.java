package io.github.etim.etim.mob;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VS: the R196 bat hang geometry (EntityBat:153-193) — ceiling snapshot,
 * pinned Y and release Y, extracted from {@link ETIMBatHanging}.
 */
public class BatHangTest {

    @BeforeAll
    static void boot() {
        net.minecraft.init.Bootstrap.register();
    }

    @Test
    void ceilingSnapshotAddsTwelveHundredthsAndHeight() {
        assertEquals(65, ETIMBatHanging.hangingY(64.0D, 0.9F));
        assertEquals(64, ETIMBatHanging.hangingY(64.0D, 0.0F));
        assertEquals(64, ETIMBatHanging.hangingY(63.88D, 0.0F));
    }

    @Test
    void ceilingSnapshotFloorsInsteadOfRounding() {
        assertEquals(64, ETIMBatHanging.hangingY(63.999D, 0.0F));
        assertEquals(65, ETIMBatHanging.hangingY(64.881D, 0.0F));
    }

    @Test
    void pinnedYHangsBatsJustUnderTheBlock() {
        assertEquals(64.09375D, ETIMBatHanging.pinnedY(65, 0.9F), 1.0E-6D);
        assertEquals(64.99375D, ETIMBatHanging.pinnedY(65, 0.0F), 1.0E-6D);
    }

    @Test
    void unhangYDropsSlightlyLowerThanPinned() {
        assertEquals(64.09D, ETIMBatHanging.unhangY(65, 0.9F), 1.0E-6D);
        assertTrue(ETIMBatHanging.unhangY(65, 0.9F) < ETIMBatHanging.pinnedY(65, 0.9F));
    }

    @Test
    void offsetsAndTakeoffEventAreR196Constants() {
        assertEquals(0.00625D, ETIMBatHanging.HANG_OFFSET, 1.0E-12D);
        assertEquals(0.01D, ETIMBatHanging.UNHANG_OFFSET, 1.0E-12D);
        assertEquals(1015, ETIMBatHanging.TAKEOFF_EVENT);
    }
}
