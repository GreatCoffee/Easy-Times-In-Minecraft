package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItemWarHammer;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemStack;

/**
 * R196 {@code EnchantmentStun} port (id 80; batch melee1/B2, 条 249-251).
 * R196 faces: {@code Enchantment.java:30} {@code new EnchantmentStun(80,
 * EnumRarity.uncommon, 15)}; carrier {@code ItemCudgel}∨{@code ItemWarHammer}
 * ({@code EnchantmentStun.java:14-16}) — ETIM has no cudgel class (C-2, the
 * warhammer half only), and {@code ETIMItemWarHammer} is the judged carrier
 * (roster :224). The pot root life (D-1, 条 250):
 * {@code stunAmplifierPerLevel} defaults to 6 so a 1.12 slowness attribute
 * lands ×0 at L1 — the same player-perceivable exit as R196
 * ({@code EntityLivingBase:2075-2094}, full-paralysis lane). Effect life in
 * {@link ETIMMelee#applyStun}.
 */
public final class EnchantmentStun extends ETIMMiteEnchantment {

    public EnchantmentStun() {
        super(Rarity.UNCOMMON, EnumEnchantmentType.WEAPON,
                new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_stun");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.stunDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.stunMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        return !stack.isEmpty() && stack.getItem() instanceof ETIMItemWarHammer;
    }
}
