package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayer.SleepResult;
import net.minecraft.world.World;
import net.minecraftforge.event.entity.player.PlayerWakeUpEvent;
import net.minecraftforge.event.entity.player.SleepingTimeCheckEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.Event.Result;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.PlayerEvent;

/**
 * MITE bed semantics (task 1.3 daytime-lying support).
 *
 * <p>R196 lets players LIE IN A BED at any hour purely for the x4 regen
 * boost ("白天躺床"), while vanilla refuses to enter a bed during the day.
 * Vanilla's safety checks (no hostile mobs nearby, bed reachable) are kept:
 * {@link SleepingTimeCheckEvent} fires before them — overriding its
 * result to ALLOW during the day skips ONLY the time-of-day check.</p>
 *
 * <p>A player who lies down during the day must NOT trigger vanilla's
 * "everyone asleep → skip to next morning": the skip would fire either
 * while lying by day or the moment night falls. MixinWorldServer consults
 * {@link #hasAnyDayLiar} to block the skip for such a life session; the
 * marker clears on waking, disconnecting, or (for correctness) if the
 * world stops being rid of them.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class PlayerBedEvents {

    /** Players currently lying in a bed they entered during the day, per world side. */
    private static final Map<UUID, Boolean> DAY_LIERS = new HashMap<UUID, Boolean>();

    private PlayerBedEvents() {
    }

    @SubscribeEvent
    public static void onSleepingTimeCheck(SleepingTimeCheckEvent event) {
        EntityPlayer player = event.getEntityPlayer();
        if (ETIMConfig.allowDayBedRegen && player.world.isDaytime()
            && !player.world.isRemote && player.world.provider.isSurfaceWorld()) {
            event.setResult(Result.ALLOW);
            DAY_LIERS.put(player.getUniqueID(), Boolean.TRUE);
        }
    }

    @SubscribeEvent
    public static void onPlayerWakeUp(PlayerWakeUpEvent event) {
        DAY_LIERS.remove(event.getEntityPlayer().getUniqueID());
    }

    @SubscribeEvent
    public static void onPlayerLoggedOut(PlayerEvent.PlayerLoggedOutEvent event) {
        DAY_LIERS.remove(event.player.getUniqueID());
    }

    /** True if some lying player entered the bed during the day (mixin hook). */
    public static boolean hasAnyDayLiar(World world) {
        for (EntityPlayer player : world.playerEntities) {
            if (player.isPlayerSleeping() && DAY_LIERS.containsKey(player.getUniqueID())) {
                return true;
            }
        }
        return false;
    }
}
