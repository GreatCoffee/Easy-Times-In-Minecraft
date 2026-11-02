package io.github.etim.etim.farm;

import io.github.etim.etim.ETIMConfig;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.enchantment.Enchantment.Rarity;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemHoe;
import net.minecraft.item.ItemStack;

import io.github.etim.etim.combat.ETIMMiteEnchantment;
import io.github.etim.etim.metal.ETIMItemMattock;
import io.github.etim.etim.metal.ETIMItemScythe;

/**
 * R196 {@code EnchantmentFertility} port (id 82; batch farm1/B4,
 * 条 254-257). R196 faces: {@code Enchantment.java:32}
 * {@code new EnchantmentFertility(82, EnumRarity.uncommon, 10)}; carrier
 * {@code ItemHoe ∨ ItemMattock ∨ ItemScythe} ({@code
 * EnchantmentFertility.java:14-16}) — 1.12 摊平 same set (the vanilla hoes
 * and the ETIM metal hoes both ride {@code ItemHoe}; the mattock is the
 * ETIM class; the scythe is the ETIM class). Effect life in
 * {@link ETIMFarm}: tillage roll (F5) + harvest roll (F6) + the put face of
 * the fertilized TE (F11). The value faces (getGrowthChance boost,
 * consume, trample) live on the farmland side and apply once set.
 */
public final class EnchantmentFertility extends ETIMMiteEnchantment {

    public EnchantmentFertility() {
        super(Rarity.UNCOMMON, EnumEnchantmentType.DIGGER,
                new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_fertility");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.fertilityDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.fertilityMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        Item item = stack.getItem();
        return item instanceof ItemHoe || item instanceof ETIMItemMattock || item instanceof ETIMItemScythe;
    }
}
