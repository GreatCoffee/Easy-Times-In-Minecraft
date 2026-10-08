package io.github.etim.etim.playerstate;

import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraftforge.event.entity.living.LivingHurtEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * Per-level performance bonuses (task 1.2):
 * +2% mining speed and +0.5% melee damage per level.
 *
 * <p>{@link LivingHurtEvent} fires before armor reduction
 * (EntityLivingBase.damageEntity), so the multiplier applies to the raw
 * melee damage, matching the MITE semantics of a per-level combat
 * modifier. Negative levels (future death penalty) naturally reduce.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class PlayerLevelBonuses {

    /** Mining speed bonus fraction per level (2%). */
    public static final float MINING_PER_LEVEL = 0.02F;
    /** Melee damage bonus fraction per level (0.5%). */
    public static final float MELEE_PER_LEVEL = 0.005F;

    private PlayerLevelBonuses() {
    }

    @SubscribeEvent
    public static void onBreakSpeed(PlayerEvent.BreakSpeed event) {
        float bonus = 1.0F + event.getEntityPlayer().experienceLevel * MINING_PER_LEVEL;
        event.setNewSpeed(event.getNewSpeed() * bonus);
    }

    @SubscribeEvent
    public static void onLivingHurt(LivingHurtEvent event) {
        if (event.getSource().getTrueSource() instanceof EntityPlayer) {
            EntityPlayer attacker = (EntityPlayer) event.getSource().getTrueSource();
            float bonus = 1.0F + attacker.experienceLevel * MELEE_PER_LEVEL;
            event.setAmount(event.getAmount() * bonus);
        }
    }
}
