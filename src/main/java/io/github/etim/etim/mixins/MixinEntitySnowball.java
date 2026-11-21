package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityEarthElemental;
import io.github.etim.etim.mob.ETIMEntityFireElemental;
import io.github.etim.etim.mob.ETIMSnowballDuck;
import net.minecraft.entity.Entity;
import net.minecraft.entity.projectile.EntitySnowball;
import net.minecraft.util.DamageSource;
import net.minecraft.util.math.RayTraceResult;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * B-62 D-6 �� R196 {@code EntitySnowball.java:17-45}: a snowball hitting the
 * fire elemental deals 3 damage (and quenches the wet state), a snowball
 * hitting a magma-type earth elemental knocks it back to its normal type.
 * Vanilla 1.12 only special-cases blazes, so the damage site is redirected.
 *
 * <p>{@link ETIMSnowballDuck#etim$injectImpact(Entity)} exists only for the dev
 * harness: 1.12 {@code EntityThrowable} latches the first entity it sees during
 * its first two ticks as {@code ignoreEntity}, so a deterministic
 * flying-snowball probe is not possible.</p>
 */
@Mixin(EntitySnowball.class)
public abstract class MixinEntitySnowball implements ETIMSnowballDuck {

    @Override
    public void etim$injectImpact(Entity target) {
        ((EntitySnowballInvoker) (Object) this).etim$callOnImpact(new RayTraceResult(target));
    }

    @Redirect(method = "onImpact",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/entity/Entity;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z"),
            require = 1)
    private boolean etim$snowballReaction(Entity target, DamageSource source, float amount) {
        if (!ETIMConfig.mobElementalR196) {
            return target.attackEntityFrom(source, amount);
        }
        if (target instanceof ETIMEntityFireElemental) { // R196 :22-26
            boolean hit = target.attackEntityFrom(source, 3.0F);
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[ElementalLog] snowball kind=fire dealt=3.000 hit={} entity={} [server]",
                        hit, target.getEntityId());
            }
            return hit;
        }
        if (target instanceof ETIMEntityEarthElemental
                && ((ETIMEntityEarthElemental) target).isMagma()) { // R196 :38-39
            ((ETIMEntityEarthElemental) target).convertToNormal(true);
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[ElementalLog] snowball kind=earth quench=true entity={} [server]",
                        target.getEntityId());
            }
            return true;
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[ElementalLog] snowball other cls=" + target.getClass().getSimpleName()
                    + " entity=" + target.getEntityId() + " [server]");
        }
        return target.attackEntityFrom(source, amount);
    }
}
