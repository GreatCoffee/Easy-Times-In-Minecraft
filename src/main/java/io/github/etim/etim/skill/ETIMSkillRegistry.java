package io.github.etim.etim.skill;

import java.util.HashMap;
import java.util.Map;

import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;

/**
 * Item-to-skill-set registry. The anvil repair gate is the first consumer;
 * addons can register their own repair carriers without touching the gate.
 * An empty/zero mask means "no skill requirement" and keeps the vanilla
 * behavior.
 */
public final class ETIMSkillRegistry {

    private static final Map<Item, Integer> REPAIR_MASKS = new HashMap<Item, Integer>();

    private ETIMSkillRegistry() {
    }

    public static void registerRepair(ETIMSkill skill, Item... items) {
        if (skill == null || items == null) {
            return;
        }
        for (Item item : items) {
            registerRepair(item, skill.mask());
        }
    }

    public static void registerRepair(ETIMSkill skill, Iterable<Item> items) {
        if (skill == null || items == null) {
            return;
        }
        for (Item item : items) {
            registerRepair(item, skill.mask());
        }
    }

    public static void registerRepair(Item item, ETIMSkill... skills) {
        if (item == null) {
            return;
        }
        registerRepair(item, ETIMSkill.maskOf(skills));
    }

    public static void registerRepair(Item item, int mask) {
        if (item == null || mask == 0) {
            return;
        }
        REPAIR_MASKS.put(item, mask);
    }

    /** The required repair-skill mask for this stack, or 0 for no gate. */
    public static int repairMask(ItemStack stack) {
        if (stack == null || stack.isEmpty()) {
            return 0;
        }
        Integer mask = REPAIR_MASKS.get(stack.getItem());
        return mask == null ? 0 : mask;
    }
}
