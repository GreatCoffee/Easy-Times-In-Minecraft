package io.github.etim.etim.metal;

/**
 * The ETIM metal mattock (R196 ItemMattock extends ItemShovel: 基伤 1.0
 * （shovel 基）/ 部件 4 / decay 破块 0.4（0.5×0.8）；攻击面 R196 无覆写，
 * 继承 ItemShovel.getBaseDecayRateForAttackingEntity :36-37 = 1.0F ⇒ 出口
 * 100（未装特判，经 ETIMMining ItemSpade 兜底；条 171 Ku-3 勘正——0.8 旧读
 * 系破块系数外溢）/ 效率 ×0.75 (:14-16) / reach +0.75). The R196 till-on-right-click face
 * (ItemMattock:34-43) rides the vanilla hoe-use semantics — NOT ported
 * here (批文 §二 范围外, C 级登记).
 */
public class ETIMItemMattock extends ETIMItemShovel implements ETIMMetalGear {

    public ETIMItemMattock(ETIMMetals metal) {
        super(metal, 1.0F, 4, 0.75F);
    }

    /** R196 ItemTool.getRepairCost :290-292 — mattock components 4 × 2 (批三修理面; 基类 shovel 是 2). */
    @Override
    public int etimRepairCost() {
        return 8;
    }
}
