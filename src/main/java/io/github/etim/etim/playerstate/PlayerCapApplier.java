package io.github.etim.etim.playerstate;

import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.FoodStats;

/**
 * Applies the level-scaled caps (task 1.2) to a player:
 * health attribute and hunger clamp.
 *
 * <p>Health cap: the MAX_HEALTH attribute base value is derived from the
 * player's level; vanilla then syncs the attribute and the client HUD
 * (GuiIngameForge) derives the number of hearts from it automatically.</p>
 *
 * <p>Food cap: vanilla has no max for foodLevel (20 is hardcoded in
 * FoodStats.addStats), so the cap is enforced by clamping every tick.
 * Falling below the cap (hunger drain) is untouched.</p>
 *
 * <p>Loaded on both sides; every entry point is either side-safe pure
 * state or server-guarded by the caller. Keeps dedicated servers clean.</p>
 */
public final class PlayerCapApplier {

    private PlayerCapApplier() {
    }

    /**
     * Server-side per-tick hook: applies caps when the level changed
     * since the last tick and clamps the food level every tick.
     */
    public static void onServerPlayerTick(EntityPlayer player) {
        int current = player.experienceLevel;

        if (current != PlayerLevelTracker.getTracked(player)) {
            PlayerLevelTracker.setTracked(player, current);
            applyCaps(player);
        }

        clampFood(player);
    }

    /** Forces the health attribute and food level to the level cap. */
    public static void applyCaps(EntityPlayer player) {
        int cap = PlayerStatLimits.getHealthFoodCap(player.experienceLevel);

        // MAX_HEALTH drives the HUD heart count on the client
        // (GuiIngameForge derives healthRows from it).
        IAttributeInstance attribute = player.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH);
        double previous = attribute.getBaseValue();
        if (previous != cap) {
            attribute.setBaseValue(cap);
            // MITE: a raised limit grants the growth as immediate HP
            // (R196 EntityPlayer heals the difference on level-up).
            if (cap > previous) {
                player.heal((float) (cap - previous));
            }
        }
        // A level drop (enchanting; future death penalty) can shrink the cap
        // below the current health — vanilla does not clamp on its own.
        if (player.getHealth() > cap) {
            player.setHealth(cap);
        }
        clampFood(player);
    }

    /** Clamps the food level to the level cap (saturation <= foodLevel). */
    public static void clampFood(EntityPlayer player) {
        FoodStats food = player.getFoodStats();
        int cap = PlayerStatLimits.getHealthFoodCap(player.experienceLevel);
        if (food.getFoodLevel() > cap) {
            food.setFoodLevel(cap);
            if (food.getSaturationLevel() > cap) {
                food.setFoodSaturationLevel(cap);
            }
        }
    }
}
