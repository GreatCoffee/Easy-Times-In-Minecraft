package io.github.etim.etim.item;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMZombieVillagerInvoker;
import net.minecraft.entity.monster.EntityZombieVillager;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.init.MobEffects;
import net.minecraft.item.ItemStack;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * B-65 census F :162 — the R196 golden-apple zombie-villager conversion
 * ({@code ItemAppleGold.tryEntityInteraction}).
 *
 * <p>R196: feeding a golden apple to a villager-zombie that carries weakness
 * starts the cure. The enchanted subtype (meta 1) converts in one tick, the
 * plain subtype rolls 3600..6000 ticks ({@code rand.nextInt(2401)+3600}).
 * 1.12 keeps the same machinery on {@code EntityZombieVillager}, whose
 * protected {@code startConverting} is reached through
 * {@link ETIMZombieVillagerInvoker}.</p>
 *
 * <p>Judgement row: {@code [FoodR196Log] applegold cure … [server]}.</p>
 */
public final class ETIMAppleGoldEvents {

    private ETIMAppleGoldEvents() {
    }

    @SubscribeEvent
    public static void onEntityInteract(PlayerInteractEvent.EntityInteract event) {
        if (!ETIMConfig.foodR196Extra || event.getWorld().isRemote) {
            return;
        }
        if (!(event.getTarget() instanceof EntityZombieVillager)) {
            return;
        }
        EntityPlayer player = event.getEntityPlayer();
        ItemStack held = player.getHeldItem(event.getHand());
        if (tryCure(player, held, (EntityZombieVillager) event.getTarget(), "entity_interact")) {
            event.setCanceled(true);
        }
    }

    /** B-65 dev/test entry: shared conversion body (returns true when the cure started). */
    public static boolean tryCure(EntityPlayer player, ItemStack held, EntityZombieVillager zombie, String source) {
        if (held.isEmpty() || held.getItem() != Items.GOLDEN_APPLE) {
            return false;
        }
        if (zombie.isConverting() || !zombie.isPotionActive(MobEffects.WEAKNESS)) {
            return false;
        }
        int ticks = held.getMetadata() == 1 ? 1 : zombie.getRNG().nextInt(2401) + 3600;
        ((ETIMZombieVillagerInvoker) zombie).etim$startConverting(player.getUniqueID(), ticks);
        if (!player.capabilities.isCreativeMode) {
            held.shrink(1);
        }
        ETIMVesselEvents.row("applegold cure meta=" + held.getMetadata() + " ticks=" + ticks
                + " src=" + source + " player=" + player.getName());
        return true;
    }
}
