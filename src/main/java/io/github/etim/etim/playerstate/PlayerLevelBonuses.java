package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIM;
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
 * modifier. ❗F-4-19（第二批裁点6=A，改码）：R196 getLevelModifier
 * (EntityPlayer:624-626) = {@code level > 0 && kind == MELEE_DAMAGE
 * ? level×0.005F : level×0.02F} — the POSITIVE melee ladder uses 0.005
 * (the {@code meleeDamagePerLevel} key, default aligned), but EVERY
 * non-positive level uses 0.02 across all three kinds (0.02F is an A 级
 * 直引 constant, no config key). Debt levels now take the full R196
 * melee penalty (−20% at debt 10, was −5%). The 勘误 #9 附注 (0.005 vs
 * 0.02 deviation declaration) is superseded by this alignment.</p>
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
            float bonus;
            if (attacker.experienceLevel > 0) {
                bonus = 1.0F + attacker.experienceLevel * ETIMConfig.meleeDamagePerLevel;
            } else {
                // ❗F-4-19: R196 :625 negative/non-positive branch — 0.02 flat,
                // melee included (debt levels are NOT softened).
                bonus = 1.0F + attacker.experienceLevel * 0.02F;
            }
            if (ETIMConfig.mobDebugLog) {
                // F-4-19 判据行（第二批）：负级近战系数实测对账用。
                ETIM.LOGGER.info("[MobLog] level-modifier lvl={} melee bonus={}", attacker.experienceLevel, bonus);
            }
            event.setAmount(event.getAmount() * bonus);
        }
    }
}
