package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.ai.attributes.IAttributeInstance;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.player.EntityPlayer;

/**
 * Applies the level-scaled health cap (task 1.2) to a player:
 * the MAX_HEALTH attribute base value.
 *
 * <p>Health cap: the MAX_HEALTH attribute base value is derived from the
 * player's level; vanilla then syncs the attribute and the client HUD
 * (GuiIngameForge) derives the number of hearts from it automatically.</p>
 *
 * <p>The old vanilla food-bar clamp is gone with task 1.5: the food cap is
 * the R196 per-pool limit already applied inside {@code ETIMFoodStats} (and
 * the write-through clamps the mirrored bar).</p>
 *
 * <p>Loaded on both sides; every entry point is either side-safe pure
 * state or server-guarded by the caller. Keeps dedicated servers clean.</p>
 */
public final class PlayerCapApplier {

    private PlayerCapApplier() {
    }

    /**
     * Server-side per-tick hook: applies caps when the level changed
     * since the last tick.
     */
    public static void onServerPlayerTick(EntityPlayer player) {
        int current = player.experienceLevel;

        if (current != PlayerLevelTracker.getTracked(player)) {
            PlayerLevelTracker.setTracked(player, current);
            applyCaps(player);
        }
    }

    /** Forces the health attribute to the level cap. */
    public static void applyCaps(EntityPlayer player) {
        int cap = PlayerStatLimits.getHealthFoodCap(player.experienceLevel);
        float healthBefore = player.getHealth();

        // MAX_HEALTH drives the HUD heart count on the client
        // (GuiIngameForge derives healthRows from it).
        IAttributeInstance attribute = player.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH);
        double previous = attribute.getBaseValue();
        if (previous != cap) {
            attribute.setBaseValue(cap);
            // capend D-1: false = R196 level-path reality (the :1859-1861 heal is
            // unreachable because EntityPlayer:1824 unconditionally suppresses it,
            // javap-verified); true = the ETIM level-up top-up carried in the
            // spirit of the EntityLivingBase:112-121 attribute-cap re-heal.
            if (ETIMConfig.playerHealOnLevelUp && cap > previous) {
                player.heal((float) (cap - previous));
            }
        }
        // A level drop (enchanting; future death penalty) can shrink the cap
        // below the current health — vanilla does not clamp on its own.
        if (player.getHealth() > cap) {
            player.setHealth(cap);
        }
        CapLog.log(player, cap, previous, healthBefore);
    }
}
