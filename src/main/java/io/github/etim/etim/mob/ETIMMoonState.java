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
 * <p>R196 has no moon machinery to speak of: blue/blood state is pure
 * derivation from {@code totalWorldTime} (stage-6 decompile verdict,
 * {@code decompile/moon/00-核讫表.md} — single write point {@code
 * updateMoonFlags}, no NBT, no toggle loop). This class carries the same
 * derivation inverted for consumption: the spawn cycle reads a phase here,
 * and {@code moonStateOverride} in the config forces one for test
 * determinism.</p>
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

    /**
     * ❗F-14-26/R2 — the phase derivation on an EXPLICIT day number (R196
     * {@code isBloodMoon(first_tick_of_day + 6000L, false)} at World.java:6472:
     * the forced-storm gate reads the GENERATED day's own bloodness, not the
     * current-day phase). Blue outranks blood (the blood test carries
     * {@code !isBlueMoon} and %128 ⊂ %32 — World.java:2374). The override
     * stays a passthrough here so the schedule's trigger face keeps its
     * test-determinism channel (verdict must-add 2 untouched: the EXCLUSION
     * gate reads the static tick forms, no override).
     */
    public static Phase phaseForDay(long day) {
        switch (override) {
            case "blue": return Phase.BLUE;
            case "blood": return Phase.BLOOD;
            case "full": return Phase.FULL;
            case "new": return Phase.NEW;
            default: break;
        }
        if (day % 128L == 0L) {
            return Phase.BLUE;
        }
        if (day % 32L == 0L) {
            return Phase.BLOOD;
        }
        if (day % 8L == 0L) {
            return Phase.FULL;
        }
        if (day % 8L == 4L) {
            return Phase.NEW;
        }
        return Phase.OTHER;
    }

    public static Phase phase(WorldServer w) {
        if (w.provider.getDimension() != 0) {
            return Phase.OTHER;
        }
        // R196 pure derivation (World.java:2374/:2388 static; :2378/:2392 for
        // the instance auto-false in non-Overworld). day numbering follows
        // R196: day = totalWorldTime / 24000 + 1. FULL/NEW are numerically
        // identical to the provider clock (day%8==0 ⇔ phase 0, day%8==4 ⇔
        // phase 4); world rendering/brightness keep reading the provider
        // body, do NOT rewire it here. NOTE: the UNADJUSTED day is correct
        // for the phase static form (R2 note ① — the :2374/:2388 formulas
        // take the raw tick); the +6000 offset belongs ONLY to the weather
        // clock's day-key face.
        return phaseForDay(w.getTotalWorldTime() / 24000L + 1L);
    }

    /**
     * R196 night window on the TOTALWORLDTIME clock (World.updateMoonFlags
     * builds the 12 cached flags with the static isDaytime(total_world_time);
     * adjusted = {@code (t%24000 + 6000) % 24000}, night iff not
     * {@code 5000 < adjusted < 19000}; {@code decompile/moon/C17}). This
     * clock does NOT respond to /time set or vanilla sleep jumps — the
     * sole consumer is the A8 blue-lit-eye gate, which R196 serves from the
     * cached isBlueMoonNight flag. WorldInfo-clock consumers (the A7/denom
     * day-night branch, the animal season night and %400 gates) deliberately
     * read {@code WorldServer.isDaytime()/getWorldTime()} instead, matching
     * R196's instance isDaytime/getTimeOfDay faces.
     */
    public static boolean isNight(WorldServer w) {
        long adjusted = (w.getTotalWorldTime() % 24000L + 6000L) % 24000L;
        return !(adjusted > 5000L && adjusted < 19000L);
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

    /**
     * Deep-chunk density floor bump (R196 setEligibleChunks :32-43): blood
     * ×3/2, full ×5/4 (else-if, blood outranks); the night gate
     * {@code !isDaytime()} lives at the consumption site. Applied to the
     * per-player minimum density limit, NOT to a spawn rate — consumed by
     * the hostile per-player density gate in
     * {@code ETIMSpawnCycle.collectEligibleChunks} (stage-02 slice).
     */
    public static float deepDensityMultiplier(Phase p) {
        if (p == Phase.BLOOD) {
            return 3.0F / 2.0F;
        }
        if (p == Phase.FULL) {
            return 5.0F / 4.0F;
        }
        return 1.0F;
    }

    /**
     * Blue-moon animal season (R196 SpawnerAnimals:424-426 → :471). The
     * period is phase-only here; the night gate ({@link #isNight}) and the
     * %-400 tick gate live at the consumption site, matching R196's split
     * (isBlueMoon(true) is night-restricted, %400 is applied by the caller).
     * The only caller is {@code runPeaceful}-invoking season branch; the
     * tournament-side double-cost check (:316-319) is out of scope at its
     * own slice. Blood-moon weather stacking (forced 13000-tick thunderstorm
     * + lightning rarity ×5, generateWeatherEvents :6444-6476) belongs to
     * the weather slice.
     */
    public static boolean blueMoonAnimalPeriod(Phase p) {
        return p == Phase.BLUE;
    }

    /** R196 fix gate (audit 14 §4.1 :1499-1512): reduced/no-spawn mods are
     *  restored when a blood moon or thunderstorm is running. */
    public static boolean rescueGate(WorldServer w, boolean thundering) {
        return phase(w) == Phase.BLOOD || thundering;
    }

    /** Blue-moon animal light-bypass arm (audit 18 verdict §2.2): armed only
     *  around the CREATURE∧blue-season getCanSpawnHere() call in the spawn
     *  cycle; the EntityAnimal light-gate redirect returns 16 (>8 passes)
     *  while armed, the grass gate and the EntityLiving chain are untouched
     *  (R196 perform_light_check=false semantics). */
    private static boolean animalLightBypass = false;

    public static void setAnimalLightBypass(boolean armed) {
        animalLightBypass = armed;
    }

    public static boolean animalLightBypass() {
        return animalLightBypass;
    }

    private ETIMMoonState() {
    }
}
