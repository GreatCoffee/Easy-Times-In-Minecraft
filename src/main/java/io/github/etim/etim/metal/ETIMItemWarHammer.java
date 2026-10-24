package io.github.etim.etim.metal;

/**
 * The ETIM metal war hammer (R196 ItemWarHammer extends ItemPickaxe:
 * 基伤 2.0 / 部件 5 / decay 2/3 破块与攻击 (:26-33) / 效率 ×0.75
 * (:16-18) / reach +0.75).
 */
public class ETIMItemWarHammer extends ETIMItemPickaxe implements ETIMMetalGear {

    public ETIMItemWarHammer(ETIMMetals metal) {
        super(metal, 2.0F, 5, 0.75F);
    }

    /** R196 ItemTool.getRepairCost :290-292 — war hammer components 5 × 2 (批三修理面; 基类 pickaxe 是 6). */
    @Override
    public int etimRepairCost() {
        return 10;
    }
}
