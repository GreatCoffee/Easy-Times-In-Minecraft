package io.github.etim.etim.nutrition;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.hunger.ETIMFoodStats;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.math.MathHelper;
import net.minecraftforge.event.AttachCapabilitiesEvent;
import net.minecraftforge.event.entity.living.LivingEntityUseItemEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.PlayerEvent.PlayerLoggedInEvent;

/**
 * Capability lifecycle and food hooks for {@link NutritionSystem} (task 1.4).
 *
 * <p>Bus notes (1.12.2, verified in this Forge's source): the FML bus and
 * {@code MinecraftForge.EVENT_BUS} are the same object here (FMLCommonHandler
 * javadoc), so the plain {@code @Mod.EventBusSubscriber} registration receives
 * AttachCapabilitiesEvent, LivingEntityUseItemEvent, PlayerEvent.Clone,
 * PlayerInteractEvent, PlayerTickEvent and PlayerLoggedInEvent alike.</p>
 *
 * <p>Semantics (R196 decompile + jar bytecode): pools spawn full on first
 * creation; the clone handler copies the pools AND the held insulin level
 * as-is for both death respawn and End travel (ServerConfigurationManager
 * 317-321) — a new life does not reset them.</p>
 *
 * <p>Eating hooks: {@code Finish} applies a registered food's R196 values
 * (nutrient pools, satiation discount and insulin side effects — server
 * authority). Vanilla cake slice handling moved to the inside-of-activation
 * gate in MixinBlockCake (task 2.4).</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class ETIMNutritionEvents {

    private ETIMNutritionEvents() {
    }

    /**
     * Attaches the nutrition capability to every player. The event is generic
     * over {@code Entity} in 1.12.2 (ForgeEventFactory:661), so players are
     * picked out by an instanceof guard BEFORE any provider is allocated.
     */
    @SubscribeEvent
    public static void onAttachEntityCapabilities(AttachCapabilitiesEvent<Entity> event) {
        if (!(event.getObject() instanceof EntityPlayer)) {
            return;
        }
        event.addCapability(NutritionSystem.NUTRITION_CAPABILITY_KEY, new NutritionSystem.Provider());
    }

    /** Per-tick drain moved to {@link io.github.etim.etim.hunger.ETIMFoodStatsEvents}
     *  (task 1.5) so the drain-before-pool-loop ordering is deterministic. */

    /** Client learns the current values on login (server-authoritative). */
    @SubscribeEvent
    public static void onPlayerLoggedIn(PlayerLoggedInEvent event) {
        if (event.player instanceof EntityPlayerMP) {
            syncTo((EntityPlayerMP) event.player);
        }
    }

    /**
     * R196 respawn copy (ServerConfigurationManager:317-321): the four pools,
     * the raw insulin resistance and the held mirror level are carried over
     * AS-IS on both death respawn and End travel — a "new life" does not
     * reset them; the constructor's full pools only apply to first creation.
     */
    @SubscribeEvent
    public static void onPlayerClone(PlayerEvent.Clone event) {
        NutritionSystem.INutrition oldCapsule = NutritionSystem.get(event.getOriginal());
        NutritionSystem.INutrition capsule = NutritionSystem.get(event.getEntityPlayer());
        if (oldCapsule == null || capsule == null) {
            return;
        }
        capsule.setProtein(oldCapsule.getProtein());
        capsule.setEssentialFats(oldCapsule.getEssentialFats());
        capsule.setPhytonutrients(oldCapsule.getPhytonutrients());
        capsule.setInsulinResistance(oldCapsule.getInsulinResistance());
        // The raw setter re-tracks the level by band; the persisted held level
        // (with its one-band decay lag) is explicit authority, so it wins.
        capsule.setInsulinLevel(oldCapsule.getInsulinLevel());
        if (event.getEntityPlayer() instanceof EntityPlayerMP) {
            syncTo((EntityPlayerMP) event.getEntityPlayer());
        }
    }

    /** Registered item food eaten to completion: apply R196 food semantics + resync. */
    @SubscribeEvent
    public static void onUseItemFinish(LivingEntityUseItemEvent.Finish event) {
        if (event.getEntityLiving().world.isRemote
                || !(event.getEntityLiving() instanceof EntityPlayer)) {
            return;
        }
        NutritionSystem.FoodValue value = NutritionSystem.getFoodValue(event.getItem());
        if (value == null) {
            return; // only R196-registered foods carry food values
        }
        ETIMFoodStats.applyFoodValue((EntityPlayer) event.getEntityLiving(), value,
                event.getItem().getItem().getRegistryName() == null
                        ? event.getItem().getItem().getClass().getSimpleName()
                        : event.getItem().getItem().getRegistryName().toString());
        if (event.getEntityLiving() instanceof EntityPlayerMP) {
            syncTo((EntityPlayerMP) event.getEntityLiving());
        }
    }

    /**
     * Vanilla cake right-click: per-slice handling moved entirely into
     * {@link io.github.etim.etim.mixins.MixinBlockCake} (task 2.4) — the gate,
     * the value grant and the logs live inside
     * {@code BlockCake.onBlockActivated} now, so this hook is gone. Vanilla's
     * own {@code canEat} gate handles the legacy food model itself.
     */

    /** Sends the current nutrition values to the owner's client. */
    private static void syncTo(EntityPlayerMP player) {
        NutritionSystem.INutrition capsule = NutritionSystem.get(player);
        if (capsule == null) {
            return;
        }
        NutritionNetwork.toClient(player,
                MathHelper.clamp(capsule.getProtein(), 0, ETIMConfig.nutritionPoolMax),
                MathHelper.clamp(capsule.getEssentialFats(), 0, ETIMConfig.nutritionPoolMax),
                MathHelper.clamp(capsule.getPhytonutrients(), 0, ETIMConfig.nutritionPoolMax),
                MathHelper.clamp(capsule.getInsulinResistance(), 0, ETIMConfig.insulinCap));
    }
}
