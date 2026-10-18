package io.github.etim.etim.weather;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMMoonState;
import net.minecraft.world.WorldServer;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/**
 * weather-01 — the R196 deterministic weather event clock.
 *
 * <p>Transposes R196's daily weather schedule (World.java:6444-6479
 * {@code generateWeatherEvents}, :6491-6521 {@code mergeWeatherEvents},
 * :6523-6530 wind/storm decoration, WeatherEvent.java) onto 1.12: the
 * schedule is a PURE FUNCTION of (world seed, day) — no NBT, no timers —
 * so it survives world reloads and sleep jumps by construction. Verdict
 * J1=A (weather-verdict.md): mixin 替体 of {@code World.updateWeatherBody}
 * drives the vanilla worldInfo booleans + strengths, keeping every
 * existing consumer ({@code isThundering()} readers, packet sync at
 * WorldServer:1313-1346) untouched.</p>
 *
 * <p>Ported faces:</p>
 * <ul>
 *   <li>per day: up to 3 random rain events at a 1/4 roll each, length
 *       6000..18000, random start (R196 :6458-6470); none on days &lt; 2
 *       (:6450); harvest/blood/blue-moon days excluded by 4-point sampling
 *       (:6460-6467, PURE day derivation — {@code moonStateOverride} does
 *       NOT participate in the exclusion gate, verdict must-add 2);</li>
 *   <li>blood-moon forced thunderstorm (R196 :6472-6476): a single event
 *       covering the whole {@code bloodMoonStormTicks} window with the
 *       storm flag set end-to-end. Trigger face reads
 *       {@link ETIMMoonState#phase} (override-aware, verdict must-add 2)
 *       so the judge window can force it with
 *       {@code moonStateOverride=blood};</li>
 *   <li>merge with 6000-tick padding (storm window carried, :6491-6521),
 *       then randomizeType/addStorm decoration (:6523-6530,
 *       WeatherEvent.java:28-67, seeded per event start);</li>
 *   <li>strength ramp 0.01/tick toward the event target (vanilla body
 *       shape, World.java:2873-2895 = R196 World.java:3369-3405);</li>
 *   <li>{@code _calculateInitialWeather} deferred account (R196
 *       WorldServer.java:599): {@link #snapAfterSleep} snaps strengths
 *       0/1 after the sleep batch (J7 keeps the load face on the stale
 *       worldInfo booleans, World.java:2783-2794).</li>
 * </ul>
 *
 * <p>Verdict deviations (all registered): seed = {@code WorldInfo.getSeed()}
 * instead of R196 {@code getWorldCreationTime()} (J2, B 级 — 1.12 level.dat
 * has no creation time); lightning gate keeps the vanilla boolean face
 * instead of R196's strength thresholds 0.2/0.9 (J6, B 级 — net effect
 * bounded by the ≤100-tick ramp); the wind/type face is stored but not
 * consumed server-side (C 级, client face deferred).</p>
 *
 * <p>Judge channel: {@code [WeatherLog]} lines (weather-schedule /
 * weather-flip / weather-off / weather-resume; lightning-struck is
 * emitted by MixinWorldServer at the addWeatherEffect site).</p>
 */
public final class ETIMWeatherClock {

    private static final long DAY_TICKS = 24000L;
    /** R196 mergeWeatherEvents padding (World.java:6496). */
    private static final int MERGE_PADDING = 6000;
    /** Vanilla lightning rarity constant (WorldServer:423; not keyed — verdict). */
    private static final int VANILLA_LIGHTNING_RARITY = 100000;

    /** One R196 WeatherEvent (WeatherEvent.java) — rain span + inner storm window. */
    private static final class Span {
        long start;
        long end;
        long stormStart;
        long stormEnd;
        /** R196 wind/type face — stored, not consumed server-side (C 级). */
        int type;
        boolean merged;

        boolean hasStorm() {
            return stormStart > 0L;
        }

