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
 * R196 {@code EnchantmentHarvesting} port (id 93; batch farm1/B4,
 * 条 254-257). R196 faces: {@code Enchantment.java:43}
 * {@code new EnchantmentHarvesting(93, EnumRarity.uncommon, 10)}; carrier
 * {@code ItemScythe ∨ ItemHoe ∨ ItemMattock} ({@code
 * EnchantmentHarvesting.java:14-16} — the same set as fertility, different
 * listing order). Effect life in {@code ETIMFarmingEvents.onHarvestDrops}
 * (F4/D-8): the yield bonus rides HarvestDropsEvent — expected
 * {@code quantity × (1 + fraction × 0.5)}, quantity per R196 crop classes;
 * 十二 note (D-4): only the ENCHANT INCREMENT is judged, the 1.12 base
 * quantity differs by structure (wheat 1, root crops vanilla band) — the
 * declaration lives in the verdict head, the multiplier faces identical.
 */
public final class EnchantmentHarvesting extends ETIMMiteEnchantment {

    public EnchantmentHarvesting() {
        super(Rarity.UNCOMMON, EnumEnchantmentType.DIGGER,
                new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_harvesting");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.harvestingDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.harvestingMaxLevel;
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
