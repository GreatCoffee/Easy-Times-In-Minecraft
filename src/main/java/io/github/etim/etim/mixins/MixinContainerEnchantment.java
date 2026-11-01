package io.github.etim.etim.mixins;

import io.github.etim.etim.playerstate.ETIMXp;
import net.minecraft.inventory.ContainerEnchantment;
import net.minecraft.enchantment.EnchantmentData;
import net.minecraft.entity.player.EntityPlayer;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

import java.util.List;
import java.util.Random;

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

    @Shadow
    @Final
    private Random rand;

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

    /**
     * D-2 (batch E, 条 232/终审 B-1): R196 produces an enchanted book with
     * EXACTLY one enchantment (ContainerEnchantment.java:180-191); vanilla
     * 1.12 only removes one random entry at getEnchantmentList:339-342,
     * leaving 1..n results (书 1 条 0.8016／2 条 0.1667／3 条 0.0292／≥4 0.0024).
     * The branch that calls {@code List.remove(int)} is vanilla's own
     * {@code item == BOOK && size > 1} gate, so non-book stacks and
     * single-entry pools reach this handler zero times. We mirror R196's
     * single {@code rand.nextInt(size)} draw and keep exactly one entry —
     * the target semantics of the «R196 附魔系统移植» batch, implemented on
     * the minimal face (条 count only; the selection loop itself stays
     * vanilla, per D- 裁红线).
     */
    @Redirect(
            method = "getEnchantmentList",
            at = @At(value = "INVOKE",
                    target = "Ljava/util/List;remove(I)Ljava/lang/Object;")
    )
    private Object etim$r196BookSingle(List<EnchantmentData> list, int index) {
        if (list.size() > 1) {
            EnchantmentData keep = list.get(this.rand.nextInt(list.size()));
            list.clear();
            list.add(keep);
        }
        return null;
    }
}