        boolean occurringAt(long t) {
            return start <= t && t < end;
        }

        boolean stormingAt(long t) {
            return hasStorm() && stormStart <= t && t < stormEnd;
        }
    }

    /** Day cache key of the generated schedule (R196 :6542 day-key invalidation). */
    private long cachedDay = Long.MIN_VALUE;
    private List<Span> spans = Collections.emptyList();

    // off-state latch: weather-off once per transition, weather-resume on re-entry
    private static boolean offLogged = false;

    public ETIMWeatherClock() {
    }

    /**
     * The clock's active gate: config master + Overworld + doWeatherCycle.
     * Everything else is vanilla passthrough (verdict §4.5, J1).
     */
    public static boolean active(WorldServer w) {
        return ETIMConfig.weatherSystem
                && w.provider.getDimension() == 0
                && w.getGameRules().getBoolean("doWeatherCycle");
    }

    /** Logs the vanilla-takeover proof line once per off transition (verdict must-add 4). R-22b: weatherDebugLog 门控. */
    public static void logOffState(String reason) {
        if (ETIMConfig.weatherDebugLog && !offLogged) {
            ETIM.LOGGER.info("[WeatherLog] weather-off reason=" + reason);
            offLogged = true;
        }
    }

    /**
     * Per-tick body (the cancelled vanilla {@code updateWeatherBody}):
     * day-key schedule refresh, boolean sync, strength ramp. Public only
     * because MixinWorldWeather (different package) drives it.
     */
    public void update(WorldServer w) {
        long total = w.getWorldInfo().getWorldTotalTime();
        long day = total / DAY_TICKS + 1L;
        if (day != cachedDay) {
            cachedDay = day;
            spans = buildSchedule(w, total);
            logSchedule(day, total, spans);
        }
        if (offLogged) {
            ETIM.LOGGER.info("[WeatherLog] weather-resume day=" + day + " total=" + total);
            offLogged = false;
        }

        boolean precip = anyPrecipitating(spans, total);
        boolean storm = anyStorming(spans, total);
        boolean raining = w.getWorldInfo().isRaining();
        boolean thundering = w.getWorldInfo().isThundering();
        if (raining != precip || thundering != storm) {
            // boolean sync keeps every worldInfo consumer on the clock's truth
            w.getWorldInfo().setRaining(precip);
            w.getWorldInfo().setThundering(storm);
            if (ETIMConfig.weatherDebugLog) {
                ETIM.LOGGER.info("[WeatherLog] weather-flip t=" + total
                        + " raining=" + precip + " thundering=" + storm + " reason=event");
            }
        }

        // strength ramp — vanilla body shape (World.java:2873-2895)
        w.prevThunderingStrength = w.thunderingStrength;
        w.thunderingStrength = clamp(w.thunderingStrength + (storm ? 0.01F : -0.01F));
        w.prevRainingStrength = w.rainingStrength;
        w.rainingStrength = clamp(w.rainingStrength + (precip ? 0.01F : -0.01F));
    }

    /**
     * R196 {@code _calculateInitialWeather} (World.java:3356-3367) at the
     * sleep exit (WorldServer.java:599): strengths snap 0/1 to the event
     * target, no ramp. Called from {@code ETIMSleepClock.runSleepTicks}.
     */
    public static void snapAfterSleep(WorldServer w) {
        if (!active(w)) {
            return;
        }
        long total = w.getWorldInfo().getWorldTotalTime();
        List<Span> schedule = buildSchedule(w, total);
        boolean precip = anyPrecipitating(schedule, total);
        boolean storm = anyStorming(schedule, total);
        w.getWorldInfo().setRaining(precip);
        w.getWorldInfo().setThundering(storm);
        w.rainingStrength = precip ? 1.0F : 0.0F;
        w.thunderingStrength = precip && storm ? 1.0F : 0.0F;
        if (ETIMConfig.weatherDebugLog) {
            ETIM.LOGGER.info("[WeatherLog] weather-flip t=" + total
                    + " raining=" + precip + " thundering=" + storm + " reason=snap");
        }
    }

