package io.github.etim.etim.metal;

import io.github.etim.etim.quality.EnumQuality;

/**
 * The six ETIM metal materials batch B2/B3 register equipment for
 * (对照报告 §2.3 first-hand table + 补50 grade 直读裁定 + 补53 B2 批文
 * §〇判值修正块 + 补59 B3 批文). Gold and iron keep the vanilla items —
 * their rows here are R196 对照 only, never registered.
 *
 * <p>Every value is a first-hand judgment:</p>
 * <ul>
 *   <li>grade = the R196 tool harvest level (补50: metal ? material.min
 *       直读 — copper/silver 2, ancient 3, mithril 4, adamantium 5,
 *       rusted_iron 2 — Material.java:33 setMinHarvestLevel(2);</li>
 *   <li>damageBonus = R196 Material damage vs entity (2.0/3.0/3.0/4.0/5.0/6.0
 *       — rusted_iron at Material.java:445-446 getDamageVsEntity).</li>
 *   <li>durabilityFactor = R196 Material.durability (4/4/16/64/256/4) —
 *       tools ×100, armor without the ×100 (ItemArmor:36-43).</li>
 *   <li>efficiency = R196 material harvest efficiency
 *       (1.75/1.75/2.0/2.5/3.0, ItemTool:68-119; rusted_iron 1.25 at
 *       ItemTool.java:81-82).</li>
 *   <li>enchantability = the 材质附魔 column (30/30/40/100/40/0 — rusted_iron
 *       0 at EnumEquipmentMaterial.java:8 second field), tools and
 *       armor from the same column.</li>
 *   <li>armorPoints = R196 ItemArmor.getMaterialProtection (7/7/8/9/10/6 —
 *       rusted_iron 6 at ItemArmor.java:49-50); the chain variant −2 rides
 *       ETIMMetalArmor (ItemArmor:69-71).</li>
 *   <li>quality = R196 EnumEquipmentMaterial max_quality (补59 裁决 3:
 *       copper/silver excellent, ancient masterwork, mithril/adamantium
 *       legendary, rusted_iron poor — EnumEquipmentMaterial.java:8 third
 *       field + audit20-09 §2.4 一手表).</li>
 * </ul>
 */
public enum ETIMMetals {

    COPPER("copper", 2, 3.0F, 4, 1.75F, 30, 7, EnumQuality.EXCELLENT),
    SILVER("silver", 2, 3.0F, 4, 1.75F, 30, 7, EnumQuality.EXCELLENT),
    ANCIENT_METAL("ancient_metal", 3, 4.0F, 16, 2.0F, 40, 8, EnumQuality.MASTERWORK),
    MITHRIL("mithril", 4, 5.0F, 64, 2.5F, 100, 9, EnumQuality.LEGENDARY),
    ADAMANTIUM("adamantium", 5, 6.0F, 256, 3.0F, 40, 10, EnumQuality.LEGENDARY),
    RUSTED_IRON("rusted_iron", 2, 2.0F, 4, 1.25F, 0, 6, EnumQuality.POOR);

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
