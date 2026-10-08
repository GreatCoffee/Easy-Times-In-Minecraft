package io.github.etim.etim.mixins;

import io.github.etim.etim.playerstate.PlayerStatLimits;
import net.minecraft.client.Minecraft;
import net.minecraftforge.client.GuiIngameForge;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.Constant;
import org.spongepowered.asm.mixin.injection.ModifyConstant;

/**
 * HUD icon counts follow the level caps (task 1.2, MITE visual).
 *
 * <p>Health hearts already follow the synced MAX_HEALTH attribute
 * (no HUD hook needed). The food bar has no such attribute:
 * GuiIngameForge.renderFood draws a fixed 10 shanks. This replaces the
 * loop bound with the icon count derived from the local player's
 * (vanilla-synced) level: 3 shanks at level 0, growing to 10 at 35+.</p>
 *
 * <p>{@code 10} appears twice in the method (the {@code right_height += 10}
 * row spacing first, the loop bound second), hence {@code ordinal = 1}.
 * GuiIngameForge is a Forge class with stable (non-obfuscated) member
 * names, so the injection is {@code remap = false}.</p>
 */
@Mixin(GuiIngameForge.class)
public abstract class MixinGuiIngameForge {

    @ModifyConstant(method = "renderFood", constant = @Constant(intValue = 10, ordinal = 1), require = 1, remap = false)
    private int etim$foodIconCount(int original) {
        // Same player the vanilla loop reads its FoodStats from (GuiIngame.mc).
        return PlayerStatLimits.getIconCount(Minecraft.getMinecraft().player.experienceLevel);
    }
}
