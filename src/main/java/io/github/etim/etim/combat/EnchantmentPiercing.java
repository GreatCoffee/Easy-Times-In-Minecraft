package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItemBattleAxe;
import io.github.etim.etim.metal.ETIMItemPickaxe;

import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemPickaxe;
import net.minecraft.item.ItemStack;

/**
 * R196 {@code EnchantmentPiercing} port (id 92, batch E / AD-7; verdict
 * {@code playground/audit/ad7-终审回执.md}, 裁定条 94/95). R196 faces:
 * {@code Enchantment.java:42} {@code new EnchantmentPiercing(92,
 * EnumRarity.rare, 10)}; {@code EnchantmentPiercing.java:15} suffix
 * {@code "piercing"}; {@code :19-21} exact-class carrier
 * ({@code getClass() == ItemPickaxe.class || ... ItemBattleAxe.class}); {@code
 * :24-26} combat creative tab (no 1.12 counterpart, dropped).
 *
 * <p>Judged values: the enchantment level is worth that many flat points
 * ({@code EnchantmentHelper.java:43-49} fraction {@code level/5} × 5.0F at
 * {@code Damage.java:218} — javap {@code fdiv}@28 / {@code ldc 5.0f}@203 /
 * {@code fmul}@205), scaled by {@link ETIMConfig#piercingPointsPerLevel}. The
 * acquisition curve is rescaled to the 1.12 table cap of 30 (D-AD7-4):
 * {@code 6×(L−1)+1} / {@code +20}. The carrier gate is an EXACT-class match —
 * {@code instanceof} is forbidden because {@code ETIMItemWarHammer extends
 * ETIMItemPickaxe} (R196 {@code getClass()==} excludes the war hammer).</p>
 *
 * <p>{@code isAllowedOnBooks()} is deliberately NOT overridden: R196's table
 * candidate pool short-circuits on books ({@code EnchantmentHelper.java:336}
 * {@code is_book || canEnchantItem(item)}), so R196 does produce piercing
 * enchanted books, and the 1.12 default {@code true}
 * ({@code enchantment/Enchantment.java:230-233}) is the same shape.</p>
 */
public final class EnchantmentPiercing extends Enchantment {

    public EnchantmentPiercing() {
        super(Rarity.RARE, EnumEnchantmentType.DIGGER, new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_piercing");
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.piercingMaxLevel;
    }

    /** D-AD7-4: 6×(L−1)+1 (1/7/13/19/25) — scaled to 1.12's 30-level table budget. */
    @Override
    public int getMinEnchantability(int enchantmentLevel) {
        return 6 * (enchantmentLevel - 1) + 1;
    }

    @Override
    public int getMaxEnchantability(int enchantmentLevel) {
        return getMinEnchantability(enchantmentLevel) + 20;
    }

    /**
     * D-AD7-5: R196 {@code EnchantmentPiercing.java:19-21} tests the exact class
     * ({@code getClass() == ItemPickaxe.class || ... ItemBattleAxe.class}).
     * {@code instanceof} would admit {@link ETIMItemBattleAxe}'s axe siblings and
     * the war hammer (which extends pickaxe) — the R196 face excludes them.
     */
    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        Class<?> carrier = stack.getItem().getClass();
        return carrier == ETIMItemPickaxe.class
                || carrier == ETIMItemBattleAxe.class
                || carrier == ItemPickaxe.class;
    }
}
