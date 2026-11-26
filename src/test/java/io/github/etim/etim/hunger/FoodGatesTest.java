package io.github.etim.etim.hunger;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70T9: the R196 hunger loop arithmetic, lifted out of the entity tick.
 * Values mirror the shipped config defaults (FoodStats.java:28/:32/:43/:64).
 */
class FoodGatesTest {

    private static final float GAIN = 0.002F;          // effectiveHungerGainPerTick
    private static final float CAP = 40.0F;            // hungerPoolCap
    private static final float PER_UNIT = 4.0F;        // hungerPerFoodUnit
    private static final float ONLY_FACTOR = 0.25F;    // hungerNutritionOnlyFactor
    private static final int LIMIT = 20;               // satiation/nutrition limit
    private static final float STARVE_GAIN = 0.002F;
    private static final float CEILING = 6.0F;         // starveHealthCeiling
    private static final float HEAL_BASE = 4.0E-4F;
    private static final float HEAL_PER_NUTRITION = 2.0E-5F;

    /** A Ctx with every value the shipped defaults would give. */
    private static FoodGates.Ctx base() {
        FoodGates.Ctx c = new FoodGates.Ctx();
        c.gain = GAIN;
        c.gainMultiplier = 1.0F;
        c.hungerPoolCap = CAP;
        c.hungerPerFoodUnit = PER_UNIT;
        c.nutritionOnlyFactor = ONLY_FACTOR;
        c.limit = LIMIT;
        c.starveGain = STARVE_GAIN;
        c.starveHealthCeiling = CEILING;
        c.difficulty = 2;
        c.health = 20.0F;
        c.healBase = HEAL_BASE;
        c.healPerNutrition = HEAL_PER_NUTRITION;
        c.malnourishedRegenFactor = 0.5F;
        c.bedRegenFactor = 2.0F;
        c.regenFactor = 1.0F;
        c.naturalRegeneration = true;
        c.shouldHeal = true;
        return c;
    }

    private static void assertNear(float expected, float actual) {
        assertEquals(expected, actual, 1.0E-4F);
    }

    // ---------------------------------------------------------------- accrual

    @Test
    void accrualAddsGainTimesMultiplier() {
        FoodGates.Ctx c = base();
        c.gainMultiplier = 2.0F;
        c.nutrition = 5;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertNear(0.004F, r.hungerPool);
        assertNear(GAIN * ONLY_FACTOR, r.nutritionOnlyPool);
    }

    @Test
    void accrualIsCappedAtPoolCap() {
        FoodGates.Ctx c = base();
        c.hungerPoolCap = 0.001F;
        c.nutrition = 5;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertNear(0.001F, r.hungerPool);
    }

    @Test
    void creativeSkipsAccrualOnly() {
        FoodGates.Ctx c = base();
        c.nutrition = 5;
        FoodGates.Result r = FoodGates.tick(c, true);
        assertNear(0.0F, r.hungerPool);
        assertNear(0.0F, r.nutritionOnlyPool);
        assertEquals(FoodGates.Act.NONE, r.act);
    }

    @Test
    void creativeStillConsumesAPreloadedUnit() {
        FoodGates.Ctx c = base();
        c.hungerPool = 4.0F;
        c.satiation = 3;
        c.nutrition = 5;
        FoodGates.Result r = FoodGates.tick(c, true);
        assertEquals(FoodGates.Act.CONSUMED_SATIATION, r.act);
        assertEquals(2, r.satiation);
        assertNear(0.0F, r.hungerPool);
    }

    // ------------------------------------------------------------ consumption

    @Test
    void noConsumptionBelowOneUnit() {
        FoodGates.Ctx c = base();
        c.hungerPool = 3.9F;
        c.satiation = 5;
        c.nutrition = 5;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertEquals(FoodGates.Act.NONE, r.act);
        assertEquals(5, r.satiation);
        assertEquals(5, r.nutrition);
    }

    @Test
    void satiationSpentFirstWhenItCannotPayAlone() {
        FoodGates.Ctx c = base();
        c.hungerPool = 4.0F;
        c.nutritionOnlyPool = 1.0F; // < 4.0F
        c.satiation = 7;
        c.nutrition = 7;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertEquals(FoodGates.Act.CONSUMED_SATIATION, r.act);
        assertEquals(6, r.satiation);
        assertEquals(7, r.nutrition);
        assertNear(1.0005F, r.nutritionOnlyPool);
        assertNear(GAIN, r.hungerPool);
    }

