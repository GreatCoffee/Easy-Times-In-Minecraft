package io.github.etim.etim.playerstate;

/**
 * Level-scaled player caps (task 1.2), following MITE R196.
 *
 * <p>is the XP level of the vanilla player is the single source of truth:
 * the cap table is a pure function of {@code experienceLevel}, so the
 * server logic and the client HUD both derive from the same formula with
 * no network sync needed (the level itself is synced by vanilla).</p>
 *
 * <p>R196 formula: cap = clamp(6 + level/5*2, 6, 20), i.e. starting caps
 * of 6 (3 hearts / 3 shanks) that grow by 2 points (1 heart/shank slot)
 * every 5 levels, reaching the vanilla 20 at level 35.</p>
 */
public final class PlayerStatLimits {

    /** Hard cap of player levels (task 1.2). */
    public static final int LEVEL_CAP = 200;
    /** Level at which health/food caps reach the vanilla 20. */
    public static final int FULL_LEVEL = 35;

    private PlayerStatLimits() {
    }

    /**
     * Returns the health AND hunger cap (in points, 2 points per icon) for a level.
     * clamp(6 + level/5*2, 6, 20): 6 at level 0, +2 per 5 levels, 20 from level 35.
     */
    public static int getHealthFoodCap(int level) {
        int cap = 6 + level / 5 * 2;
        return Math.min(cap, 20);
    }

    /**
     * Number of icons one HUD bar shows for a level
     * (the whole number of hearts / shanks rendered).
     */
    public static int getIconCount(int level) {
        return getHealthFoodCap(level) / 2;
    }
}
