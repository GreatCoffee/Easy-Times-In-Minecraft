package io.github.etim.etim.hunger;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemArmor;
import net.minecraft.item.ItemStack;

/**
 * R196 EnchantmentEndurance port (v2+ Endurance product order, F-5-29;
 * verdict playground/audit/endurance-终审回执.md). R196 face:
 * Enchantment.java:45 {@code endurance = new EnchantmentEndurance(95,
 * EnumRarity.uncommon, 10)}; EnchantmentEndurance.java:9-10 four levels,
 * :19-21 {@code canEnchantItem = item instanceof ItemCuirass}, :24-26 combat
 * tab.
 *
 * <p>G4: the R196 ItemCuirass carrier maps to the 1.12 chestplate family
 * ({@code ItemArmor} with slot {@code CHEST}). G5: acquisition follows the
 * TreeFelling precedent (minEnchantability = level × 10, enchanting table;
 * R196's difficulty-10 weighting has no 1.12 counterpart; no loot/trade
 * faces). The modifier readout is {@link ETIMEndurance#getEnduranceModifier}
 * (EnchantmentHelper.java:403-404).</p>
 */
public final class EnchantmentEndurance extends Enchantment {

    public EnchantmentEndurance() {
        super(Rarity.UNCOMMON, EnumEnchantmentType.ARMOR_CHEST, new EntityEquipmentSlot[]{EntityEquipmentSlot.CHEST});
        this.setName("etim_endurance");
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.enduranceMaxLevel;
    }

    @Override
    public int getMinEnchantability(int enchantmentLevel) {
        return enchantmentLevel * 10;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        return stack.getItem() instanceof ItemArmor
                && ((ItemArmor) stack.getItem()).armorType == EntityEquipmentSlot.CHEST;
    }
}
