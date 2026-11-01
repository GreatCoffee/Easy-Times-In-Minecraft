package io.github.etim.etim.combat;

import net.minecraftforge.fml.common.eventhandler.Event;

import net.minecraft.entity.player.EntityPlayer;

/**
 * Extendability seam for the arrow-accuracy chain (batch enchant1, 条 245).
 * Fired every time the product computes the effective player level of a
 * {@code true_flight} shot (MixinEntityArrow — both sides, one event per
 * shot). Handlers may raise (or lower) the level via
 * {@link #addBonus(int)} — a future add-on (ETIM-Extra or a beyond-MITE
 * skill mod) layers its archery/skill increments here without touching the
 * product chain. No subscriber ⇒ the R196 α2 math verbatim.
 */
public final class ETIMArrowAccuracyEvent extends Event {

    private final EntityPlayer shooter;
    private final int experienceLevel;
    private final int enchantBonus;
    private int extraBonus;

    public ETIMArrowAccuracyEvent(EntityPlayer shooter, int experienceLevel, int enchantBonus) {
        this.shooter = shooter;
        this.experienceLevel = experienceLevel;
        this.enchantBonus = enchantBonus;
    }

    /** The α2 base: expLevel + round(bonusPerLevel × levelFraction). */
    public EntityPlayer getShooter() {
        return shooter;
    }

    public int getExperienceLevel() {
        return experienceLevel;
    }

    public int getEnchantBonus() {
        return enchantBonus;
    }

    /** Add-on hook: skill systems add their own level-equivalent here. */
    public void addBonus(int levelEquivalent) {
        extraBonus += levelEquivalent;
    }

    /** Final effective level (α2 base + add-on increment). */
    public int getEffectiveLevel() {
        return experienceLevel + enchantBonus + extraBonus;
    }
}
