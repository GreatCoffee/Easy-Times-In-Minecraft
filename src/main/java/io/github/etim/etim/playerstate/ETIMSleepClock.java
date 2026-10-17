package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMFoodStats;
import io.github.etim.etim.mob.ETIMMoonState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.world.WorldServer;

/**
 * sleep-01 — the R196 sleep-night clock (sleep-clock slice).
 *
 * <p>Transposes R196 {@code runSleepTicks} (WorldServer.java:533-601):
 * instead of vanilla's "everyone asleep →表钟 jump + 弹床" the night runs as
 * a per-tick batch inside one server tick — food stats live their real pace
 * (via the already-patched {@code FoodStats.onUpdate} mixified body), the
 * shipped hunger bed gate ({@code ETIMFoodStats.tickBedGate}, config
 * respecting) ejects starved sleepers, and the exit advances BOTH clocks
 * with the S3 absolute alignment {@code dayTime := totalTime % 24000}
 * (verdict §1; R196's day clock is exactly that derivative — WorldInfo.java
 * :74-76 {@code getWorldTimeOfDay(dim) = getWorldTotalTime(dim) % 24000},
 * verdict must-add 2), so the W2d double-clock desync (a763b14) is cured by
 * construction and only the /time set command face can split the clocks
 * again.</p>
 *
 * <p>Deferred faces (verdict批文 3, W3d mode — hooks reserved):
 * <ul>
 *   <li>the 1/1000 bed-mob wake roll (R196 :551-578) needs the AI/bed
 *       path-to-bed slice — logged once per night as {@code sleep-mobwake
 *       deferred};</li>
 *   <li>{@code _calculateInitialWeather} (:599) belongs to the weather
 *       slice;</li>
 *   <li>wellRested (:582-588) has no 1.12 achievement equivalent — the
 *       {@code sleep-done} line judges the condition with
 *       {@code achievements=wellRested} but grants nothing in this
 *       mapping;</li>
 *   <li>morning gentle wake (R196 :746-754) — sleepers stay in bed until
 *       they get up themselves (verdict 2c, non-judged face); while they do,
 *       MinecraftServer.java:581 keeps the server loop full-speed exactly as
 *       vanilla already does for the shipped day-lying face.</li>
 * </ul></p>
 *
 * <p>[SleepLog] lines (self-contained judge values, verdict批文 §判据):
 * {@code sleep-window gate=blocked reason=... } (edge-deduped),
 * {@code sleep-forward slept=N totalTime=T->T+N dayTime=D->D' phase=P
 * gate=open}, {@code sleep-interrupt reason=... ticks_slept=N},
 * {@code sleep-done ...}, {@code sleep-skip n/a doDaylightCycle=false}.
 * Static fields below are log-dedupe bookkeeping only, no gameplay state.</p>
 */
public final class ETIMSleepClock {

    /** Log-dedupe key of the last emitted gate/skip line (no gameplay role). */
    private static String lastGateLogKey = "";

    /** sleep-probe throttle: next tick at which a probe row may be emitted (no gameplay role). */
    private static int probeCooldown = 0;

    private ETIMSleepClock() {
    }

    /**Adjusted time of day on the TOTAL clock: {@code (t%24000 + 6000) % 24000} (World.java:1690-1692). */
    public static long adjustedTimeOfDay(net.minecraft.world.World world) {
        return (world.getWorldInfo().getWorldTotalTime() % 24000L + 6000L) % 24000L;
    }

    /** R196 trigger window on the adjusted clock (WorldServer.java:206). */
    public static boolean windowOpen(long adjusted) {
        return adjusted < 4000L || adjusted >= 21000L;
    }

    /** R196 getTimeTillSunrise (World.java:1694-1696): ticks to the next sunrise. */
    public static int ticksTillSunrise(long adjusted) {
        return adjusted < 5000L
                ? (int) (5000L - adjusted)
                : (int) (5000L - adjusted + 24000L);
    }

    /** `sleep-window gate=blocked reason=...` line (edge-deduped per day). */
    public static void logWindowBlocked(net.minecraft.world.World world, String reason) {
        String key = reason + "|" + (world.getWorldInfo().getWorldTotalTime() / 24000L + 1L);
        if (key.equals(lastGateLogKey)) {
            return;
        }
        lastGateLogKey = key;
        ETIM.LOGGER.info("[SleepLog] sleep-window gate=blocked reason=" + reason
                + " adjusted=" + adjustedTimeOfDay(world)
                + " day=" + (world.getWorldInfo().getWorldTotalTime() / 24000L + 1L));
    }

    /** `sleep-skip n/a doDaylightCycle=false` line (edge-deduped per day). */
    public static void logDaylightCycleSkip(net.minecraft.world.World world) {
        String key = "skip|" + (world.getWorldInfo().getWorldTotalTime() / 24000L + 1L);
        if (key.equals(lastGateLogKey)) {
            return;
        }
        lastGateLogKey = key;
        ETIM.LOGGER.info("[SleepLog] sleep-skip n/a doDaylightCycle=false");
    }

