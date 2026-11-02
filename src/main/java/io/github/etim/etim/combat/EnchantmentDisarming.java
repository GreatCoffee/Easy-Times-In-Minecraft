package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItemSword;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemStack;

/**
 * R196 {@code EnchantmentDisarming} port (id 91; batch melee1/B2,
 * 条 249-251). R196 faces: {@code Enchantment.java:41}
 * {@code new EnchantmentDisarming(91, EnumRarity.rare, 10)}; carrier
 * {@code item.getClass() == ItemSword.class} ({@code EnchantmentDisarming
 * :14-16}) — the EXACT class face (roster :226 pass judgment): ETIM's
 * {@code ETIMItemDagger extends ETIMItemSword} is excluded by {@code getClass()},
 * and the vanilla swords ride the same exact class. Effect (伤前 disarm,
 * C-1 mob-only) in {@link ETIMMelee#applyDisarming}; the 40-tick lock rides
 * {@code MixinEntityLivingDisarm} (B-3 four-host injection).
 */
public final class EnchantmentDisarming extends ETIMMiteEnchantment {

    public EnchantmentDisarming() {
        super(Rarity.RARE, EnumEnchantmentType.WEAPON,
                new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_disarming");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.disarmingDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.disarmingMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        Class<?> cls = stack.getItem().getClass();
        return cls == ItemSword.class || cls == ETIMItemSword.class;
    }
}
