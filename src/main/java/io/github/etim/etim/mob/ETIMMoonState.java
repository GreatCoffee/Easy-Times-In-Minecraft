package io.github.etim.etim.mob;

import net.minecraft.world.WorldServer;
import net.minecraft.world.WorldProvider;

/**
 * Moon-overlay state consumed by the spawn cycle. R196's spawning rules read
 * four moon states (blue / blood / full / new) at three consumption points:
 * the night-outdoor spawn rejection rates (audit 11 §4.2, EntityMob:274-282),
 * the deep-chunk density multipliers (audit 14 §4.2 :134-137 band) and the
 * animal %-400 spawning gate (audit 14 §4.5 blue-moon animal period).
 *
 * <p>In R196 the blue blood moons are world-state produced by the moon
 * machinery (stage-6 slice). This interface inverts that dependency: the
 * spawn cycle consumes a phase here, and stage 6 replaces the backend without
 * touching the spawn structure. Until then the phase derives from the vanilla
 * 8-phase clock (0 = full, 4 = new), optionally forced by
 * {@code moonStateOverride} in the config (test determinism).</p>
 */
public final class ETIMMoonState {

    public enum Phase { BLUE, BLOOD, FULL, NEW, OTHER }

    private static final int BLUE = 1;
    private static final int BLOOD = 2;

    /** Config override value: "", "blue", "blood", "full" or "new". */
    private static String override = "";

    public static void setOverride(String value) {
        override = value == null ? "" : value.trim().toLowerCase();
    }

    public static Phase phase(WorldServer w) {
        switch (override) {
            case "blue": return Phase.BLUE;
            case "blood": return Phase.BLOOD;
            case "full": return Phase.FULL;
            case "new": return Phase.NEW;
            default: break;
        }
        // Blue/blood moons are stage-6 machinery; until it lands the clock
        // phase is the only source of full/new, and blue/blood cannot occur.
        int vanillaPhase = w.provider.getMoonPhase(w.getWorldTime());
        if (vanillaPhase == 0) {
            return Phase.FULL;
        }
        if (vanillaPhase == 4) {
            return Phase.NEW;
        }
        return Phase.OTHER;
    }

    /** Night-outdoor spawn rejection denominator (audit 11 §4.2 :274-282). */
    public static int nightRejectDenominator(Phase p) {
        switch (p) {
            case BLUE: return 54;
            case BLOOD: return 2;
            case FULL: return 3;
            case NEW: return 6;
            default: return 4;
        }
    }

    /** Deep-chunk density multiplier for the per-hostile-pass chunk cap. */
    public static float deepDensityMultiplier(Phase p) {
        if (p == Phase.BLOOD) {
            return 3.0F / 2.0F;
        }
        if (p == Phase.FULL) {
            return 5.0F / 4.0F;
        }
        return 1.0F;
    }

    /** Animals spawn in a %-400 window only during a blue moon (audit 14 §4.5). */
    public static boolean blueMoonAnimalPeriod(Phase p) {
        return p == Phase.BLUE;
    }

    /** R196 fix gate (audit 14 §4.1 :1499-1512): reduced/no-spawn mods are
     *  restored when a blood moon or thunderstorm is running. */
    public static boolean rescueGate(WorldServer w, boolean thundering) {
        return phase(w) == Phase.BLOOD || thundering;
    }

    private ETIMMoonState() {
    }
}
