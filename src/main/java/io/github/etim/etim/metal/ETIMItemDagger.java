package io.github.etim.etim.metal;

/**
 * The ETIM metal dagger (R196 ItemDagger extends ItemSword: 基伤 2.0
 * （sword −2）/ 部件 1 / decay 继承 sword 破块 2.0 攻击 0.5 /
 * **reach +0.5** (:6) — B2 批文 §〇 判值更正 B).
 */
public class ETIMItemDagger extends ETIMItemSword implements ETIMMetalGear {

    public ETIMItemDagger(ETIMMetals metal) {
        super(metal, 2.0F, 1);
    }

    /** R196 ItemTool.getRepairCost :290-292 — dagger component 1 × 2 (批三修理面; 基类 sword 是 4). */
    @Override
    public int etimRepairCost() {
        return 2;
    }

    @Override
    public float etimReachBonus() {
        return 0.5F; // R196 ItemDagger:6 setReachBonus(0.5F)
    }

    @Override
    public io.github.etim.etim.quality.EnumQuality etimQuality() {
        return metal.quality;
    }
}
