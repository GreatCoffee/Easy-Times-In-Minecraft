package io.github.etim.etim.crafting;

/**
 * R196 crafting-time and quality-budget arithmetic, lifted out of the
 * container/player plumbing so it can be unit-tested (B-70TG).
 *
 * <p>Every method is a pure function of its arguments: the config values are
 * passed in, not read from {@link io.github.etim.etim.ETIMConfig}. The
 * player/container wrappers in {@link ETIMCrafting} and
 * {@link io.github.etim.etim.quality.ETIMQuality} stay the only callers.</p>
 */
public final class CraftingGates {

    private CraftingGates() {
    }

    /**
     * R196 {@code ClientPlayer.calcUnmodifiedCraftingPeriod} (:499-507):
     * d&lt;25 → 25; d&gt;100 → round((d−100)^exponent)+100; else round(d).
     */
    public static int unmodifiedPeriod(float difficulty, float curveExponent) {
        if (difficulty < 25.0F) {
            return 25;
        }
        if (difficulty > 100.0F) {
            return Math.round((float) Math.pow(difficulty - 100.0F, curveExponent)) + 100;
        }
        return Math.round(difficulty);
    }

    /**
     * R196 {@code getCraftingPeriod} (:555-563): divide the unmodified period
     * by 1 + level·perLevel + bench, then clamp to the floor.
     */
    public static int period(int unmodified, int experienceLevel, float bench,
                             float speedPerLevel, float periodFloor) {
        float denominator = 1.0F + speedPerLevel * experienceLevel + bench;
        return (int) Math.max(unmodified / denominator, periodFloor);
    }

    /**
     * Audit §3.2: every rung above average doubles the difficulty; rungs at or
     * below average are NOT discounted.
     */
    public static float qualityAdjustedDifficulty(float difficulty, int qualityOrdinal, int averageOrdinal) {
        float modified = difficulty;
        for (int i = averageOrdinal; i < qualityOrdinal; i++) {
            modified *= 2.0F;
        }
        return modified;
    }

    /** R196 {@code getCraftingExperienceCost} (javap 7004-7020): round(qAdj / 5). */
    public static int experienceCost(float qualityAdjustedDifficulty) {
        return (int) Math.round(qualityAdjustedDifficulty / 5.0F);
    }

    /**
     * R196 {@code getMinCraftingQuality} (:2398-2412): the floor is the average
     * rung for any level ≥ 0; a negative level can pull it down (one step per
     * 10 levels, never below 0).
     */
    public static int minOrdinal(int experienceLevel, int averageOrdinal) {
        return Math.min(Math.max(averageOrdinal + experienceLevel / 10, 0), averageOrdinal);
    }

    /**
     * R196 {@code getMaxCraftingQuality} (:2414-2438): walk from the item's max
     * rung down to average EXCLUSIVE and take the first affordable step; no XP
     * pool means the floor.
     */
    public static int maxOrdinal(int minOrdinal, int itemMaxOrdinal, int averageOrdinal,
                                 int experienceTotal, float difficulty) {
        if (experienceTotal <= 0) {
            return minOrdinal;
        }
        for (int i = itemMaxOrdinal; i > averageOrdinal; i--) {
            if (experienceCost(qualityAdjustedDifficulty(difficulty, i, averageOrdinal)) <= experienceTotal) {
                return i;
            }
        }
        return minOrdinal;
    }
}
