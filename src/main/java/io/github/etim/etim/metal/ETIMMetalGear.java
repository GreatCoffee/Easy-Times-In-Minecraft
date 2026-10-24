package io.github.etim.etim.metal;

/**
 * Marker interface for every batch-B2 ETIM metal equipment item (50 tools +
 * 40 armor + 5 chains). It is the G-FB-12 绕-fold seam: {@code
 * ETIMMining.getToolGrade}/getMaterialEfficiency read the R196 values
 * DIRECTLY from the item instance instead of folding the vanilla
 * harvest-level bands ({@code <=1 ? level : 3}) over them.
 *
 * <p>Judged semantics (B2 批文 §二.2): a copper pickaxe keeps grade 2 and
 * therefore cannot mine mithril ore (min 3); a mithril pickaxe keeps grade
 * 4; adamantium is never folded down to 3. The vanilla folding semantics
 * stay untouched for the vanilla tool set.</p>
 */
public interface ETIMMetalGear {

    /** R196 tool harvest level (补50 直读) — the mine-gate grade. */
    int etimGrade();

    /** R196 material efficiency × per-type multiplier (the 4.0-base part). */
    float etimEfficiency();

    /** R196 getCombinedDamageVsEntity (base + material damage); armor = its piece damage face (0). */
    float etimAttackDamage();

    /** R196 setReachBonus of this type (0.75 base; hatchet/dagger 0.5). */
    float etimReachBonus();

    /** R196 EnumEquipmentMaterial max_quality of this metal (补59 裁决 3). */
    io.github.etim.etim.quality.EnumQuality etimQuality();

    /**
     * 批三修理面（砧修链）：R196 Item.getRepairItem :1229-1246 对位 — the
     * nugget that consumable-repairs this item on the anvil. Rusted iron
     * rides :1237 (ironNugget, 与 iron 合流); flint knife returns null
     * (flint 不在珠映射 → 仅同物合并路径可修).
     */
    net.minecraft.item.Item etimRepairItem();

    /**
     * 批三修理面：R196 IDamageableItem.getRepairCost 对位 — the per-nugget
     * durability divisor. Tools = components × 2 (ItemTool :290-292); armor =
     * components × 2, chain halved (ItemArmor :342-348). 0 = no consumable
     * repair face.
     */
    int etimRepairCost();

    /**
     * 批三修理面：the R196 Material.durability column of this item's material
     * (EnumEquipmentMaterial :4-20; tools/armor/knife all carry it) — the
     * combination-repair anvil gate reads the TOOL's value (ContainerRepair
     * :73-78).
     */
    float etimMaterialDurability();
}
