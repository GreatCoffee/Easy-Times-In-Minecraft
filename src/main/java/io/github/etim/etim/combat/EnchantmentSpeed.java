package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemArmor;
import net.minecraft.item.ItemStack;

/**
 * R196 {@code EnchantmentSpeed} port (id 85; batch enchant1, 条 241-245).
 * R196 faces: {@code Enchantment.java:35} {@code new EnchantmentSpeed(85,
 * EnumRarity.rare, 10)}; carrier {@code ItemBoots}
 * ({@code EnchantmentSpeed.java:14-16}) — 1.12 has no ItemBoots class, so the
 * carrier gate is {@code ItemArmor} with armorType FEET (vanilla leather boots
 * and ETIM plate boots land in the same class hierarchy). Effect
 * {@code 1 + 0.05L} ⇒ ×1.25 walk at L5 ({@code EnchantmentHelper.java:387-389}
 * × {@code PlayerCapabilities:55-60}), applied on the existing walk-speed
 * redirect (MixinEntityPlayer — same return, single extra factor).
 */
public final class EnchantmentSpeed extends ETIMMiteEnchantment {

    public EnchantmentSpeed() {
        super(Rarity.RARE, EnumEnchantmentType.ARMOR_FEET, new EntityEquipmentSlot[]{EntityEquipmentSlot.FEET});
        this.setName("etim_speed");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.speedDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.speedMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        return stack.getItem() instanceof ItemArmor
                && ((ItemArmor) stack.getItem()).armorType == EntityEquipmentSlot.FEET;
    }
}
