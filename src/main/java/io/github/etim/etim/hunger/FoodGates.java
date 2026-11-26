package io.github.etim.etim.hunger;

/**
 * Pure decision table for the R196 {@code FoodStats.onUpdate} port
 * (FoodStats.java:35-92, as landed in {@link ETIMFoodStats#tick}).
 *
 * <p>Everything the loop reads from the player/world/config arrives through
 * {@link Ctx}; everything it writes comes back as a {@link Result}. The entity
 * method keeps the side effects (state writes, damage, heal, logs) so the
 * arithmetic and the branch order can be unit-tested without a server.</p>
 *
 * <p>Branch order is load-bearing and mirrors the port exactly:
 * accrual → per-unit consumption → clamp → starve/heal.</p>
 */
public final class FoodGates {

    /** One action the tick decided on; the caller translates it to a log line. */
    public enum Act {
        NONE, CONSUMED_SATIATION, CONSUMED_NUTRITION, STARVE_STRIKE, HEALED
    }

    /** All inputs of one tick. Defaults are the R196/ETIM shipped values. */
    public static final class Ctx {
        // pool state (in)
        public float hungerPool;
        public float nutritionOnlyPool;
        public int satiation;
        public int nutrition;
        public float healProgress;
        public float starveProgress;
        // accrual
        public float gain;              // effectiveHungerGainPerTick()
        public float gainMultiplier = 1.0F; // getHungerMultiplier()
        public float hungerPoolCap;
        public float hungerPerFoodUnit;
        public float nutritionOnlyFactor;
        // clamp
        public int limit;
        // starve branch
        public float starveGain;        // effectiveStarveGainPerTick()
        public float starveHealthCeiling;
        public int difficulty;
        public float health;
        // heal branch
        public float healBase;
        public float healPerNutrition;
        public boolean malnourished;
        public float malnourishedRegenFactor;
        public boolean sleeping;
        public float bedRegenFactor;
        public float regenFactor = 1.0F;
        public boolean naturalRegeneration;
        public boolean shouldHeal;
    }

    /** The new state plus the single action this tick took (if any). */
    public static final class Result {
        public final float hungerPool;
        public final float nutritionOnlyPool;
        public final int satiation;
        public final int nutrition;
        public final float healProgress;
        public final float starveProgress;
        public final Act act;
        /** Starve branch only: whether the 1.0 damage roll passed. */
        public final boolean strike;
        /** Heal branch only: whether one health point is due. */
        public final boolean healed;

        Result(Ctx c, Act act, boolean strike, boolean healed) {
            this.hungerPool = c.hungerPool;
            this.nutritionOnlyPool = c.nutritionOnlyPool;
            this.satiation = c.satiation;
            this.nutrition = c.nutrition;
            this.healProgress = c.healProgress;
            this.starveProgress = c.starveProgress;
            this.act = act;
            this.strike = strike;
            this.healed = healed;
        }
    }

    private FoodGates() {
    }

    /**
     * Runs one tick of the R196 loop on {@code c}. {@code c} is mutated in
     * place (the caller owns it) and also reflected in the returned Result.
     *
     * @param creative creative players skip only the accrual, exactly like the
     *                 R196 addHunger pre-gate (FoodStats.java:42-44)
     */
    public static Result tick(Ctx c, boolean creative) {
        // Hunger accrual (:40-44)
        if (!creative) {
            float gainTick = c.gain * c.gainMultiplier;
            c.hungerPool = Math.min(c.hungerPool + gainTick, c.hungerPoolCap);
            c.nutritionOnlyPool += c.gain * c.nutritionOnlyFactor;
        }

        // Per-unit consumption rhythm (:46-56)
        Act act = Act.NONE;
        if (c.hungerPool >= c.hungerPerFoodUnit) {
            c.hungerPool -= c.hungerPerFoodUnit;
            if (c.satiation > 0 || c.nutrition > 0) {
                // Satiation is spent first unless the nutrition-only pool alone
                // can pay for a unit and there is nutrition left to spend.
                if (c.satiation >= 1
                        && (!(c.nutritionOnlyPool + 0.001F >= c.hungerPerFoodUnit) || c.nutrition <= 0)) {
                    c.satiation -= 1;
                    act = Act.CONSUMED_SATIATION;
                } else {
                    c.nutrition -= 1;
                    c.nutritionOnlyPool = 0.0F;
                    act = Act.CONSUMED_NUTRITION;
                }
            }
        }

        c.satiation = Math.min(c.satiation, c.limit);
        c.nutrition = Math.min(c.nutrition, c.limit);

        // Starve / heal branches (:62-89)
        boolean strike = false;
        boolean healed = false;
        if (c.nutrition == 0) {
            c.healProgress = 0.0F;
            c.starveProgress += c.starveGain;
            if (c.starveProgress >= 1.0F) {
                // Difficulty ladder (:70-74): normal+ only while above 1 HP,
                // hard always, easy only above the ceiling.
                if (c.health > c.starveHealthCeiling
                        || c.difficulty >= 3
                        || c.health > 1.0F && c.difficulty >= 2) {
                    strike = true;
                    if (act == Act.NONE) {
                        act = Act.STARVE_STRIKE;
                    }
                }
                c.starveProgress -= 1.0F;
                c.nutritionOnlyPool = 0.0F;
            }
        } else {
            c.starveProgress = 0.0F;
            float gainTick = (c.healBase + c.nutrition * c.healPerNutrition)
                    * (c.malnourished ? c.malnourishedRegenFactor : 1.0F)
                    * (c.sleeping ? c.bedRegenFactor : 1.0F)
                    * c.regenFactor;
            c.healProgress += gainTick;
            if (!c.naturalRegeneration || !c.shouldHeal) {
                c.healProgress = 0.0F;
            } else if (c.healProgress >= 1.0F) {
                healed = true;
                c.healProgress -= 1.0F;
                // Healing is paid back into the hunger pool (:84).
                c.hungerPool = Math.min(c.hungerPool + 1.0F, c.hungerPoolCap);
                if (act == Act.NONE) {
                    act = Act.HEALED;
                }
            }
        }
        return new Result(c, act, strike, healed);
    }
}
