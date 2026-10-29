package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;

import net.minecraft.util.DamageSource;

/**
 * 盾的**数值契约**（盾面削弱批 M-1/M-2；签名 <b>D-5 冻结</b>，变更走主账本 +
 * 同步通知附属）。本体只持「怎么算」，附属持「值多少」：两道方法都吃
 * {@link DamageSource}，因为银盾的幽魂面（65% / 磨率 0.5×）**只能**由伤害来源
 * 区分；返回的是**减伤比例**（0..1，不是保留系数）。
 *
 * <p>The numeric contract of a shield. The main mod owns "how to compute"; the
 * add-on owns "how much". Both take the source because the silver shield has
 * two faces that only the source can tell apart. Published = frozen API.</p>
 *
 * <p>分发口径（M-3）：{@code ETIMBlocking} 三支 ——
 * ① {@code getItem() instanceof ETIMShield} → 读接口实现（附属五盾多态）；
 * ② vanilla {@code ItemShield} → 木盾常量 {@link ETIMConfig#shieldWoodReduction}/1.0
 * （= 现行 ÷2 逐位不变）；③ 其余 → 不接本契约。本接口不覆盖 {@code Item#isShield}
 * 语义（附魔台/铁砧/stat/配方全保留）。</p>
 */
public interface ETIMShield {

    /**
     * 被挡掉的比例 0..1（举盾受击时，先于护甲减算）。
     * Fraction of incoming damage the shield removes, in 0..1, applied BEFORE
     * the armor step. default = 木盾常量.
     */
    default float getBlockReduction(DamageSource source) {
        return ETIMConfig.shieldWoodReduction;
    }

    /**
     * 相对全局 {@link ETIMConfig#shieldWearRateBase} 的磨损倍率。
     * Wear multiplier relative to the global base rate. default = 1.0（无差分）。
     */
    default float getWearMultiplier(DamageSource source) {
        return 1.0F;
    }
}
