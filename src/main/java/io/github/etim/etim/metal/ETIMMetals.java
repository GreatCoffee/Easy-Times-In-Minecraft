package io.github.etim.etim.metal;

/**
 * The five ETIM metal materials batch B2 registers equipment for
 * (对照报告 §2.3 first-hand table + 补50 grade 直读裁定 + 补53 B2 批文
 * §〇判值修正块). Gold and iron keep the vanilla items — their rows here
 * are R196 对照 only, never registered.
 *
 * <p>Every value is a first-hand judgment:</p>
 * <ul>
 *   <li>grade = the R196 tool harvest level (补50: metal ? material.min
 *       直读 — copper/silver 2, ancient 3, mithril 4, adamantium 5;
 *       the 批文表's old min−1 face was superseded).</li>
 *   <li>damageBonus = R196 Material damage vs entity (3.0/3.0/4.0/5.0/6.0).</li>
 *   <li>durabilityFactor = R196 Material.durability (4/4/16/64/256) —
 *       tools ×100, armor without the ×100 (ItemArmor:36-43).</li>
 *   <li>efficiency = R196 material harvest efficiency
 *       (1.75/1.75/2.0/2.5/3.0, ItemTool:68-119).</li>
 *   <li>enchantability = the 材质附魔 column (30/30/40/100/40), tools and
 *       armor from the same column.</li>
 *   <li>armorPoints = R196 ItemArmor.getMaterialProtection (7/7/8/9/10);
 *       the chain variant −2 rides ETIMMetalArmor (ItemArmor:69-71).</li>
 * </ul>
 */
public enum ETIMMetals {

    COPPER("copper", 2, 3.0F, 4, 1.75F, 30, 7),
    SILVER("silver", 2, 3.0F, 4, 1.75F, 30, 7),
    ANCIENT_METAL("ancient_metal", 3, 4.0F, 16, 2.0F, 40, 8),
    MITHRIL("mithril", 4, 5.0F, 64, 2.5F, 100, 9),
    ADAMANTIUM("adamantium", 5, 6.0F, 256, 3.0F, 40, 10);

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

    ETIMMetals(String name, int grade, float damageBonus, int durabilityFactor,
               float efficiency, int enchantability, int armorPoints) {
        this.name = name;
        this.grade = grade;
        this.damageBonus = damageBonus;
        this.durabilityFactor = durabilityFactor;
        this.efficiency = efficiency;
        this.enchantability = enchantability;
        this.armorPoints = armorPoints;
    }
}
