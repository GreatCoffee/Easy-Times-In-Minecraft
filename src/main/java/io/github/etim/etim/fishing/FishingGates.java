package io.github.etim.etim.fishing;

/**
 * R196 钓鱼咬钩的纯算术（B-70UV）。
 *
 * <p>{@link ETIMFishing#tickBite} 里有四段与世界/实体打交道的门（水、鱼、可及、
 * 粒子），中间的时钟与级联链只吃整数和配置值——抽到这里，单测能秒级验证
 * R196 {@code EntityFishHook :153-174} 的取整与乘链，不必起服。</p>
 */
public final class FishingGates {

    private FishingGates() {
    }

    /** R196 World:1686-1692 {@code getAdjustedTimeOfDay = (tod + 6000) % 24000}. */
    public static int adjustedTime(long worldTime) {
        return (int) ((worldTime + 6000L) % 24000L);
    }

    /** R196 :154-158 — 距两个咬钩高峰（5500 / 17500）的较近者，单位 tick。 */
    public static int clockDistance(int adjustedTime) {
        return Math.min(Math.abs(adjustedTime - 5500), Math.abs(adjustedTime - 17500));
    }

    /** R196 World:2395 — 每 128 天的蓝月日（白天另由调用方否决）。 */
    public static boolean blueMoonCycle(long totalWorldTime) {
        return (totalWorldTime / 24000L + 1L) % 128L == 0L;
    }

    /**
     * 级联链 {@code ci0..ci4}（R196 :154-174）。
     *
     * <pre>
     * ci0 = blueMoon ? clamp(600) : clamp(600 * dist / 600)
     * ci1 = light ? ci0/2 : ci0        (雷雨减半)
     * ci2 = ci1                        (技能面关闭，条 270)
     * ci3 = ci2 * fortuneFactor^(fortune+lure)
     * ci4 = max(worm ? ci3*wormFactor : ci3, 1)
     * </pre>
     */
    public static int[] cascade(int adjustedTime, int fortune, int lure, boolean worm, boolean light,
                                boolean blueMoon, int chanceMin, int chanceMax,
                                float fortuneFactor, float wormFactor) {
        int dist = clockDistance(adjustedTime);
        float timeFactor = dist / 600.0F;
        int ci0 = blueMoon
                ? clamp(600, chanceMin, chanceMax)
                : clamp((int) (600.0F * timeFactor), chanceMin, chanceMax);
        int ci1 = light ? ci0 / 2 : ci0;
        int ci2 = ci1;
        int ci3 = ci2;
        for (int i = 0; i < fortune + lure; i++) {
            ci3 = (int) (ci3 * fortuneFactor);
        }
        int ci4 = worm ? (int) (ci3 * wormFactor) : ci3;
        ci4 = Math.max(ci4, 1);
        return new int[]{ci0, ci1, ci2, ci3, ci4};
    }

    private static int clamp(int value, int min, int max) {
        return value < min ? min : (value > max ? max : value);
    }
}
