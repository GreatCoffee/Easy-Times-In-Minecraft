package io.github.etim.etim.metal;

/**
 * The ETIM metal battle axe (R196 ItemBattleAxe extends ItemAxe: 基伤 4.0
 * （axe +1）/ 部件 4 / decay 破块 ×1.25 攻击 ×0.75 (:30-37) / 效率
 * ×0.75 (:15-17) / reach +0.75).
 */
public class ETIMItemBattleAxe extends ETIMItemAxe implements ETIMMetalGear {

    public ETIMItemBattleAxe(ETIMMetals metal) {
        super(metal, 4.0F, 4, 0.75F);
    }

    /** R196 ItemTool.getRepairCost :290-292 — battle axe components 4 × 2 (批三修理面; 基类 axe 是 6). */
    @Override
    public int etimRepairCost() {
        return 8;
    }
}
