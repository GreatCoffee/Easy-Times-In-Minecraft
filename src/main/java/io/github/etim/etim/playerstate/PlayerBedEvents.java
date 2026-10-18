package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.block.BlockBed;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayer.SleepResult;
import net.minecraft.init.MobEffects;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.event.entity.player.PlayerSleepInBedEvent;
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

    /** True if some lying player entered the bed during the day (mixin hook).
     * F-1-21(a)（audit20-01 R3）：夜窗开启即返 false（R196 语义——夜窗内白天躺床者照跳）；
     * 夜窗外否决面保留 = B 级登记（vanilla 白天本无跳钟尝试，防御面无行为后果）。 */
    public static boolean hasAnyDayLiar(World world) {
        if (ETIMSleepClock.windowOpen(ETIMSleepClock.adjustedTimeOfDay(world))) {
            return false;
        }
        for (EntityPlayer player : world.playerEntities) {
            if (player.isPlayerSleeping() && DAY_LIERS.containsKey(player.getUniqueID())) {
                return true;
            }
        }
        return false;
    }

    /**
     * bed-entry S1 (verdict批文 1): the R196 entry gate trio (ServerPlayer
     * :1081/:1085/:1087) on the ENTRY-ONLY hook — PlayerSleepInBedEvent fires
     * exactly once per attempt from trySleep:1667, no lying-tick contamination
     * (M1 spirit). Host choice over the verdict-named SleepingTimeCheckEvent:
     * that event also fires every lying tick (EntityPlayer:255) and its DENY
     * path makes vanilla emit its own tile.bed.noSleep on top (BlockBed
     * :123-126) — the OTHER_PROBLEM branch is silent vanilla-side (the shipped
     * tooHungry face precedent), so the R196 single-message face holds.
     *
     * <p>Gate order inside is R196's (:1081 sheltered → :1085 obstructed →
     * :1087 poisoned; tooHungry stays the shipped separate subscriber —
     * a same-click double message if both faces hit is a B-level registered
     * face, verdict批文 3 B-tier). Vanilla TOO_FAR/NOT_SAFE run after us
     * inside trySleep (TOO_FAR kept per verdict M4).</p>
     */
    @SubscribeEvent
    public static void onPlayerSleepInBed(PlayerSleepInBedEvent event) {
        EntityPlayer player = event.getEntityPlayer();
        World world = player.world;
        if (world.isRemote) {
            return;
        }
        BlockPos bed = event.getPos(); // HEAD-resolved by vanilla BlockBed :84-87
        int x = bed.getX();
        int y = bed.getY();
        int z = bed.getZ();
        if (ETIMConfig.bedRefuseShelter && ETIMBedSafety.isOutdoors(world, x, y, z)) {
            player.sendStatusMessage(new net.minecraft.util.text.TextComponentTranslation("tile.bed.notSheltered"), true);
            ETIMBedSafety.logBedRefuse(world, "notSheltered", bed);
            event.setResult(SleepResult.OTHER_PROBLEM);
            return;
        }
        if (ETIMConfig.bedRefuseObstructed && !ETIMBedSafety.isAirOrPassableBlock(world, x, y + 1, z)) {
            player.sendStatusMessage(new net.minecraft.util.text.TextComponentTranslation("tile.bed.obstructed"), true);
            ETIMBedSafety.logBedRefuse(world, "obstructed", bed);
            event.setResult(SleepResult.OTHER_PROBLEM);
            return;
        }
        if (ETIMConfig.bedRefusePoison && player.isPotionActive(MobEffects.POISON)) {
            player.sendStatusMessage(new net.minecraft.util.text.TextComponentTranslation("tile.bed.poisoned"), true);
            ETIMBedSafety.logBedRefuse(world, "poisoned", bed);
            event.setResult(SleepResult.OTHER_PROBLEM);
            return;
        }
        // R196 :1089 entry-gate slot 6 (AI-02) — chat only, no wake (R196 :1090);
        // vanilla TOO_FAR/NOT_SAFE still run inside trySleep after us.
        if (ETIMConfig.zombieDigAI && io.github.etim.etim.mob.ETIMDigging.isHostileEntityDiggingNearBed(world, bed)) {
            player.sendStatusMessage(new net.minecraft.util.text.TextComponentTranslation("tile.bed.mobsDigging"), true);
            ETIMBedSafety.logBedRefuse(world, "mobsDigging", bed);
            event.setResult(SleepResult.OTHER_PROBLEM);
        }
    }

    /**
     * bed-entry S1 judge face for the occupied gate (verdict批文 6): vanilla
     * natively carries BOTH halves of R196 BlockBed.java:68-85 — the occupied
     * message at :105 and the stale-flag self-clear at :109-110 — but never
     * reaches trySleep (no PlayerSleepInBedEvent) in either case, so the
     * [SleepLog] rows are observed here, right before vanilla's decision.
     * Read-only hook; no result changes.
     */
    @SubscribeEvent
    public static void onRightClickBed(PlayerInteractEvent.RightClickBlock event) {
        World world = event.getWorld();
        if (world.isRemote) {
            return;
        }
        IBlockState state = world.getBlockState(event.getPos());
        if (!(state.getBlock() instanceof BlockBed)) {
            return;
        }
        BlockPos pos = event.getPos();
        if (state.getValue(BlockBed.PART) != BlockBed.EnumPartType.HEAD) {
            pos = pos.offset(state.getValue(BlockBed.FACING));
            state = world.getBlockState(pos);
            if (!(state.getBlock() instanceof BlockBed)) {
                return;
            }
        }
        if (!state.getValue(BlockBed.OCCUPIED)) {
            return;
        }
        EntityPlayer occupant = null;
        for (EntityPlayer candidate : world.playerEntities) {
            if (candidate.isPlayerSleeping() && pos.equals(candidate.bedLocation)) {
                occupant = candidate;
                break;
            }
        }
        if (occupant != null) {
            ETIMBedSafety.logBedRefuse(world, "occupied", pos);
        } else {
            ETIMBedSafety.logOccupiedCleared(world, pos);
        }
    }
}
