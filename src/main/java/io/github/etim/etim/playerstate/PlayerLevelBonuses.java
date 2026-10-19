package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraftforge.event.entity.living.LivingHurtEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * Per-level performance bonuses (task 1.2):
 * +2% mining speed and +0.5% melee damage per level (configurable).
 *
 * <p>{@link LivingHurtEvent} fires before armor reduction
 * (EntityLivingBase.damageEntity), so the multiplier applies to the raw
 * melee damage, matching the MITE semantics of a per-level combat
 * modifier. Negative levels (future death penalty) naturally reduce.
 * audit20 勘误 #9（裁定回执 §三）：negative level 系数 = 0.005（本文件实现）vs R196 0.02
 * ——偏差在此声明（原声明仅在 javadoc 之外；裁定不改码，0.005 为准）。</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class PlayerLevelBonuses {

    private PlayerLevelBonuses() {
    }

    @SubscribeEvent
    public static void onBreakSpeed(PlayerEvent.BreakSpeed event) {
        EntityPlayer player = event.getEntityPlayer();
        float bonus = 1.0F + player.experienceLevel * ETIMConfig.miningSpeedPerLevel;
        event.setNewSpeed(event.getNewSpeed() * bonus);
    }

    @SubscribeEvent
    public static void onLivingHurt(LivingHurtEvent event) {
        if (event.getSource().getTrueSource() instanceof EntityPlayer) {
            EntityPlayer attacker = (EntityPlayer) event.getSource().getTrueSource();
            float bonus = 1.0F + attacker.experienceLevel * ETIMConfig.meleeDamagePerLevel;
            event.setAmount(event.getAmount() * bonus);
        }
    }
}
