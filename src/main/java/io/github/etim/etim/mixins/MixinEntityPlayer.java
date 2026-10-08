package io.github.etim.etim.mixins;

import io.github.etim.etim.playerstate.PlayerStatLimits;
import net.minecraft.entity.player.EntityPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.ModifyVariable;

/**
 * Hard level cap (task 1.2): player levels stop at
 * {@link PlayerStatLimits#LEVEL_CAP}.
 *
 * <p>{@code addExperienceLevel} is the single funnel through which every
 * level increase flows: {@code addExperience} (XP points) loops
 * {@code addExperienceLevel(1)}, and commands/anvils call it directly.
 * Clamping the incoming amount here caps both paths. Decreases
 * (enchanting, future death penalty) are never clamped.</p>
 */
@Mixin(EntityPlayer.class)
public abstract class MixinEntityPlayer {

    @ModifyVariable(method = "addExperienceLevel", at = @At("HEAD"), argsOnly = true, ordinal = 0)
    private int etim$clampLevelGain(int levels) {
        if (levels <= 0) {
            return levels;
        }
        EntityPlayer self = (EntityPlayer) (Object) this;
        int allowed = PlayerStatLimits.LEVEL_CAP - self.experienceLevel;
        return Math.min(levels, Math.max(0, allowed));
    }
}
