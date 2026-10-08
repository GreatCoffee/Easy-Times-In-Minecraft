package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIMConfig;

/**
 * Level-scaled player caps (task 1.2), following MITE R196.
 *
 * <p>The vanilla XP level is the single source of truth: the cap table is
 * a pure function of {@code experienceLevel}, so the server logic and the
 * client HUD both derive from the same formula with no network sync needed
 * (the level itself is synced by vanilla).</p>
 *
 * <p>R196 formula: cap = 6 + level/5*2, capped at 20 — starting caps of 6
 * (3 hearts / 3 shanks) that grow by 2 points (one icon) every 5 levels,
 * reaching the vanilla 20 at level 35. All numbers are configurable
 * ({@link ETIMConfig}).</p>
 */
public final class PlayerStatLimits {

    private PlayerStatLimits() {
    }

    /**
     * Returns the health AND hunger cap (in points, 2 points per icon) for a level.
     */
    public static int getHealthFoodCap(int level) {
        int cap = ETIMConfig.capAtLevel0 + level / 5 * ETIMConfig.capGrowthPerFiveLevels;
        return Math.min(cap, ETIMConfig.capMaximum);
    }

    /** Number of icons a HUD bar shows for a level (cap/2). */
    public static int getIconCount(int level) {
        return getHealthFoodCap(level) / 2;
    }
}