    @Test
    void nutritionSpentWhenOnlyPoolCanPayAndNutritionRemains() {
        FoodGates.Ctx c = base();
        c.hungerPool = 4.0F;
        c.nutritionOnlyPool = 4.0F;
        c.satiation = 7;
        c.nutrition = 7;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertEquals(FoodGates.Act.CONSUMED_NUTRITION, r.act);
        assertEquals(7, r.satiation);
        assertEquals(6, r.nutrition);
        assertNear(0.0F, r.nutritionOnlyPool);
    }

    @Test
    void nutritionSpentWhenNoSatiationLeft() {
        FoodGates.Ctx c = base();
        c.hungerPool = 4.0F;
        c.nutritionOnlyPool = 0.5F;
        c.satiation = 0;
        c.nutrition = 3;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertEquals(FoodGates.Act.CONSUMED_NUTRITION, r.act);
        assertEquals(0, r.satiation);
        assertEquals(2, r.nutrition);
        assertNear(0.0F, r.nutritionOnlyPool);
    }

    @Test
    void satiationSpentWhenNutritionIsAlreadyZero() {
        FoodGates.Ctx c = base();
        c.hungerPool = 4.0F;
        c.nutritionOnlyPool = 4.0F; // enough on its own, but nothing to spend it on
        c.satiation = 2;
        c.nutrition = 0;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertEquals(FoodGates.Act.CONSUMED_SATIATION, r.act);
        assertEquals(1, r.satiation);
        assertNear(4.0005F, r.nutritionOnlyPool);
    }

    @Test
    void unitSpentWithoutAnyPoolWhenBothEmpty() {
        FoodGates.Ctx c = base();
        c.hungerPool = 4.0F;
        c.satiation = 0;
        c.nutrition = 0;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertEquals(FoodGates.Act.NONE, r.act);
        assertNear(GAIN, r.hungerPool);
    }

    @Test
    void clampHappensAfterConsumption() {
        FoodGates.Ctx c = base();
        c.hungerPool = 4.0F;
        c.satiation = 25;
        c.nutrition = 25;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertEquals(LIMIT, r.satiation);
        assertEquals(LIMIT, r.nutrition);
    }

    // ---------------------------------------------------------------- starve

    @Test
    void starvingAccumulatesAndZeroesHealProgress() {
        FoodGates.Ctx c = base();
        c.starveProgress = 0.5F;
        c.healProgress = 0.9F;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertNear(0.502F, r.starveProgress);
        assertFalse(r.strike);
        assertNear(0.0F, r.healProgress);
        assertFalse(r.healed);
    }

    @Test
    void starvingStrikesAboveCeiling() {
        FoodGates.Ctx c = base();
        c.starveProgress = 0.999F;
        c.health = 7.0F; // > 6.0 ceiling
        FoodGates.Result r = FoodGates.tick(c, false);
        assertTrue(r.strike);
        assertEquals(FoodGates.Act.STARVE_STRIKE, r.act);
        assertNear(0.001F, r.starveProgress);
        assertNear(0.0F, r.nutritionOnlyPool);
    }

    @Test
    void starvingStrikesOnHardRegardlessOfHealth() {
        FoodGates.Ctx c = base();
        c.starveProgress = 1.0F;
        c.health = 1.0F;
        c.starveHealthCeiling = 0.5F;
        c.difficulty = 3;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertTrue(r.strike);
    }

    @Test
    void starvingStrikesOnNormalAboveOneHealth() {
        FoodGates.Ctx c = base();
        c.starveProgress = 1.0F;
        c.health = 1.5F;
        c.starveHealthCeiling = 0.5F;
        c.difficulty = 2;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertTrue(r.strike);
    }

    @Test
    void starvingLeavesOneHealthOnNormal() {
        FoodGates.Ctx c = base();
        c.starveProgress = 1.0F;
        c.health = 1.0F;
        c.starveHealthCeiling = 6.0F;
        c.difficulty = 2;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertFalse(r.strike);
        assertEquals(FoodGates.Act.NONE, r.act);
        // the tick that rolled over still spends its progress and the pool
        assertNear(GAIN, r.starveProgress);
        assertNear(0.0F, r.nutritionOnlyPool);
    }

