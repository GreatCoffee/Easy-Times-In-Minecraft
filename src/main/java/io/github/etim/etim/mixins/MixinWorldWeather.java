package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.weather.ETIMWeatherClock;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * weather-01 — the R196 weather clock owns {@code World.updateWeatherBody}
 * (1.12 World.java:2804-2899, the single weather throat: tick →
 * WorldServer.updateWeather :1313 packet face → WorldProvider.updateWeather
 * :553 → this body). Verdict J1=A (weather-verdict.md): the vanilla
 * doWeatherCycle timer machine is replaced by the R196 deterministic event
 * table in {@link ETIMWeatherClock}; the packet sync face upstream and every
 * worldInfo boolean consumer stay untouched.
 *
 * <p>Passthrough faces (verdict §4.5): {@code weatherSystem=false} or
 * {@code doWeatherCycle=false} → the vanilla body runs untouched, with a
 * once-per-transition {@code [WeatherLog] weather-off reason=…} proof line
 * (verdict must-add 4). Non-Overworld dimensions never enter the clock
 * (R196 canPrecipitate = isOverworld, World.java:6532-6534).</p>
 */
@Mixin(World.class)
public abstract class MixinWorldWeather {

    @Shadow
    @Final
    public boolean isRemote;

    @Unique
    private io.github.etim.etim.weather.ETIMWeatherClock etim$weatherClock;

    // remap=false: updateWeatherBody is a Forge-ADDED split method (vanilla
    // 1.12 only has func_72979_l updateWeather) — it carries its literal
    // name in MCP and SRG namespaces alike, so there is no obfuscation
    // mapping to write into the refmap.
    @Inject(method = "updateWeatherBody", at = @At("HEAD"), cancellable = true, require = 1, remap = false)
    private void etim$weatherClock(CallbackInfo ci) {
        if (this.isRemote) {
            return;
        }
        WorldServer world = (WorldServer) (Object) this;
        if (world.provider.getDimension() != 0) {
            return; // R196 canPrecipitate: the clock is Overworld-only
        }
        if (!ETIMConfig.weatherSystem) {
            ETIMWeatherClock.logOffState("config");
            return;
        }
        if (!world.getGameRules().getBoolean("doWeatherCycle")) {
            ETIMWeatherClock.logOffState("gamerule");
            return;
        }
        if (this.etim$weatherClock == null) {
            this.etim$weatherClock = new io.github.etim.etim.weather.ETIMWeatherClock();
        }
        this.etim$weatherClock.update(world);
        ci.cancel();
    }
}
