package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.enchantment.Enchantment.Rarity;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemStack;

import io.github.etim.etim.metal.ETIMItemDagger;
import io.github.etim.etim.metal.ETIMItemKnifeFlint;

/**
 * R196 {@code EnchantmentButchering} port (id 94; batch B5,
 * audit20 条 262-265). R196 faces: {@code Enchantment.java:44}
 * {@code new EnchantmentButchering(94, EnumRarity.uncommon, 10)};
 * {@code getNumLevels()=3} (EnchantmentButchering.java:9-11 — NOT 5,
 * unlike fertility/harvesting); carrier
 * {@code item.getClass() == ItemKnife.class || item.getClass() == ItemDagger.class}
 * (:19-21, EXACT class) → 1.12 flattened to the two ETIM concrete classes
 * ({@link ETIMItemKnifeFlint} flint knife + {@link ETIMItemDagger} metal
 * daggers — zero ETIM subclasses of either, 终审亲点). Effect life:
 * {@link ETIMButchering} (formulas + [ButchLog]) via
 * {@link ETIMButcheringEvents} (zero-mixin LivingDropsEvent, D-1 乙 条 264).
 * The face is an INTEGER level read (R196 EnchantmentHelper:399-400) —
 * {@code maxLevel} is a cap only, NOT a probability denominator (F2 — the
 * farm1 key difference).
 */
public final class EnchantmentButchering extends ETIMMiteEnchantment {

    public EnchantmentButchering() {
        super(Rarity.UNCOMMON, EnumEnchantmentType.WEAPON,
                new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_butchering");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.butcheringDifficulty;
    }

    /** R196 getNumLevels()=3 — a cap, never a denominator (条 264 D-6). */
    @Override
    public int getMaxLevel() {
        return ETIMConfig.butcheringMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        Class<?> cls = stack.getItem().getClass();
        return cls == ETIMItemKnifeFlint.class || cls == ETIMItemDagger.class;
    }
}
