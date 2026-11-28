package io.github.etim.etim.combat;

/**
 * R196 附魔台预算放大的纯算术（B-70VA）。
 *
 * <p>对应 R196 {@code EnchantmentHelper.getEnchantmentLevelsAlteredByItemEnchantability}
 * （:225-250）：物品附魔性 E 以下原样，E..2E 每点 +0.5，2E..3E 每点 +0.25，
 * 之后截断，最后 {@code Math.round}。</p>
 */
public final class EnchantGates {

    private EnchantGates() {
    }

    public static int altered(int levels, int enchantability) {
        int e = enchantability;
        if (e < 1) {
            return 0;
        }
        if (levels <= e) {
            return levels;
        }
        float altered = e;
        for (int i = e + 1; i <= levels; i++) {
            if (i <= e * 2) {
                altered += 0.5F;
            } else {
                if (i > e * 3) {
                    break;
                }
                altered += 0.25F;
            }
        }
        return Math.round(altered);
    }
}
