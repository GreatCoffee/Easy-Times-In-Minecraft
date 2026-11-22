package io.github.etim.etim.item;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemStack;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * B-65 · 容器实体臂的事件桥（D-3 = A）。
 *
 * <p>1.12 没有「物品对实体右键」的原生虚方法，这里用
 * {@code PlayerInteractEvent.EntityInteract} 统一转发到
 * {@link ETIMItemVessel#etimTryEntityInteraction}：挤奶 / 喂水 /
 * 灭火三臂共用同一条入口，避免每个物品各写一遍右键判定。</p>
 *
 * <p>判据行：{@code [FoodR196Log] <action> … [server]}。</p>
 */
public final class ETIMVesselEvents {

    private ETIMVesselEvents() {
    }

    @SubscribeEvent
    public static void onEntityInteract(PlayerInteractEvent.EntityInteract event) {
        if (!ETIMConfig.foodR196Extra || event.getWorld().isRemote) {
            return;
        }
        EntityPlayer player = event.getEntityPlayer();
        ItemStack held = player.getHeldItem(event.getHand());
        if (held.isEmpty() || !(held.getItem() instanceof ETIMItemVessel)) {
            return;
        }
        ETIMItemVessel vessel = (ETIMItemVessel) held.getItem();
        if (vessel.etimTryEntityInteraction(event.getTarget(), player, held, event.getHand(), "entity_interact")) {
            event.setCanceled(true);
        }
    }

    /** 判据行统一出口（浮点由调用方按 Locale.ROOT 格式化）。 */
    public static void row(String line) {
        ETIM.LOGGER.info("[FoodR196Log] {} [server]", line);
    }
}

