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
 * ({@code EnchantmentStun.java:14-16}); B-43 :84 landed {@code ETIMItemCudgel}
 * (and club through inheritance), closing the former C-2 cudgel gap; the
 * warhammer half remains as before. The pot root life (D-1, 条 250):
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
        return !stack.isEmpty() && (stack.getItem() instanceof ETIMItemWarHammer
                || stack.getItem() instanceof io.github.etim.etim.metal.ETIMItemCudgel); // B-43 :84 closes C-2 (club inherits)
    }
}
