package io.github.etim.etim.mixins;

import net.minecraft.entity.projectile.EntitySnowball;
import net.minecraft.util.math.RayTraceResult;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

/** Accessor for the protected {@code EntitySnowball.onImpact}. */
@Mixin(EntitySnowball.class)
public interface EntitySnowballInvoker {

    @Invoker("onImpact")
    void etim$callOnImpact(RayTraceResult result);
}