    /**
     * Lightning rarity at the strike attempt (R196 WorldServer.java:988,
     * blood 20000 / normal 100000). The blood face reads
     * {@link ETIMMoonState#phase} (override-aware, verdict must-add 2).
     * Vanilla passthrough whenever the clock is not active.
     */
    public static int lightningRarity(WorldServer w) {
        if (!active(w)) {
            return VANILLA_LIGHTNING_RARITY;
        }
        return ETIMMoonState.phase(w) == ETIMMoonState.Phase.BLOOD
                ? ETIMConfig.lightningRarityBlood
                : VANILLA_LIGHTNING_RARITY;
    }

    // ------------------------------------------------------------- schedule

    /**
     * R196 getWeatherEventsForToday (World.java:6544): generate
     * (day-1, day), merge, then decorate — the (day-1) half lets
     * yesterday's tail spill over (merge padding).
     */
    private static List<Span> buildSchedule(WorldServer w, long total) {
        long day = total / DAY_TICKS + 1L;
        List<Span> events = new ArrayList<Span>();
        generateDay(w, day - 1L, events);
        generateDay(w, day, events);
        mergeSpans(events);
        for (Span e : events) {
            randomizeType(e);
            addStorm(e);
        }
        return events;
    }

    /** R196 generateWeatherEvents(int day) (World.java:6444-6479). */
    private static void generateDay(WorldServer w, long day, List<Span> events) {
        if (day < 2L) {
            return; // R196 :6450 — no rain on the first two days
        }
        long firstTick = (day - 1L) * DAY_TICKS - 6000L;
        // J2: R196 seeds getWorldCreationTime() + dim*938473 + day; 1.12
        // level.dat has no creation time — WorldInfo.getSeed() substitutes.
        Random random = new Random(
                w.getWorldInfo().getSeed() + w.provider.getDimension() * 938473L + day);
        random.nextInt(); // R196 :6456 warm-up

        for (int i = 0; i < 3 && random.nextInt(4) <= 0; i++) { // R196 :6458
            Span e = new Span();
            e.start = firstTick + random.nextInt(24000);
            e.end = e.start + random.nextInt(12000) + 6000;
            if (!excludedFromRandomEvents(e)) {
                events.add(e);
            }
        }

        // R196 :6472-6476 blood-moon forced thunderstorm. Trigger face =
        // ETIMMoonState.phase (override-aware); the exclusion gate above
        // stays PURE (verdict must-add 2: the override must not be able to
        // pollute the exclusion logic itself).
        if (ETIMConfig.bloodMoonStorm && ETIMMoonState.phase(w) == ETIMMoonState.Phase.BLOOD) {
            Span e = new Span();
            e.start = firstTick + 6000L; // = the day block start (06:00)
            e.end = e.start + ETIMConfig.bloodMoonStormTicks;
            e.stormStart = e.start;
            e.stormEnd = e.end;
            e.type = 3;
            events.add(e);
        }
    }

    /** R196 :6460-6467 four-point harvest/blood/blue exclusion (PURE derivation). */
    private static boolean excludedFromRandomEvents(Span e) {
        return isHarvestTick(e.start) || isHarvestTick(e.end)
                || isHarvestTick(e.start + 6000L) || isHarvestTick(e.end - 6000L)
                || isBloodTick(e.start) || isBloodTick(e.end)
                || isBlueTick(e.start) || isBlueTick(e.end);
    }

    /** R196 isBloodMoon(t, false) (World.java:2371-2375, static form). */
    private static boolean isBloodTick(long t) {
        return (t / DAY_TICKS + 1L) % 32L == 0L;
    }

