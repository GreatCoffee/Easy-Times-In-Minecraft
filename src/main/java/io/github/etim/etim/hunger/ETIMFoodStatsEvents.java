package io.github.etim.etim.hunger;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.ETIM;
import io.github.etim.etim.playerstate.ETIMBedSafety;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.nutrition.NutritionSystem;
import io.github.etim.etim.playerstate.FoodDebugNetwork;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.text.TextComponentTranslation;
import net.minecraftforge.event.AttachCapabilitiesEvent;
import net.minecraftforge.event.entity.living.LivingDamageEvent;
import net.minecraftforge.event.entity.player.PlayerSleepInBedEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.PlayerEvent.PlayerLoggedInEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

/**
 * Capability lifecycle + per-tick driver for the R196 dual-pool food model
 * (task 1.5).
 *
 * <p>Registering is done MANUALLY from {@code ETIM.preInit} (not
 * {@code @Mod.EventBusSubscriber}) so the tick ordering is guaranteed:
 * the 1.4 nutrient drain ({@code NutritionSystem.tick}) must run before the
 * pool loop, since an emptied pool flips malnourishment and malnourishment
 * feeds this tick's wetness multiplier.</p>
 *
 * <p>Per-tick order (server, non-creative for the pool loop): nutrient drain
 * → R196 FoodStats.onUpdate port → bed-wake gate → write-through/Vanilla
 * mirror is inside {@code ETIMFoodStats.tick} → debug sync every 20 ticks
 * (dev facility, display only).</p>
 */
public final class ETIMFoodStatsEvents {

    private ETIMFoodStatsEvents() {
    }

    /** Attaches the food capability to every player (both sides). */
    @SubscribeEvent
    public static void onAttachEntityCapabilities(AttachCapabilitiesEvent<Entity> event) {
        if (event.getObject() instanceof EntityPlayer) {
            event.addCapability(ETIMFoodStats.FOOD_CAPABILITY_KEY, new ETIMFoodStats.Provider());
        }
    }

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || event.player.world == null || event.player.world.isRemote) {
            return;
        }
        EntityPlayer player = event.player;
        NutritionSystem.tick(player); // 1.4 drain (has its own creative guard)
        // bed-entry S2 (verdict批文 2/M1): the R196 lie-side per-tick sentinel
        // runs HERE — never inside tickBedGate, which the sleepForward batch
        // loop also calls per slept tick (~22k/night). Config: bedSentryWake.
        ETIMBedSafety.tickSentry(player);
        if (ETIMConfig.foodModel) {
            ETIMFoodStats.tick(player);          // pools + starve/heal + write-through
            ETIMFoodStats.tickBedGate(player);   // starved sleeper ejection (R196 :421-429)
            ETIMEndurance.tickBowDraw(player);   // R196 ServerPlayer:641-643 (per active bow tick)
        }
        if (player.world.getWorldTime() % 20 == 0 && player instanceof EntityPlayerMP) {
            FoodDebugNetwork.sync((EntityPlayerMP) player);
        }
    }

    /**
     * R196 FoodStats.java:58-60 (bed + onHitList → addHunger): ETIM charges
     * {@code inBedHitListHunger} once per damage event while lying in a bed.
     */
    @SubscribeEvent
    public static void onLivingDamage(LivingDamageEvent event) {
        if (event.getEntity().world.isRemote
                || !(event.getEntityLiving() instanceof EntityPlayer)) {
            return;
        }
        EntityPlayer player = (EntityPlayer) event.getEntityLiving();
        if (player.isPlayerSleeping() && event.getAmount() > 0.0F) {
            ETIMFoodStats.chargeBedHit(player);
        }
    }

    /**
     * R196 EntityPlayer:421-429 entry refusal: a starving player
     * (nutrition == 0) cannot lie down at all — the tooHungry message at the
     * right-click (vanilla's OTHER_PROBLEM branch displays nothing itself,
     * so we send our own translation).
     * The wake side (sleepers ejecting) lives in {@code ETIMFoodStats.tickBedGate}.
     */
    @SubscribeEvent
    public static void onPlayerSleepInBed(PlayerSleepInBedEvent event) {
        EntityPlayer player = event.getEntityPlayer();
        if (player.world.isRemote
                || !ETIMConfig.foodModel
                || !ETIMConfig.hungerSleepDeny
                || !ETIMFoodStats.isStarving(player)) {
            return;
        }
        event.setResult(EntityPlayer.SleepResult.OTHER_PROBLEM);
        player.sendStatusMessage(new TextComponentTranslation("tile.bed.tooHungry"), true);
        ETIMFoodStats.logFoodEntry(player, "tooHungry (right-click bed while starvation)");
        // sleep-01 judge face: the shipped entry refusal is a sleep-window reason.
        io.github.etim.etim.playerstate.ETIMSleepClock.logWindowBlocked(player.world, "hungerDeny");
    }

    /**
     * R196 EntityPlayer:2654-2661 (server, non-creative, successful
     * placement): {@code min(hardness, 20) × endurance modifier}. PlaceEvent
     * is server-side only (ItemStack.java:200 wraps every server onItemUse
     * in ForgeHooks.onPlaceItemIntoWorld) and carries the placed state; the
     * same-tick hoe-till event is skipped inside
     * {@code ETIMEndurance.chargePlace}.
     */
    @SubscribeEvent
    public static void onPlaceBlock(net.minecraftforge.event.world.BlockEvent.PlaceEvent event) {
        if (event.getPlayer() == null) {
            return;
        }
        ETIMEndurance.chargePlace(event.getPlayer(),
                event.getPlacedBlock().getBlockHardness(event.getWorld(), event.getPos()));
    }

    /** Client learns the values on login (server-authoritative display). */
    @SubscribeEvent
    public static void onPlayerLoggedIn(PlayerLoggedInEvent event) {
        if (event.player instanceof EntityPlayerMP) {
            FoodDebugNetwork.sync((EntityPlayerMP) event.player);
        }
    }
}
