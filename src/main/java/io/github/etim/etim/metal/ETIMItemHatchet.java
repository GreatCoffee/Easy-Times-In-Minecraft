package io.github.etim.etim.metal;

/**
 * The ETIM metal hatchet (R196 ItemHatchet extends ItemAxe: 基伤 2.0
 * （axe −1）/ 部件 1 / decay 4/3 破块与攻击（:35-42，砂岩面继承 axe 的
 * 1.875 基准）/ 效率 ×0.5 (:15-17) / **reach +0.5** (:6) — B2 批文
 * §〇 判值更正 B). The sandstone half-efficiency face inherits from
 * {@link ETIMItemAxe#getDestroySpeed}.
 */
public class ETIMItemHatchet extends ETIMItemAxe implements ETIMMetalGear {

    public ETIMItemHatchet(ETIMMetals metal) {
        super(metal, 2.0F, 1, 0.5F);
    }

    /** R196 ItemTool.getRepairCost :290-292 — hatchet component 1 × 2 (批三修理面; 基类 axe 是 6). */
    @Override
    public int etimRepairCost() {
        return 2;
    }

    @Override
    public float etimReachBonus() {
        return 0.5F; // R196 ItemHatchet:6 setReachBonus(0.5F)
    }

    @Override
    public io.github.etim.etim.quality.EnumQuality etimQuality() {
        return metal.quality;
    }
}
