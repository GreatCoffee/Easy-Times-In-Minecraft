package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMMoonState;
import io.github.etim.etim.mob.ETIMSpawnCycle;
import io.github.etim.etim.playerstate.ETIMSleepClock;
import io.github.etim.etim.playerstate.PlayerBedEvents;
import net.minecraft.world.WorldServer;
import net.minecraft.world.WorldEntitySpawner;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * The sleep-skip site of {@code WorldServer.tick} (vanilla :196), owning
 * the sleep-01 sleep clock. The redirect replaces the single
 * {@code areAllPlayersAsleep()} invoke (require=1, verdict批文 1: only the
 * direct invoke is rewritten, callee internals stay in bytecode) and runs
 * the R196 sleep gate chain (WorldServer.java:202-218 transposed):
 * <ol>
 *   <li>day-liar gate (shipped, PlayerBedEvents):</li>
 *   <li>blood-moon gate (R196 :203 sleeping_prevented, config
 *       {@code bloodMoonSleepBlock}):
 *       {@link ETIMMoonState#phase} == BLOOD blocks the skip all day;</li>
 *   <li>{@code doDaylightCycle} off → R196 :210-211 face: no jump, no
 *       弹床 (vanilla {@code wakeAllPlayers} is suppressed by returning
 *       false);</li>
 *   <li>{@code sleepFastForward} off → return true: vanilla instant 表钟
 *       jump + wake (the gates above still applied);</li>
 *   <li>R196 trigger window (adjusted ∈ [21000,24000) ∪ [0,4000)) on the
 *       TOTAL clock;</li>
 *   <li>the R196 night batch runs in {@link ETIMSleepClock#runSleepTicks}
 *       (S1) with the S3 absolute dayTime/totalTime alignment exit; return
 *       false suppresses the vanilla :200-202 表钟 jump and :204 弹床
 *       wake in favor of the transposed exit.</li>
 * </ol>
 * Returning false is always safe here: {@code areAllPlayersAsleep()} has
 * no other consumer of this result than the skip block.
 */
@Mixin(WorldServer.class)
public abstract class MixinWorldServer {

    @Redirect(
            method = "tick",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/world/WorldServer;areAllPlayersAsleep()Z"),
            require = 1
    )
    private boolean etim$sleepClock(WorldServer self) {
        boolean allAsleep = self.areAllPlayersAsleep();
        // Judge instrument (02 density-eval precedent): localize which link of
        // the all-asleep machine fails — the W4 window sits on this verdict.
        ETIMSleepClock.probe(self, allAsleep);
        if (!allAsleep) {
            return false;
        }
        // Gate 1 (shipped): a player lying in a bed entered during the day.
        if (PlayerBedEvents.hasAnyDayLiar(self)) {
            ETIMSleepClock.logWindowBlocked(self, "dayLiar");
            return false;
        }
        // Gate 2 (S2): R196 :203 sleeping_prevented — blood moon blocks all day.
        if (ETIMConfig.bloodMoonSleepBlock
                && ETIMMoonState.phase(self) == ETIMMoonState.Phase.BLOOD) {
            ETIMSleepClock.logWindowBlocked(self, "blood");
            return false;
        }
        // R196 :208-212: no doDaylightCycle → no jump, players stay lying.
        if (!self.getGameRules().getBoolean("doDaylightCycle")) {
            ETIMSleepClock.logDaylightCycleSkip(self);
            return false;
        }
        // Config off = vanilla passthrough (blood/dayLiar gates already applied).
        if (!ETIMConfig.sleepFastForward) {
            return true;
        }
        // Gate 4 (S1): R196 :206 trigger window on the total clock.
        long adjusted = ETIMSleepClock.adjustedTimeOfDay(self);
        if (!ETIMSleepClock.windowOpen(adjusted)) {
            ETIMSleepClock.logWindowBlocked(self, "offWindow");
            return false;
        }
        // S1/S3: run the R196 night batch, land the aligned double-clock exit.
        ETIMSleepClock.runSleepTicks(self);
        return false;
    }

    /**
     * Stage 5 batch 4 — the R196 spawn cycle (audit 11 §4 + audit 14)
     * replaces the vanilla world-entity spawner call wholesale; the cycle
     * itself lives in ETIMSpawnCycle (config-off = vanilla passthrough).
     */
    @Redirect(
            method = "tick",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/world/WorldEntitySpawner;findChunksForSpawning(Lnet/minecraft/world/WorldServer;ZZZ)I"),
            require = 1
    )
    private int etim$spawnCycle(WorldEntitySpawner spawner, WorldServer world, boolean spawnHostileMobs,
            boolean spawnPeacefulMobs, boolean spawnOnSetTickRate) {
        return ETIMSpawnCycle.findChunksForSpawning(world, spawnHostileMobs, spawnPeacefulMobs, spawnOnSetTickRate);
    }
}
