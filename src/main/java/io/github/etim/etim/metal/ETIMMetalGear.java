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
}
