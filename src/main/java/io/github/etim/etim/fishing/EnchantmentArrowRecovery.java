package io.github.etim.etim.fishing;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMMiteEnchantment;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.enchantment.Enchantment.Rarity;
import net.minecraft.inventory.EntityEquipmentSlot;

/**
 * R196 {@code EnchantmentArrowRecovery} (id 51, uncommon, difficulty 10 —
 * batch five, audit20 条 268-271). NO getNumLevels override ⇒ the five
 * level default rides the cfg maximum; the joint-roll face reads an
 * INTEGER level ({@code r(divisor) < L} in
 * {@link ETIMArrowRecovery}). Carrier = {@code instanceof ItemBow} (family
 * shape — the vanilla bow and any subclass). The contained-item base chance
 * (per-arrowhead c_mat) lives with the enchantment OFF the roll — the
 * enchantment just lifts the guaranteed band (条 271 判读位: the default
 * c face rides on regardless of the enchantment).
 */
public final class EnchantmentArrowRecovery extends ETIMMiteEnchantment {

    public EnchantmentArrowRecovery() {
        super(Rarity.UNCOMMON, EnumEnchantmentType.BOW,
                new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_arrow_recovery");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.arrowRecoveryDifficulty;
    }

    /** cfg cap only (arrowRecoveryMaxLevel, default 5). */
    @Override
    public int getMaxLevel() {
        return ETIMConfig.arrowRecoveryMaxLevel;
    }
}
