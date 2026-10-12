package io.github.etim.etim.mixins;

import io.github.etim.etim.playerstate.ETIMXp;
import net.minecraft.inventory.ContainerEnchantment;
import net.minecraft.entity.player.EntityPlayer;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Audit 13 §2.3 bridge: R196's enchantment charges {@code levels × 100}
 * POINTS from the SINGLE experience pool — NOT levels (vanilla 1.12's
 * {@code addExperienceLevel(−cost)} leaves {@code experienceTotal} untouched,
 * breaking the one-pool guarantee the quality budget depends on).
 *
 * <p>Vanilla's sufficiency check reads the level, which under the R196 curve
 * is derived from the same pool — near-equivalent for the cut-off; the
 * deduction itself is redirected to the pool arithmetic.</p>
 */
@Mixin(ContainerEnchantment.class)
public abstract class MixinContainerEnchantment {

    @Redirect(
            method = "enchantItem",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/entity/player/EntityPlayer;addExperienceLevel(I)V")
    )
    private void etim$r196EnchantPoints(EntityPlayer player, int amount) {
        if (amount < 0) {
            // negative level-change == the enchant fee: levels × 100 points
            ETIMXp.applyTotal(player, player.experienceTotal + amount * 100);
        } else {
            player.addExperienceLevel(amount);
        }
    }
}
