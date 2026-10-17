package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMMoonState;
import io.github.etim.etim.mob.ETIMSpawnCycle;
import io.github.etim.etim.playerstate.ETIMSleepClock;
import io.github.etim.etim.playerstate.PlayerBedEvents;
import io.github.etim.etim.weather.ETIMWeatherClock;
import net.minecraft.entity.effect.EntityLightningBolt;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.DifficultyInstance;
import net.minecraft.world.WorldServer;
import net.minecraft.world.WorldEntitySpawner;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

import java.util.Random;

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

    @Shadow
    protected abstract BlockPos adjustPosToNearbyEntity(BlockPos pos);

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

    // ------------------- weather-01: the R196 lightning face (WorldServer.java:987-1010) -------------------

    /**
     * R196 :988 rarity = blood 20000 / normal 100000 (verdict J1, ×5 on
     * blood). The blood face reads {@link ETIMMoonState#phase} (override
     * aware). Delegating redirect over the TWO {@code nextInt(I)} call
     * sites of {@code updateBlocks} (:423 lightning, :451 iceandsnow);
     * only the 100000 literal is rewritten, the other modulus delegates
     * unchanged, so no ordinal bookkeeping.
     */
    @Redirect(
            method = "updateBlocks", // the chunk polling body, WorldServer.java:391-551 (NOT tick)
            at = @At(value = "INVOKE",
                    target = "Ljava/util/Random;nextInt(I)I"),
            require = 2
    )
    private int etim$lightningRarity(Random random, int original) {
        // require=2: only :423 (lightning 100000 literal) and :451 (iceandsnow
        // nextInt(16)) live inside updateBlocks; the other nextInt sites
        // (:355/:356 in setInitialSpawnLocation, :380/:382-384 in
        // playerCheckLight) stay untouched here. Only the 100000 literal is
        // rewritten; every other modulus delegates unchanged, so no ordinal
        // bookkeeping. Clock-off → vanilla rarity (J1 passthrough).
        if (original == 100000) {
            return random.nextInt(ETIMWeatherClock.lightningRarity((WorldServer) (Object) this));
        }
        return random.nextInt(original);
    }



    /**
     * R196 :1002-1006 strike positioning (verdict J4, A 级强制细则): the
     * strike lands at the precipitation height of the LCG block — the
     * vanilla {@code adjustPosToNearbyEntity} entity bias (:510-535) is
     * removed AND the y=0 call-site value (:427) is refilled in the same
     * replacement; missing either half leaves {@code isRainingAt}'s
     * {@code y >= precipitationHeight} test permanently false. require=1:
     * single call site (WorldServer.updateBlocks :427).
     */
    @Redirect(
            method = "updateBlocks", // WorldServer.java:391-551 — the strike block lives here, not tick
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/world/WorldServer;adjustPosToNearbyEntity(Lnet/minecraft/util/math/BlockPos;)Lnet/minecraft/util/math/BlockPos;"),
            require = 1
    )
    private BlockPos etim$strikePos(WorldServer world, BlockPos pos) {
        if (!ETIMWeatherClock.active(world)) {
            return this.adjustPosToNearbyEntity(pos); // same object as world
        }
        return world.getPrecipitationHeight(pos);
    }

    /**
     * R196 has no skeleton-trap face (verdict J3, A 级定谳 — vanilla
     * WorldServer:433-441 is 1.9+ content): zeroing the additional
     * difficulty makes the trap roll {@code nextDouble() < 0} always
     * false, so only the normal bolt branch survives (the RNG stream keeps
     * its shape: nextDouble is still consumed). require=1: single site
     * (WorldServer.updateBlocks :433).
     */
    @Redirect(
            method = "updateBlocks", // WorldServer.java:391-551 — strike block, not tick
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/world/DifficultyInstance;getAdditionalDifficulty()F"),
            require = 1
    )
    private float etim$noSkeletonTrap(DifficultyInstance difficulty) {
        if (ETIMWeatherClock.active((WorldServer) (Object) this)) {
            return 0.0F;
        }
        return difficulty.getAdditionalDifficulty();
    }

    /**
     * Judge channel (verdict §4.4): every weather-effect spawn at the R196
     * addWeatherEffect face (:1008) logs one {@code lightning-struck} line
     * with the rarity choice in effect — the judge window asserts the
     * rarity SELECTION, not a density statistic. require=2: the two bolt
     * branches (:440 trap — dead under J3 — and :444 normal). The target
     * descriptor is the DECLARED one (Entity)Z (World.addWeatherEffect);
     * the trap bolt is inside a dead branch under J3 but keeps its face.
     */
    @Redirect(
            method = "updateBlocks", // WorldServer.java:391-551 — strike block, not tick
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/world/WorldServer;addWeatherEffect(Lnet/minecraft/entity/Entity;)Z"),
            require = 2
    )
    private boolean etim$lightningLog(WorldServer world, net.minecraft.entity.Entity effect) {
        if (effect instanceof EntityLightningBolt && ETIMWeatherClock.active(world)) {
            ETIM.LOGGER.info("[WeatherLog] lightning-struck x,y,z="
                    + (int) effect.posX + "," + (int) effect.posY + "," + (int) effect.posZ
                    + " rarity=" + ETIMWeatherClock.lightningRarity(world)
                    + " blood=" + (ETIMMoonState.phase(world) == ETIMMoonState.Phase.BLOOD));
        }
        return world.addWeatherEffect(effect);
    }
}
