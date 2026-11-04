package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.enchantment.Enchantment.Rarity;
import net.minecraft.inventory.EntityEquipmentSlot;

/**
 * R196 {@code EnchantmentFreeAction} (id 87, uncommon, difficulty 10 — D-C
 * 甲收编, 条 276/277): the leg armor pool entry, 4 levels native
 * ({@code getNumLevels} override 一手). Carrier = the leggings slot only.
 *
 * <p>The EFFECT face (R196 moveSlowdown potion shreds {@code ×(1−L×0.8/4)} —
 * Potion.java:244-249 + the paralysis-resistance face :1255) IS NOT in this
 * batch: it needs an extra mixin on {@code Potion.applyAttributesModifiersToEntity}
 * which would break the 终审 B-18 mixin-count prophecy (64+10). Registered
 * 债面 in 条 278 — the level 1..4 lands carry case-M windows and池 membership
 * only until the effect batch lands.</p>
 */
public final class EnchantmentFreeAction extends ETIMMiteEnchantment {

    public EnchantmentFreeAction() {
        super(Rarity.UNCOMMON, EnumEnchantmentType.ARMOR_LEGS,
                new EntityEquipmentSlot[]{EntityEquipmentSlot.LEGS});
        this.setName("etim_free_action");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.freeActionDifficulty;
    }

    /** R196 EnchantmentFreeAction.java:9-11 — 4 levels native, cfg cap only. */
    @Override
    public int getMaxLevel() {
        return ETIMConfig.freeActionMaxLevel;
    }
}
