package io.github.etim.etim.metal;

import io.github.etim.etim.quality.EnumQuality;

/**
 * The metal materials the ETIM metal-gear batches judge values for
 * (对照报告 §2.3 first-hand table + 补50 grade 直读裁定 + 补53 B2 批文
 * §〇判值修正块 + 补59 B3 批文; GOLD rides the metgear 批
 * audit20 条 212-213). Registration is split by explicit tables — the
 * enum is the single judged-value source, NOT the registration set:
 * <ul>
 *   <li>{@link #TOOL_METALS} — the six B2/B3 tool/plate-armor metals;
 *       gold and iron keep the vanilla items for tools and plate armor
 *       (旧判维持, gold only rides the CHAIN faces below).</li>
 *   <li>{@link #CHAIN_METALS} — the seven chain-face metals (the five
 *       B2 metals + gold + rusted; chain item/chain armor registered
 *       for these, metgear 批 chain/gold 面).</li>
 *   <li>{@link #SHEARS_METALS} — the six R196 shears metals (762-766+991;
 *       iron shears are the vanilla item, R196 has no shearsIron).</li>
 * </ul>
 *
 * <p>Every value is a first-hand judgment:</p>
 * <ul>
 *   <li>grade = the R196 tool harvest level (补50: metal ? material.min
 *       直读 — copper/silver/gold 2, ancient 3, mithril 4, adamantium 5,
 *       rusted_iron 2 — Material.java:33 setMinHarvestLevel(2) + :48 gold
 *       same column; gold grade=2 NOT 1 — setMetal(false) feeds only
 *       setHarmedByAcid, Material.java:367-371 (condition 213 T-2));</li>
 *   <li>damageBonus = R196 Material damage vs entity (2.0/3.0/3.0/4.0/5.0/6.0
 *       — rusted_iron at Material.java:445-446 getDamageVsEntity, gold 2.0
 *       at :457-458).</li>
 *   <li>durabilityFactor = R196 Material.durability (4/4/16/64/256/4, gold 4) —
 *       tools ×100, armor without the ×100 (ItemArmor:36-43).</li>
 *   <li>efficiency = R196 material harvest efficiency
 *       (1.75/1.75/2.0/2.5/3.0, ItemTool:68-119; rusted_iron 1.25 at
 *       ItemTool.java:81-82; gold 1.75 at ItemTool.java:93-95).</li>
 *   <li>enchantability = the 材质附魔 column (30/30/40/100/40/0, gold 50 —
 *       0 at EnumEquipmentMaterial.java:8 second field, gold 50 at :11),
 *       tools and armor from the same column.</li>
 *   <li>armorPoints = R196 ItemArmor.getMaterialProtection (7/7/8/9/10/6,
 *       gold 6 at ItemArmor.java:49-50); the chain variant −2 rides
 *       ETIMMetalArmor (ItemArmor:69-71).</li>
 *   <li>quality = R196 EnumEquipmentMaterial max_quality (补59 裁决 3:
 *       copper/silver/gold excellent, ancient masterwork, mithril/adamantium
 *       legendary, rusted_iron poor — EnumEquipmentMaterial.java:8
 *       third field + audit20-09 §2.4 一手表; gold SUPERB at :11).</li>
 * </ul>
 */
public enum ETIMMetals {

    COPPER("copper", 2, 3.0F, 4, 1.75F, 30, 7, EnumQuality.EXCELLENT),
    SILVER("silver", 2, 3.0F, 4, 1.75F, 30, 7, EnumQuality.EXCELLENT),
    ANCIENT_METAL("ancient_metal", 3, 4.0F, 16, 2.0F, 40, 8, EnumQuality.MASTERWORK),
    MITHRIL("mithril", 4, 5.0F, 64, 2.5F, 100, 9, EnumQuality.LEGENDARY),
    ADAMANTIUM("adamantium", 5, 6.0F, 256, 3.0F, 40, 10, EnumQuality.LEGENDARY),
    RUSTED_IRON("rusted_iron", 2, 2.0F, 4, 1.25F, 0, 6, EnumQuality.POOR),
    GOLD("gold", 2, 2.0F, 4, 1.75F, 50, 6, EnumQuality.SUPERB);

    /** The six tool-side metals (gold/iron keep vanilla items — chain faces excluded). */
    public static final java.util.List<ETIMMetals> TOOL_METALS = java.util.Collections.unmodifiableList(
            java.util.Arrays.asList(COPPER, SILVER, ANCIENT_METAL, MITHRIL, ADAMANTIUM, RUSTED_IRON));

    /** The seven chain-face metals (metgear 批: gold joins chain/chain-armor only). */
    public static final java.util.List<ETIMMetals> CHAIN_METALS = java.util.Collections.unmodifiableList(
            java.util.Arrays.asList(COPPER, SILVER, GOLD, ANCIENT_METAL, MITHRIL, ADAMANTIUM, RUSTED_IRON));

    /** The six R196 shears metals (762-766+991 — no iron, no rusted). */
    public static final java.util.List<ETIMMetals> SHEARS_METALS = java.util.Collections.unmodifiableList(
            java.util.Arrays.asList(COPPER, SILVER, GOLD, ANCIENT_METAL, MITHRIL, ADAMANTIUM));


    /** Registry-name fragment: {@code pickaxe_<name>} / {@code helmet_<name>}. */
    public final String name;
    /** R196 tool harvest level (补50 直读裁定). */
    public final int grade;
    /** R196 material damage vs entity, added to the per-type base. */
    public final float damageBonus;
    /** R196 Material.durability (tools ×100, armor without). */
    public final int durabilityFactor;
    /** R196 material harvest efficiency (×4.0 base at the str funnel). */
    public final float efficiency;
    /** R196 材质附魔 column (tools and armor share it). */
    public final int enchantability;
    /** R196 ItemArmor.getMaterialProtection (chain −2 at the armor item). */
    public final int armorPoints;
    /** R196 EnumEquipmentMaterial max_quality (补59 裁决 3 连带面). */
    public final EnumQuality quality;

    ETIMMetals(String name, int grade, float damageBonus, int durabilityFactor,
               float efficiency, int enchantability, int armorPoints, EnumQuality quality) {
        this.name = name;
        this.grade = grade;
        this.damageBonus = damageBonus;
        this.durabilityFactor = durabilityFactor;
        this.efficiency = efficiency;
        this.enchantability = enchantability;
        this.armorPoints = armorPoints;
        this.quality = quality;
    }
}
