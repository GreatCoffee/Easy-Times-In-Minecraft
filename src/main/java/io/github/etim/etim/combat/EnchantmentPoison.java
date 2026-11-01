package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemBow;
import net.minecraft.item.ItemStack;

/**
 * R196 {@code EnchantmentPoison} port (id 90; batch enchant1, 条 241-245).
 * R196 faces: {@code Enchantment.java:40} {@code new EnchantmentPoison(90,
 * EnumRarity.rare, 10)}; carrier {@code ItemBow}
 * ({@code EnchantmentPoison.java:14-16}). Effect per R196
 * {@code EntityArrow:443-451}: {@code rand.nextFloat() < L/5} then
 * {@code PotionEffect(POISON, 160 + round(240×L/5), 0)}. The effect itself
 * is the CASE-A self-owned potion {@link ETIMPotionPoison} (条 243/245):
 * copying vanilla 1.12 {@code MobEffects.POISON} would yield a 4×-strength
 * unharm-by-poison face (25-tick interval + {@code health>1.0F} guard vs
 * R196's 100-tick + gate-less); the handler lives on the shared
 * {@code EntityArrow.arrowHit} hook (MixinEntityArrow) so metal, vanilla and
 * tipped arrows all get the face (裁定 ④).
 */
public final class EnchantmentPoison extends ETIMMiteEnchantment {

    public EnchantmentPoison() {
        super(Rarity.RARE, EnumEnchantmentType.BOW, new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_poison");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.poisonDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.poisonMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        return !stack.isEmpty() && stack.getItem() instanceof ItemBow;
    }
}
