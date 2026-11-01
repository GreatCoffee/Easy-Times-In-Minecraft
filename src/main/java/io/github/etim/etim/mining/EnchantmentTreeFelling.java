package io.github.etim.etim.mining;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItemHatchet;
import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemAxe;
import net.minecraft.item.ItemStack;

/**
 * EnchantmentTreeFelling port (MITE id 83, uncommon, difficulty 10). Level
 * on the held axe = number of wood blocks removed straight up, each removed
 * through the full per-log harvesting verdict (ETIMTreeFelling).
 */
public final class EnchantmentTreeFelling extends Enchantment {

    public EnchantmentTreeFelling() {
        super(Rarity.UNCOMMON, EnumEnchantmentType.DIGGER, new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_tree_felling");
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.treeFellingMaxLevel;
    }

    @Override
    public int getMinEnchantability(int enchantmentLevel) {
        return enchantmentLevel * 10;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        // R196 EnchantmentTreeFelling.java:14-16: `item instanceof ItemAxe &&
        // !(item instanceof ItemHatchet)` — the book/forge hook casts the same
        // exclusion over our ETIMItemHatchet (which extends ETIMItemAxe, so a
        // bare ItemAxe check wrongly admits it). Batch E / D-3, 条 232.
        return !stack.isEmpty()
                && stack.getItem() instanceof ItemAxe
                && !(stack.getItem() instanceof ETIMItemHatchet);
    }
}