    @Test
    void starvingNeverStrikesOnEasyBelowCeiling() {
        FoodGates.Ctx c = base();
        c.starveProgress = 1.0F;
        c.health = 4.0F;
        c.starveHealthCeiling = 6.0F;
        c.difficulty = 1;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertFalse(r.strike);
    }

    @Test
    void starvingResetsOnNutrition() {
        FoodGates.Ctx c = base();
        c.starveProgress = 0.8F;
        c.nutrition = 2;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertNear(0.0F, r.starveProgress);
    }

    // ---------------------------------------------------------------- regen

    @Test
    void regenAccumulatesBasePlusNutrition() {
        FoodGates.Ctx c = base();
        c.nutrition = 10;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertNear(HEAL_BASE + 10 * HEAL_PER_NUTRITION, r.healProgress);
        assertFalse(r.healed);
    }

    @Test
    void regenMultipliesMalnourishedSleepingAndEnchant() {
        FoodGates.Ctx c = base();
        c.nutrition = 10;
        c.malnourished = true;
        c.sleeping = true;
        c.regenFactor = 1.5F;
        float perTick = (HEAL_BASE + 10 * HEAL_PER_NUTRITION) * 0.5F * 2.0F * 1.5F;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertNear(perTick, r.healProgress);
    }

    @Test
    void regenZeroedWhenNaturalRegenerationIsOff() {
        FoodGates.Ctx c = base();
        c.nutrition = 10;
        c.healProgress = 0.6F;
        c.naturalRegeneration = false;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertNear(0.0F, r.healProgress);
        assertFalse(r.healed);
    }

    @Test
    void regenZeroedWhenHealingIsNotAllowed() {
        FoodGates.Ctx c = base();
        c.nutrition = 10;
        c.healProgress = 0.6F;
        c.shouldHeal = false;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertNear(0.0F, r.healProgress);
        assertFalse(r.healed);
    }

    @Test
    void regenPaysOnePointAndReplenishesHungerPool() {
        FoodGates.Ctx c = base();
        c.nutrition = 10;
        c.healProgress = 0.9999F;
        c.hungerPool = 1.0F;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertTrue(r.healed);
        assertEquals(FoodGates.Act.HEALED, r.act);
        assertNear(1.0F + GAIN + 1.0F, r.hungerPool);
        assertTrue(r.healProgress < 1.0F && r.healProgress >= 0.0F);
    }

    @Test
    void regenReplenishRespectsPoolCap() {
        FoodGates.Ctx c = base();
        c.nutrition = 10;
        c.healProgress = 1.0F;
        c.hungerPool = 3.5F;
        c.hungerPoolCap = 4.0F;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertTrue(r.healed);
        assertEquals(4.0F, r.hungerPool);
    }

    // ----------------------------------------------------------------- order

    @Test
    void accrualAndConsumptionShareOneTick() {
        FoodGates.Ctx c = base();
        c.hungerPool = 3.999F;
        c.satiation = 2;
        c.nutrition = 3;
        FoodGates.Result r = FoodGates.tick(c, false);
        // 3.999 + 0.002 crosses the unit, then the unit is deducted
        assertEquals(FoodGates.Act.CONSUMED_SATIATION, r.act);
        assertNear(0.001F, r.hungerPool);
        assertEquals(1, r.satiation);
    }

    @Test
    void consumptionCanStarveTheSameTick() {
        FoodGates.Ctx c = base();
        c.hungerPool = 4.0F;
        c.satiation = 0;
        c.nutrition = 1;
        c.starveProgress = 0.9995F;
        c.health = 20.0F;
        FoodGates.Result r = FoodGates.tick(c, false);
        // nutrition fell to 0, so the starve branch runs and rolls over
        assertEquals(0, r.nutrition);
        assertTrue(r.strike);
        assertEquals(FoodGates.Act.CONSUMED_NUTRITION, r.act);
    }

    @Test
    void reportCarriesTheWrittenBackState() {
        FoodGates.Ctx c = base();
        c.hungerPool = 10.0F;
        c.satiation = 4;
        c.nutrition = 4;
        FoodGates.Result r = FoodGates.tick(c, false);
        assertNear(c.hungerPool, r.hungerPool);
        assertEquals(c.satiation, r.satiation);
        assertEquals(c.nutrition, r.nutrition);
        assertNear(c.healProgress, r.healProgress);
    }
}
