package io.github.etim.etim.reach;

import net.minecraft.init.Bootstrap;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.Vec3d;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** R196 ray→box slab math (ETIMReach.getRayBoxEntryDistance), the shared reach metric. */
class ReachMathTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    private static final AxisAlignedBB BOX = new AxisAlignedBB(2.0D, 0.0D, 0.0D, 3.0D, 1.0D, 1.0D);

    private static double entry(double ox, double oy, double oz, double dx, double dy, double dz) {
        return ETIMReach.getRayBoxEntryDistance(new Vec3d(ox, oy, oz), new Vec3d(dx, dy, dz), BOX);
    }

    @Test
    void straightHitReturnsNearFace() {
        assertEquals(2.0D, entry(0.0D, 0.5D, 0.5D, 1.0D, 0.0D, 0.0D), 1.0E-9D);
    }

    @Test
    void obliqueHitEntersOnXFaceFirst() {
        // direction (1,1,0): reaches x=2 at t=2 (y=2 above box) -> the y slab binds
        // first? y range 0..1 with origin 0.5 rising: y=1 at t=0.5 while x=0.5 < 2,
        // so the ray exits the y slab before reaching x: miss.
        assertEquals(Double.MAX_VALUE, entry(0.0D, 0.5D, 0.5D, 1.0D, 1.0D, 0.0D));
        // direction (1,0.25,0): x=2 at t=2, y=1.0 at t=2 -> grazing corner t=2
        assertEquals(2.0D, entry(0.0D, 0.5D, 0.5D, 1.0D, 0.25D, 0.0D), 1.0E-9D);
    }

    @Test
    void parallelRayOutsideSlabMisses() {
        assertEquals(Double.MAX_VALUE, entry(0.0D, 5.0D, 0.5D, 1.0D, 0.0D, 0.0D));
        assertEquals(Double.MAX_VALUE, entry(0.0D, 0.5D, 5.0D, 1.0D, 0.0D, 0.0D));
    }

    @Test
    void originInsideReturnsZero() {
        assertEquals(0.0D, entry(2.5D, 0.5D, 0.5D, 1.0D, 0.0D, 0.0D));
    }

    @Test
    void rayPointingAwayMisses() {
        assertEquals(Double.MAX_VALUE, entry(0.0D, 0.5D, 0.5D, -1.0D, 0.0D, 0.0D));
    }

    @Test
    void boundaryOriginCountsAsInside() {
        // origin exactly on the min face is not "outside" (uses strict <)
        assertEquals(0.0D, entry(2.0D, 0.5D, 0.5D, 1.0D, 0.0D, 0.0D));
    }

    @Test
    void negativeAxisDirectionHitsFarFace() {
        // origin at x=5 looking -x: near face is x=3 -> t=2
        assertEquals(2.0D, entry(5.0D, 0.5D, 0.5D, -1.0D, 0.0D, 0.0D), 1.0E-9D);
    }
}
