package io.github.etim.etim.furnace;

import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;

import java.util.HashMap;
import java.util.Map;

/**
 * Stage 4 batch C prelude: the R196 per-item smelt XP rewards (audit 9
 * §1.4 table, "metal 锭 XP 表全数核清" — the 9B cross-check kept them PASS).
 * R196 reads {@code Item.getExperienceReward(n)} (Item.java:347-351 static
 * registrations) and spawns ONE orb {@code reward × taken} at the player
 * (y+0.5 / z+0.5, 9B §4.2 javap dadd offsets) with NO vanilla random split
 * and NO creative reduction — every take pays the same.
 *
 * <p>Vanilla-instance rows first (the R196 judgment values pinned on the
 * identical vanilla items); the five mod-metal rows pre-wire for batch B's
 * content (copper/silver/mithril/adamantium/ancient-metal items land there
 * and pick their judged numbers up verbatim).</p>
 */
public final class FurnaceXpRewards {

    private static final Map<Item, Integer> REWARDS = new HashMap<>();

    private static boolean enabled = true;

    static {
        put(Items.IRON_INGOT, 10);
        put(Items.GOLD_INGOT, 20);
        put(Items.DIAMOND, 30);
        put(Items.EMERALD, 20);
        put(Items.QUARTZ, 10);
        put(Items.REDSTONE, 5);   // ItemRedstone:8 — redstone ore smelts ×4 → reward ×4 = 20 per ore
        put(Items.DYE, 0);        // lapis dye row: no R196 reward row → pay nothing
        // Batch-B metal rows (config-able later if judgment drifts):
        // copper 10 / silver 15 / mithril 40 / ancient 20 / adamantium 100.
    }

    private static void put(Item item, int reward) {
        REWARDS.put(item, reward);
    }

    /** Called from ETIMConfig.init. */
    public static void setEnabled(boolean value) {
        enabled = value;
    }

    public static boolean isEnabled() {
        return enabled;
    }

    /** R196 reward of n pieces of a take (0 = nothing to spawn). */
    public static int rewardOf(ItemStack stack, int taken) {
        if (stack.isEmpty()) {
            return 0;
        }
        Integer reward = REWARDS.get(stack.getItem());
        return reward == null ? 0 : reward * taken;
    }
}
