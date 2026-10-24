package io.github.etim.etim.metal;

/**
 * The ETIM metal mattock (R196 ItemMattock extends ItemShovel: 基伤 1.0
 * （shovel 基）/ 部件 4 / decay 破块 0.4（0.5×0.8）攻击 0.8 (:29-31)/
 * 效率 ×0.75 (:14-16) / reach +0.75). The R196 till-on-right-click face
 * (ItemMattock:34-43) rides the vanilla hoe-use semantics — NOT ported
 * here (批文 §二 范围外, C 级登记).
 */
public class ETIMItemMattock extends ETIMItemShovel implements ETIMMetalGear {

    public ETIMItemMattock(ETIMMetals metal) {
        super(metal, 1.0F, 4, 0.75F);
    }
}
