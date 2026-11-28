package io.github.etim.etim.combat;

/**
 * Melee 三项附魔的纯算术（B-70VA）。
 *
 * <p>对应 R196 {@code EntityPlayer.attackTargetEntityWithCurrentItem} 里
 * stun / vampiric / disarming 三段的判定与数值部分；Ctx 之外的世界影响
 * （发效果、回血、掉手持物）仍留在 {@link ETIMMelee}。</p>
 */
public final class MeleeGates {

    private MeleeGates() {
    }

    /** R196 stun :{@code level > rand * divisor}。 */
    public static boolean stunPasses(int level, float roll) {
        return level > roll;
    }

    /** 缓慢等级：每级 {@code perLevel} 点。 */
    public static int stunAmplitude(int level, int perLevel) {
        return perLevel * level;
    }

    /** 缓慢时长（tick）：每级 {@code perLevel} tick。 */
    public static int stunDuration(int level, int perLevel) {
        return perLevel * level;
    }

    /** R196 vampiric :{@code max((int)(damage * factor * rand), min)}。 */
    public static int vampiricTransfer(float damage, float factor, float roll, int min) {
        int transfer = (int) (damage * factor * roll);
        return transfer < min ? min : transfer;
    }

    /** R196 disarming :{@code rand < level / maxLevel}。 */
    public static boolean disarmPasses(int level, float roll, int maxLevel) {
        if (maxLevel <= 0) {
            return false;
        }
        return roll < (float) level / (float) maxLevel;
    }
}
