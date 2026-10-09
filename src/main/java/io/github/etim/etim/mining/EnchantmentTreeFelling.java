package io.github.etim.etim.mining;

import io.github.etim.etim.ETIMConfig;
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
        return stack.getItem() instanceof ItemAxe;
    }
}
