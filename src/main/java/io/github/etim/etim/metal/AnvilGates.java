package io.github.etim.etim.metal;

/**
 * 铁砧修理的材料耐久表（B-70UV）。
 *
 * <p>R196 {@code Item.getRepairItem :1229-1246} 的七金属珠耐久列：
 * 铜/银/金 4、铁（与锈铁共用铁珠）8、古金属 16、秘银 64、精金 256。
 * 未登记的物品保留 {@code Float.MAX_VALUE}（材料不耐久，预算直接封顶）。</p>
 */
public final class AnvilGates {

    private AnvilGates() {
    }

    /** 一颗金属珠的材料耐久；{@code null} 表示不是修理材料。 */
    public static float nuggetDurability(ETIMMetals metal) {
        if (metal == null) {
            return Float.MAX_VALUE;
        }
        switch (metal) {
            case COPPER:
            case SILVER:
            case GOLD:
                return 4.0F;
            case RUSTED_IRON:
                // R196 :1237 — 铁与锈铁共用铁珠，取铁列。
                return 8.0F;
            case ANCIENT_METAL:
                return 16.0F;
            case MITHRIL:
                return 64.0F;
            case ADAMANTIUM:
                return 256.0F;
            default:
                return Float.MAX_VALUE;
        }
    }

    /**
     * 按物品名反查金属（{@code "copper"} / {@code "adamantium"} …）。
     * 供单测与命令面使用；不认识的返回 {@code null}。
     */
    public static ETIMMetals byKey(String key) {
        if (key == null) {
            return null;
        }
        for (ETIMMetals m : ETIMMetals.values()) {
            if (key.equals(m.name)) {
                return m;
            }
        }
        return null;
    }
}
