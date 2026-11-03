package io.github.etim.etim.fishing;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMMiteEnchantment;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.enchantment.Enchantment.Rarity;
import net.minecraft.inventory.EntityEquipmentSlot;

/**
 * R196 {@code EnchantmentFishingFortune} (id 81, common, difficulty 10 —
 * batch five, audit20 条 268-271). NO getNumLevels override ⇒ the R196 five
 * level default (Enchantment.java:67-69) rides the per-entry cfg maximum;
 * the level is consumed as an INTEGER cascade multiplier (effect = the bite
 * chance gets ×9/10 per level — 名义 fortune 实质咬率, NOT a quantity/
 * quality face). Carrier face = {@code instanceof ItemFishingRod} (family
 * shape — vanilla rods included; the ETIM nine rods are the judged
 * carriers). 案 M cost window: the base class face (max(diff−10,0)+diff×(L−1)+1).
 */
public final class EnchantmentFishingFortune extends ETIMMiteEnchantment {

    public EnchantmentFishingFortune() {
        super(Rarity.COMMON, EnumEnchantmentType.FISHING_ROD,
                new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_fishing_fortune");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.fishingFortuneDifficulty;
    }

    /** cfg cap only (fishingFortuneMaxLevel, default 5) — never a denominator. */
    @Override
    public int getMaxLevel() {
        return ETIMConfig.fishingFortuneMaxLevel;
    }
}
