package io.github.etim.etim.combat;

import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnumEnchantmentType;
import net.minecraft.inventory.EntityEquipmentSlot;

/**
 * Shared base for MITE(R196)-style enchantments whose cost curve derives from
 * the R196 difficulty field (batch enchant1, D-8 case M — 条 244).
 *
 * <p>R196 charges a single-gate cost: {@code cost(L) = max(diff−10,0)
 * + diff×(L−1) + 1} ({@code Enchantment.java:124-141}) and derives the level
 * from the table budget by {@code level = (budget+diff−1)/diff}, so the
 * 1.12 translation is a contiguous, gap-free window per level:
 * {@code min(L) = cost(L)}, {@code max(L) = cost(L+1) − 1} (diff-separated;
 * the top level's upper bound is a flush 999 so anvil/book combinations can
 * always close). Under the current 1.12 table ceiling (slot2 budget 30) the
 * diff-10 family reaches L3 and the diff-20 family reaches L1; once the R196
 * pool formula ((1+bookshelves)×4, ContainerEnchantment.java:286) is ported
 * the SAME windows unlock L4/L5 without a rewrite.</p>
 *
 * <p>Levels: R196 {@code Enchantment.java:67-69} defaults {@code getNumLevels}
 * to 5 for all five batch entries (their 23-line classes carry no override) —
 * surfaced as a per-entry {@code maxLevel} config key (piercing precedent,
 * 条 242 C-注2 closed by 纪律 2).</p>
 */
public abstract class ETIMMiteEnchantment extends Enchantment {

    protected ETIMMiteEnchantment(Rarity rarityIn, EnumEnchantmentType typeIn, EntityEquipmentSlot[] slots) {
        super(rarityIn, typeIn, slots);
    }

    /** R196 {@code difficulty} (Enchantment.java:8-45 per id: 10 / 15 / 20). */
    protected abstract int difficulty();

    /** Pool-batch public face (D-1 池批, 条 278): the cfg-live difficulty for the pool windows. */
    public final int difficultyOpen() {
        return this.difficulty();
    }

    /** R196 Enchantment.java:124-141 min-cost formula, max(diff−10,0)+diff×(L−1)+1. */
    @Override
    public int getMinEnchantability(int enchantmentLevel) {
        int diff = difficulty();
        return Math.max(diff - 10, 0) + diff * (enchantmentLevel - 1) + 1;
    }

    /** Case M: the level's window closes exactly where the next level's cost starts (no gap). */
    @Override
    public int getMaxEnchantability(int enchantmentLevel) {
        if (enchantmentLevel >= getMaxLevel()) {
            return 999;
        }
        return getMinEnchantability(enchantmentLevel + 1) - 1;
    }
}
