package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemBow;
import net.minecraft.item.ItemStack;

/**
 * R196 {@code EnchantmentQuickness} port (id 88; batch enchant1, 条 241-245).
 * R196 faces: {@code Enchantment.java:38} {@code new EnchantmentQuickness(88,
 * EnumRarity.uncommon, 10)}; carrier {@code ItemBow}
 * ({@code EnchantmentQuickness.java:14-16}). Effect: the draw denominator
 * {@code getTicksForMaxPull = 20 − round(10×L/5)} ({@code ItemBow.java:35-37})
 * — the 1.12 table is {@code velocity = charge / d} with the SAME polynomial
 * and clamp ({@code ItemBow.java:175-186}), so the ported face replaces the
 * constant 20 denominator with {@code d(L)} via MixinItemBow (case A redirect,
 * 摸底 §2.2). L5 = full draw in 10 ticks (no crit loss: {@code f == 1.0F}
 * exact at {@code charge = d}).
 */
public final class EnchantmentQuickness extends ETIMMiteEnchantment {

    public EnchantmentQuickness() {
        super(Rarity.UNCOMMON, EnumEnchantmentType.BOW, new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_quickness");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.quicknessDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.quicknessMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        return !stack.isEmpty() && stack.getItem() instanceof ItemBow;
    }
}
