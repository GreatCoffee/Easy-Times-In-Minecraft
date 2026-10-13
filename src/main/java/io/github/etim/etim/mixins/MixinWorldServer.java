package io.github.etim.etim.mixins;

import io.github.etim.etim.playerstate.PlayerBedEvents;
import io.github.etim.etim.mob.ETIMSpawnCycle;
import net.minecraft.world.WorldServer;
import net.minecraft.world.WorldEntitySpawner;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Blocks vanilla's "everyone asleep → skip to morning" while a player is
 * lying (not really sleeping) in a bed that was entered during the day
 * (MITE daytime-lying support, see PlayerBedEvents).
 *
 * <p>Without this, a daytime lie would skip the whole day (and the whole
 * night once it falls), because vanilla's {@code WorldServer.tick} has no
 * time-of-day condition around {@code areAllPlayersAsleep()}.</p>
 */
@Mixin(WorldServer.class)
public abstract class MixinWorldServer {

    @Redirect(
            method = "tick",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/world/WorldServer;areAllPlayersAsleep()Z"),
            require = 1
    )
    private boolean etim$noSkipForDayLiers(WorldServer self) {
        return self.areAllPlayersAsleep() && !PlayerBedEvents.hasAnyDayLiar(self);
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
