package io.github.etim.etim.combat;

import java.util.Collections;
import java.util.Set;
import java.util.WeakHashMap;

import net.minecraft.util.DamageSource;
import net.minecraft.util.EntityDamageSource;

/**
 * 幽魂位的本体侧表（盾面削弱批 M-6；镜像 R1971 {@code DamageSource.java:213-225}
 * 银位的**读法原型**——R196 是「攻击者持银」消费于幽魂 {@code isImmuneTo}，本批
 * 是「攻击者是幽魂」，方向与载体双重自创，账本已明标 provenance (b)）。
 *
 * <p>侧表 = {@code WeakHashMap} 支撑的 {@link Set}：{@code DamageSource} 逐次
 * 攻击新建，源对象失引用即释放——无泄漏、无残留跨击。</p>
 *
 * <p><b>C 级风险护栏</b>：{@code markSpectral} 加类型门——非
 * {@link EntityDamageSource}（静态单例如 {@code DamageSource.magic} 一类全在
 * 门外）一律拒绝并打 {@code [BlockLog] ghost-mark rejected} 警行（无门直打：
 * 异常路径才触发，不依赖 dev 开关，护栏证据不丢）。幽魂判定语义 =
 * 「有实体攻击者的伤害源」（真怪/bot 假人都满足）。</p>
 */
public final class ETIMGhost {

    private static final Set<DamageSource> SPECTRAL =
            Collections.synchronizedSet(Collections.newSetFromMap(new WeakHashMap<>()));

    private ETIMGhost() {
    }

    /**
     * 幽魂实体（夜翼/暗影/尸魂）攻击发起时上标。Mark the attack source as
     * ghost-struck. {@return true 如果接收并入表；false 被 C 级类型门拒绝}
     * (true if accepted; false when rejected by the type gate).
     */
    public static boolean markSpectral(DamageSource source) {
        if (source == null) {
            return false;
        }
        if (!(source instanceof EntityDamageSource)) {
            // C 级护栏:静态单例进不了标记口 —— 误标路径不可达。
            io.github.etim.etim.ETIM.LOGGER.info(
                    "[BlockLog] ghost-mark rejected src=" + source.getDamageType() + " [server]");
            return false;
        }
        SPECTRAL.add(source);
        return true;
    }

    /** 附属盾的两面读口：物理面 / 幽魂面。The two-face read the add-on shields branch on. */
    public static boolean isSpectral(DamageSource source) {
        return source != null && SPECTRAL.contains(source);
    }
}
