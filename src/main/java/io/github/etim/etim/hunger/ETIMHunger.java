package io.github.etim.etim.hunger;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemShears;
import net.minecraft.item.ItemTool;
import net.minecraft.util.text.TextComponentTranslation;

/**
 * R196 hunger penetration checks (task 2.3), pulled out of the phase-2.2
 * mining helper so every penalty reads ONE predicate. Since task 1.5 the
 * predicate reads the R196 dual-pool model ({@code ETIMFoodStats}; the
 * vanilla bar is only its client mirror).
 *
 * <p>R196 source (decompile):
 * <ul>
 *   <li>{@code EntityPlayer.hasFoodEnergy()} = satiation + nutrition &gt; 0
 *       (EntityPlayer.java:1928-1929).</li>
 *   <li>Weak strike: {@code EntityPlayer.canOnlyPerformWeakStrike()}
 *       (EntityPlayer.java:2789-2791) — bare hands only, and health below
 *       2.0 or no food energy triggers it.</li>
 *   <li>Hand-preventing items: {@code Item.preventsHandDamage()} —
 *       {@code this instanceof ItemTool || this == stick || this == bone}
 *       (Item.java:1903-1904); R196 ItemsSword/Shears extend ItemTool so
 *       the 1.12 branches list them explicitly.</li>
 * </ul></p>
 */
public final class ETIMHunger {

    /**
     * R196 {@code hasFoodEnergy} — reads the dual pools on the server, the
     * vanilla mirror on the client (see {@link ETIMFoodStats#hasFoodEnergy}).
     * With {@code ETIMConfig.foodModel} off this is the vanilla bar itself,
     * the pre-1.5 standing.
     */
    public static boolean hasFoodEnergy(EntityPlayer player) {
        if (ETIMConfig.foodModel) {
            return ETIMFoodStats.hasFoodEnergy(player);
        }
        return player.getFoodStats().getFoodLevel() > 0
                || player.getFoodStats().getSaturationLevel() > 0;
    }

    /** R196 {@code canOnlyPerformWeakStrike} (EntityPlayer.java:2789-2791). */
    public static boolean canOnlyPerformWeakStrike(EntityPlayer player) {
        if (isHoldingItemThatPreventsHandDamage(player)) {
            return false;
        }
        if (player.getHealth() < ETIMConfig.weakStrikeHealthThreshold) {
            return true;
        }
        if (!hasFoodEnergy(player)) {
            return true;
        }
        return player.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue() < 1.0;
    }

    /** R196 {@code Item.preventsHandDamage()} held-side check (Item.java:1903-1904). */
    public static boolean isHoldingItemThatPreventsHandDamage(EntityPlayer player) {
        ItemStack held = player.getHeldItemMainhand();
        if (held.isEmpty()) {
            return false;
        }
        // R196 ItemTool covers sword + shears too (they extend ItemTool);
        // vanilla 1.12 keeps them separate classes, so list them.
        return held.getItem() instanceof ItemTool
                || held.getItem() instanceof ItemSword
                || held.getItem() instanceof ItemShears
                || held.getItem() == Items.STICK
                || held.getItem() == Items.BONE;
    }

    /** Action-bar feedback for a hunger-denied action (debug channel). */
    public static void sendDeniedFeedback(EntityPlayer player, String key) {
        if (ETIMConfig.hungerDenialFeedback) {
            player.sendStatusMessage(new TextComponentTranslation(key), true);
        }
    }

    private ETIMHunger() {
    }
}
