package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItemScythe;
import io.github.etim.etim.metal.ETIMMetals;

import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemStack;

/**
 * R196 {@code EnchantmentVampiric} port (id 84; batch melee1/B2, 条 249-251).
 * R196 faces: {@code Enchantment.java:34} {@code new EnchantmentVampiric(84,
 * EnumRarity.epic, 20)}; carrier {@code ItemSword}∨{@code ItemScythe} with
 * the silver/mithril <em>tool-material</em> exclusion
 * ({@code EnchantmentVampiric:15-20} — D-2 passes it through verbatim: 6
 * ETIM weapons illusory, the same-table top-tier metals). 1.12 flattening
 * (B-2, {@code ItemSword extends Item}): the metal reads from the
 * {@code ETIMMetalGear#etimMetal} accessor — NOT from the vanilla tool
 * material (ETIM tools ride {@code IRON} throughout, F4). Effect life in
 * {@link ETIMMelee#applyVampiric}.
 */
public final class EnchantmentVampiric extends ETIMMiteEnchantment {

    public EnchantmentVampiric() {
        super(Rarity.VERY_RARE, EnumEnchantmentType.WEAPON,
                new EntityEquipmentSlot[]{EntityEquipmentSlot.MAINHAND});
        this.setName("etim_vampiric");
    }

    @Override
    protected int difficulty() {
        return ETIMConfig.vampiricDifficulty;
    }

    @Override
    public int getMaxLevel() {
        return ETIMConfig.vampiricMaxLevel;
    }

    @Override
    public boolean canApplyAtEnchantingTable(ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        Item item = stack.getItem();
        // R196 :15-20 — the silver/mithril TOOL exclusion, read straight from
        // the metal gear (B-1 accessor; the vanilla tool material is a lie).
        if (item instanceof io.github.etim.etim.metal.ETIMMetalGear) {
            ETIMMetals m = ((io.github.etim.etim.metal.ETIMMetalGear) item).etimMetal();
            if (m == ETIMMetals.SILVER || m == ETIMMetals.MITHRIL) {
                return false;
            }
        }
        return item instanceof ItemSword || item instanceof ETIMItemScythe;
    }
}
