package io.github.etim.etim.hunger;

/**
 * 移动饥饿的纯算术（B-70UV）。
 *
 * <p>{@code ETIMEndurance.chargeMovement} 的判定（水/梯/地面/跳跃）留在原地，
 * 只把「位移 → 厘米」「每米费率 → 扣量」两段算术抽出来。
 * R196 EntityPlayer addMovementStat 的口径：厘米 = round(水平距离 × 100)，
 * 潜行/睡眠时为 0；游泳按 3D，行走按 2D。</p>
 */
public final class EnduranceGates {

    private EnduranceGates() {
    }

    /**
     * 位移换算的厘米数（R196 :1700-1720 的 {@code Math.round(dist * 100)}）。
     *
     * @param dx        X 位移
     * @param dy        Y 位移（{@code includeVertical} 为真时计入）
     * @param dz        Z 位移
     * @param vertical  是否按 3D 距离（游泳/潜水为真，行走为假）
     * @param sleeping  睡在床上时恒 0（R196 静息面）
     */
    public static int distanceCm(double dx, double dy, double dz, boolean vertical, boolean sleeping) {
        if (sleeping) {
            return 0;
        }
        double sq = dx * dx + dz * dz + (vertical ? dy * dy : 0.0D);
        return Math.round((float) Math.sqrt(sq) * 100.0F);
    }

    /** 每米费率折算：{@code rate * cm * 0.01F}（R196 的 {@code * 0.01} 面）。 */
    public static float perMeter(float ratePerMeter, int cm) {
        return ratePerMeter * cm * 0.01F;
    }

    /**
     * 梯子：只按向上的 dy 计，费率＝{@code dy / ladderHungerDivisor}。
     * 向下或原地不掉饥饿（R196 :1714-1718）。
     */
    public static float ladderDrain(double dy, float divisor) {
        return dy > 0.0D ? (float) dy / divisor : 0.0F;
    }
}
