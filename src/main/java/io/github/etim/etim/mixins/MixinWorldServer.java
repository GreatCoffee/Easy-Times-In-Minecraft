package io.github.etim.etim.mixins;

import io.github.etim.etim.playerstate.PlayerBedEvents;
import net.minecraft.world.WorldServer;
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
}