    /** R196 isBlueMoon(t, false) (World.java:2387-2388). */
    private static boolean isBlueTick(long t) {
        return (t / DAY_TICKS + 1L) % 128L == 0L;
    }

    /** R196 isHarvestMoon(t, false) (World.java:2399-2400): the blood moon 8 days out. */
    private static boolean isHarvestTick(long t) {
        return isBloodTick(t + 192000L);
    }

    /** R196 mergeWeatherEvents (World.java:6491-6521): 6000 padding, storm carried. */
    private static void mergeSpans(List<Span> events) {
        for (Span a : events) {
            if (a.merged) {
                continue;
            }
            for (Span b : events) {
                if (b == a || b.merged) {
                    continue;
                }
                if (a.end + MERGE_PADDING >= b.start && a.start <= b.end + MERGE_PADDING) {
                    a.start = Math.min(a.start, b.start);
                    a.end = Math.max(a.end, b.end);
                    if (b.hasStorm() && !a.hasStorm()) {
                        a.stormStart = b.stormStart;
                        a.stormEnd = b.stormEnd;
                        a.type = 3; // WeatherEvent.setStorm side effect
                    }
                    b.merged = true;
                }
            }
        }
        List<Span> kept = new ArrayList<Span>();
        for (Span e : events) {
            if (!e.merged) {
                kept.add(e);
            }
        }
        kept.sort(new Comparator<Span>() {
            @Override
            public int compare(Span a, Span b) {
                return Long.compare(a.start, b.start);
            }
        });
        events.clear();
        events.addAll(kept);
    }

    /** R196 WeatherEvent.randomizeType (WeatherEvent.java:28-36), own seeded Random. */
    private static void randomizeType(Span e) {
        if (e.hasStorm()) {
            e.type = 3;
            return;
        }
        Random random = new Random(e.start);
        random.nextInt();
        e.type = random.nextInt(3);
    }

    /** R196 WeatherEvent.addStorm (WeatherEvent.java:47-67), own seeded Random. */
    private static void addStorm(Span e) {
        if (e.hasStorm()) {
            return;
        }
        Random random = new Random(e.start);
        random.nextInt();
        if (random.nextInt(4) <= 0) {
            int stormLength = Math.min(random.nextInt(4000) + 2000, (int) (e.end - e.start));
            if (random.nextInt(4) == 0) {
                e.stormStart = random.nextBoolean() ? e.start : e.end - stormLength;
            } else {
                e.stormStart = random.nextInt((int) (e.end - e.start) - stormLength + 1) + e.start;
            }
            e.stormEnd = e.stormStart + stormLength;
            e.type = 3;
        }
    }

    private static boolean anyPrecipitating(List<Span> events, long t) {
        for (Span e : events) {
            if (e.occurringAt(t)) {
                return true;
            }
        }
        return false;
    }

    private static boolean anyStorming(List<Span> events, long t) {
        for (Span e : events) {
            if (e.stormingAt(t)) {
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------- judge log

    private static void logSchedule(long day, long total, List<Span> events) {
        if (!ETIMConfig.weatherDebugLog) { // R-22b
            return;
        }
        StringBuilder sb = new StringBuilder("[WeatherLog] weather-schedule day=").append(day)
                .append(" total=").append(total)
                .append(" events=").append(events.size())
                .append(" [");
        for (int i = 0; i < events.size(); i++) {
            Span e = events.get(i);
            if (i > 0) {
                sb.append(", ");
            }
            sb.append('(').append(e.start).append("..").append(e.end);
            if (e.hasStorm()) {
                sb.append(" storm=").append(e.stormStart).append("..").append(e.stormEnd);
            }
            sb.append(" type=").append(e.type).append(')');
        }
        sb.append(']');
        ETIM.LOGGER.info(sb.toString());
    }

    private static float clamp(float value) {
        if (value < 0.0F) {
            return 0.0F;
        }
        return value > 1.0F ? 1.0F : value;
    }
}
