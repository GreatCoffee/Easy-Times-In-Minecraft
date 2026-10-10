package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMHunger;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.PlayerCapabilities;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Hard level cap (task 1.2): player levels stop at {@code ETIMConfig.levelCap}.
 *
 * <p>{@code addExperienceLevel} is the single funnel through which every
 * level increase flows: {@code addExperience} (XP points) loops
 * {@code addExperienceLevel(1)}, and commands/anvils call it directly.
 * Clamping the incoming amount here caps both paths. Decreases
 * (enchanting, future death penalty) are never clamped.</p>
 *
 * <p>Task 2.3 hunger penalties (both decision points inside
 * {@code onLivingUpdate}, single call sites each):
 * <ul>
 *   <li>Walk speed &times;0.75 while hungry — R196 charges the factor inside
 *       {@code PlayerCapabilities.getWalkSpeed()} (PlayerCapabilities.java:57:
 *       {@code hasFoodEnergy ? walkSpeed : walkSpeed * 0.75}) fed into
 *       {@code EntityPlayer.onLivingUpdate}'s {@code setBaseValue}.</li>
 *   <li>Air movement &times;0.75 while hungry — R196 multiplies
 *       {@code jumpMovementFactor} right after the sprint additive
 *       (EntityPlayer.java:693-695); in vanilla 1.12 the only later call in
 *       that method is {@code setAIMoveSpeed}, used as the injection point
 *       (the flying branch overrides the field itself in {@code travel},
 *       untouched, same as R196).</li>
 * </ul></p>
 */
@Mixin(EntityPlayer.class)
public abstract class MixinEntityPlayer {

    @ModifyVariable(method = "addExperienceLevel", at = @At("HEAD"), argsOnly = true, ordinal = 0)
    private int etim$clampLevelGain(int levels) {
        if (levels <= 0) {
            return levels;
        }
        EntityPlayer self = (EntityPlayer) (Object) this;
        int allowed = ETIMConfig.levelCap - self.experienceLevel;
        return Math.min(levels, Math.max(0, allowed));
    }

    @Redirect(
            method = "onLivingUpdate",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/player/PlayerCapabilities;getWalkSpeed()F"
            ),
            require = 1
    )
    private float etim$hungerWalkSpeed(PlayerCapabilities capabilities) {
        float speed = capabilities.getWalkSpeed();
        if (ETIMConfig.hungerMoveFactor >= 1.0F || ETIMHunger.hasFoodEnergy((EntityPlayer) (Object) this)) {
            return speed;
        }
        return speed * ETIMConfig.hungerMoveFactor;
    }

    @Inject(
            method = "onLivingUpdate",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/player/EntityPlayer;setAIMoveSpeed(F)V"
            ),
            require = 1
    )
    private void etim$hungerAirFactor(CallbackInfo ci) {
        if (ETIMConfig.hungerMoveFactor >= 1.0F || ETIMHunger.hasFoodEnergy((EntityPlayer) (Object) this)) {
            return;
        }
        // jumpMovementFactor is public on EntityLivingBase — no shadow needed.
        ((EntityPlayer) (Object) this).jumpMovementFactor *= ETIMConfig.hungerMoveFactor;
    }
}
