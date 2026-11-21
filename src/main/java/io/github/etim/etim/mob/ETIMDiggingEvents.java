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
        if (event.getObject() instanceof EntityZombie
                || event.getObject() instanceof ETIMEntityGhoul) { // B-59 D-1 — the dig system opens to the ghoul
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
        boolean ghoul = event.getEntityLiving() instanceof ETIMEntityGhoul;
        boolean gateOn = ghoul ? io.github.etim.etim.ETIMConfig.mobUndeadSurfaceR196
                : io.github.etim.etim.ETIMConfig.zombieDigAI;
        if (!gateOn) {
            return;
        }
        if (event.getEntityLiving() instanceof EntityZombie || ghoul) {
            ETIMDigging.tickDigger((net.minecraft.entity.EntityLiving) event.getEntityLiving());
        }
    }

    @SubscribeEvent
    public static void onLivingDeath(LivingDeathEvent event) {
        if (event.getEntityLiving() instanceof EntityZombie
                || event.getEntityLiving() instanceof ETIMEntityGhoul) {
            ETIMDigging.onDiggerDeath((net.minecraft.entity.EntityLiving) event.getEntityLiving());
        }
    }
}
