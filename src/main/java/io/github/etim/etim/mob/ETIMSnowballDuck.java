package io.github.etim.etim.mob;

import net.minecraft.entity.Entity;

/**
 * B-62 D-6 — dev-harness seam for the snowball reaction mixin.
 *
 * <p>1.12 {@code EntityThrowable} latches the first entity it finds during its
 * first two ticks as {@code ignoreEntity}, so a snowball fired point-blank can
 * never hit a target that stands still. The {@code /etest elementalsnowimpact}
 * arm therefore injects the impact directly instead of simulating flight.</p>
 */
public interface ETIMSnowballDuck {

    void etim$injectImpact(Entity target);
}
