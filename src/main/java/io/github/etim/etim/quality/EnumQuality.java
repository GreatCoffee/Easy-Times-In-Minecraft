package io.github.etim.etim.quality;

/**
 * Batch 3 (stage 3): the R196 quality ladder, one-hand ported from
 * {@code EnumQuality:31-33} (audit task 10 §一 — all eight ordinals and their
 * single numeric property {@code durability_modifier} javap-verified).
 *
 * <p>ETIM keeps the ladder as a self-built enum: vanilla 1.12.2 has no
 * Item.getQuality channel at all, so the whole subsystem is necessarily a
 * ported difference (see the batch-3 design doc §一).</p>
 *
 * <p>R196 facts encoded here:</p>
 * <ul>
 *   <li>8 ordinals, durability modifier 0.5..3.5 in 0.25 steps;</li>
 *   <li>AVERAGE (ordinal 2, modifier 1.0) is the pivot: the ×2-per-step
 *       quality-difficulty multiply and the min/max picker both hang off it;</li>
 *   <li>no color code field — the tooltip line is plain GRAY + the display
 *       name (audit §3.3);</li>
 *   <li>display key {@code etim.quality.<name>} mirrors R196's
 *       {@code quality.<name>} Translator key shape.</li>
 * </ul>
 */
public enum EnumQuality {

    WRETCHED(0.5F),
    POOR(0.75F),
    AVERAGE(1.0F),
    FINE(1.5F),
    EXCELLENT(2.0F),
    SUPERB(2.5F),
    MASTERWORK(3.0F),
    LEGENDARY(3.5F);

    /** R196 EnumQuality:31-33 — the single built-in numeric. */
    private final float durabilityModifier;

    EnumQuality(float durabilityModifier) {
        this.durabilityModifier = durabilityModifier;
    }

    public float getDurabilityModifier() {
        return this.durabilityModifier;
    }

    /** I18n key of the display name (audit §一， Translator "quality."+name shape). */
    public String getTranslationKey() {
        return "etim.quality." + this.name().toLowerCase();
    }
}