    /**
     * sleep-probe judge instrument (02 density-eval precedent, judge-only
     * face): fires 1/100 ticks ONLY while some player is lying and the
     * vanilla all-asleep verdict is still false, localizing which link of
     * WorldServer.java:318-336 broke — sleepers vs the full-asleep
     * (sleepTimer>=100, EntityPlayer:1871-1873) headcount. Zero rows with a
     * standing lying face mean the world flag machine never stood up.
     */
    public static void probe(WorldServer world, boolean allAsleep) {
        if (allAsleep) {
            probeCooldown = 0;
            return;
        }
        if (probeCooldown > 0) {
            --probeCooldown;
            return;
        }
        int lying = 0;
        int fullyAsleep = 0;
        int nonSpectators = 0;
        for (EntityPlayer player : world.playerEntities) {
            if (player.isSpectator()) {
                continue;
            }
            ++nonSpectators;
            if (player.isPlayerSleeping()) {
                ++lying;
                if (player.isPlayerFullyAsleep()) {
                    ++fullyAsleep;
                }
            }
        }
        if (lying == 0) {
            probeCooldown = 0;
            return;
        }
        probeCooldown = 100;
        ETIM.LOGGER.info("[SleepLog] sleep-probe allAsleep=false lying=" + lying + "/" + nonSpectators
                + " fullyAsleep=" + fullyAsleep
                + " doDaylightCycle=" + world.getGameRules().getBoolean("doDaylightCycle"));
    }

    /**
     * R196 runSleepTicks (WorldServer.java:533-601): runs the whole night
     * batch and lands the S3 double-clock exit. Returns ticks_slept
     * (judging parity: the interrupting iteration counts, R196's for-update
     * clause runs before the exit test).
     */
    public static int runSleepTicks(WorldServer world) {
        long adjusted = adjustedTimeOfDay(world);
        int ticks = ticksTillSunrise(adjusted);

        long totalBefore = world.getWorldInfo().getWorldTotalTime();
        long dayTimeBefore = world.getWorldTime();

        ETIM.LOGGER.info("[SleepLog] sleep-mobwake deferred (R196 1/1000 bed-mob wake roll :551-578 needs the AI/bed slice; hook reserved)");

        int slept = 0;
        boolean woke = false;
        String reason = null;

        // R196 :537-549 — same for-loop shape, same accounting.
        for (; slept < ticks && !woke; slept++) {
            for (EntityPlayer player : world.playerEntities) {
                // R196 :539 filter (isGhost/isZevimrgvInTournament/dead -> spectator/dead faces).
                if (player.isSpectator() || player.getHealth() <= 0.0F) {
                    continue;
                }
                player.getFoodStats().onUpdate(player); // the mixified body (MixinFoodStats)
                ETIMFoodStats.tickBedGate(player);      // shipped R196 wakeHungry gate, config respecting
                if (!player.isPlayerSleeping()) {
                    woke = true;
                    reason = (ETIMConfig.hungerSleepDeny && ETIMFoodStats.isStarving(player))
                            ? "hunger" : "leftBed";
                    break;
                }
            }
            // R196 :551-578 mob-wake roll — deferred (see the deferred line above).
        }

        if (woke) {
            ETIM.LOGGER.info("[SleepLog] sleep-interrupt reason=" + reason + " ticks_slept=" + slept);
        }

        // S3 exit (verdict §1 改判): absolute dayTime := totalTime % 24000. A
        // zero-tick night (interrupted before the first batch tick) changes
        // nothing — R196 advanceTotalWorldTime(0) is a no-op.
        long totalAfter = totalBefore + slept;
        long dayTimeAfter = world.getWorldTime();
        if (slept > 0) {
            world.getWorldInfo().setWorldTotalTime(totalAfter);
            dayTimeAfter = totalAfter % 24000L;
            world.setWorldTime(dayTimeAfter);
        }

        ETIM.LOGGER.info("[SleepLog] sleep-forward slept=" + slept
                + " totalTime=" + totalBefore + "->" + totalAfter
                + " dayTime=" + dayTimeBefore + "->" + dayTimeAfter
                + " phase=" + ETIMMoonState.phase(world) + " gate=open");

        // R196 :591-597 potion clear for sleepers at ≥1000 ticks.
        boolean potionsCleared = false;
        if (slept >= 1000) {
            for (EntityPlayer player : world.playerEntities) {
                if (!player.isSpectator() && player.getHealth() > 0.0F && player.isPlayerSleeping()) {
                    player.clearActivePotions(); // EntityLivingBase :787
                    potionsCleared = true;
                }
            }
        }

        // R196 :582-588 wellRested condition; no 1.12 achievement exists to grant.
        String achievements = (slept == ticks && !woke && slept >= 6000) ? "wellRested" : "none";
        ETIM.LOGGER.info("[SleepLog] sleep-done achievements=" + achievements
                + " potionsCleared=" + potionsCleared + " slept=" + slept);

        return slept;
    }
}
