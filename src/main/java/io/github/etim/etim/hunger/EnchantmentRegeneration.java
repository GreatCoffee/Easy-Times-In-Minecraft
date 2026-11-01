package io.github.etim.etim.hunger;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMMiteEnchantment;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemArmor;
import net.minecraft.item.ItemStack;

/**
 * R196 {@code EnchantmentRegeneration} port (id 86; batch enchant1, 条 241-245).
 * R196 faces: {@code Enchantment.java:36} {@code new
 * EnchantmentRegeneration(86, EnumRarity.rare, 20)} (difficulty 20 —
 * harvest-cost window starts at 11); carrier {@code ItemCuirass}
 * ({@code EnchantmentRegeneration.java:14-16}) — 1.12 has no cuirass class,
 * so the gate is {@code ItemArmor} with armorType CHEST. Effect
 * {@code 1 + 0.5L} ⇒ heal_progress ×3.5 at L5 ({@code EnchantmentHelper.java
 * :391-393}), applied as the FOURTH factor on the ETIM healProgress line
 * (ETIMFoodStats — the R196 order places the regen factor last, after
 * malnourishment and bed).
 */
public final class EnchantmentRegeneration extends ETIMMiteEnchantment {

    public EnchantmentRegeneration() {
        super(Rarity.RARE, EnumEnchantmentType.ARMOR_CHEST, new EntityEquipmentSlot[]{EntityEquipmentSlot.CHEST});
        this.setName("etim_regeneration");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.regenerationDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.regenerationMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        return stack.getItem() instanceof ItemArmor
                && ((ItemArmor) stack.getItem()).armorType == EntityEquipmentSlot.CHEST;
    }
}
