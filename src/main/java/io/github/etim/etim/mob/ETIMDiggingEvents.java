package io.github.etim.etim.mob;

import net.minecraft.entity.Entity;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.util.DamageSource;
import net.minecraftforge.event.AttachCapabilitiesEvent;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.living.LivingEvent.LivingUpdateEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.common.MinecraftForge;

/**
 * AI-02 — capability attach + per-tick dig-face host (livestock events
 * precedent): zombies carry the dig capability; the per-tick
 * EntityAnimalWatcher.onUpdate face rides LivingUpdateEvent (server-only
 * guard inside).
 */
public final class ETIMDiggingEvents {

    /** Registers the attach + tick handlers (call from mod preInit, once). */
    public static void register() {
        MinecraftForge.EVENT_BUS.register(ETIMDiggingEvents.class);
    }

    @SubscribeEvent
    public static void onAttachCapabilities(AttachCapabilitiesEvent<Entity> event) {
        if (event.getObject() instanceof EntityZombie) {
            event.addCapability(ETIMDigging.CAPABILITY_KEY, new ETIMDigging.Provider());
        }
    }

    @SubscribeEvent
    public static void onLivingUpdate(LivingUpdateEvent event) {
        if (event.getEntityLiving().world.isRemote) {
            return;
        }
        // The bone-lord frenzy countdown ticks on every skeleton (mob 批 A-3),
        // independent of the dig-AI config.
        if (event.getEntityLiving() instanceof net.minecraft.entity.monster.EntitySkeleton) {
            ETIMDigging.tickFrenzy((net.minecraft.entity.monster.EntitySkeleton) event.getEntityLiving());
        }
        if (!io.github.etim.etim.ETIMConfig.zombieDigAI) {
            return;
        }
        if (event.getEntityLiving() instanceof EntityZombie) {
            ETIMDigging.tickDigger((EntityZombie) event.getEntityLiving());
        }
    }

    @SubscribeEvent
    public static void onLivingDeath(LivingDeathEvent event) {
        if (event.getEntityLiving() instanceof EntityZombie) {
            ETIMDigging.onDiggerDeath((EntityZombie) event.getEntityLiving());
        }
    }
}
