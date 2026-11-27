package io.github.etim.etim.farm;

/**
 * B-70UQ: the pure half of the R196 growth-rate faces (crops and stems).
 *
 * <p>Faces: BlockGrowingPlant.java:38-84 (proximity), :162-221 (composition and
 * stem tail), BlockCrops.java:205-207 (fertilized factor), and the daylight
 * light window shared by every crop tick. Biome temperature, the world block
 * reads and the vanilla dice chain stay in {@link ETIMFarm}.</p>
 *
 * <p>中文：气温惩罚、四邻靠近惩罚、连乘次序、光照窗口 —— 四段纯算术。生物群系取温、
 * 世界读块、原版骰子链仍留在调用方。</p>
 */
public final class GrowthGates {

    private GrowthGates() {
    }

    /** Distance outside {@code [lo, hi]} costs {@code 1 - delta/tolerance}, floored at 0. */
    public static float tempModifier(float temperature, float lo, float hi, float tolerance) {
        float delta = temperature < lo ? lo - temperature : (temperature > hi ? temperature - hi : 0.0F);
        return Math.max(1.0F - delta / tolerance, 0.0F);
    }

    /**
     * BlockGrowingPlant.java:64-84 — zero neighbours ×0.5; one neighbour without a
     * rank-2 extension ×0.75; otherwise ×1.0 (stems skip this face entirely).
     */
    public static float proximity(int neighbours, boolean extension) {
        if (neighbours > 1) {
            return 1.0F;
        }
        if (neighbours == 0) {
            return 0.5F;
        }
        return extension ? 1.0F : 0.75F;
    }

    /** The literal R196 multiplication order; the fertilized factor only applies when set. */
    public static float compose(float base, boolean fertilized, float fertilizedFactor,
                                float tempMod, float humMod, float globalMod, float proxMod) {
        float value = base;
        if (fertilized) {
            value *= fertilizedFactor; // BlockCrops.java:205-207 order face
        }
        value *= tempMod;
        value *= humMod;
        value *= globalMod;
        value *= proxMod;
        return value;
    }

    /**
     * Daylight window: below the floor always blocks; above the ceiling blocks
     * everything except stems (R196 BlockStem :218-221 keeps growing in the dark).
     */
    public static boolean lightBlocked(int light, boolean stem, int min, int max) {
        return light < min || (!stem && light > max);
    }
}
