package io.github.etim.etim.mixins;

import io.github.etim.etim.playerstate.ETIMXp;
import net.minecraft.inventory.ContainerEnchantment;
import net.minecraft.enchantment.EnchantmentData;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemStack;
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
 * {@code onEnchant(−cost)} mutates only {@code experienceLevel}, leaving
 * {@code experienceTotal} untouched, breaking the one-pool guarantee the
 * quality budget depends on).
 *
 * <p>W63-A-2 re-pinning (batch E, 条 235): the bridge was DEAD from birth —
 * the original redirect aimed {@code addExperienceLevel} at
 * {@code enchantItem}, but 1.12.2 calls {@code EntityPlayer.onEnchant}
 * instead (byte-verified: zero {@code addExperienceLevel} call sites in
 * {@code enchantItem}). The fee now intercepts the {@code onEnchant} CALL
 * site itself: points go through {@link ETIMXp#applyTotal}, the level ladder
 * re-derives from the one pool, and the fresh-seed rotation rides vanilla
 * {@code onEnchant(stack, 0)}.</p>
 */
@Mixin(ContainerEnchantment.class)
public abstract class MixinContainerEnchantment {

    @Shadow
    @Final
    private Random rand;

    @Redirect(
            method = "enchantItem",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/entity/player/EntityPlayer;onEnchant(Lnet/minecraft/item/ItemStack;I)V")
    )
    private void etim$r196EnchantPoints(EntityPlayer player, ItemStack stack, int cost) {
        if (cost <= 0) {
            player.onEnchant(stack, cost);
            return;
        }
        // R196 single-pool fee (audit 13 §2.3, C-3 re-pinned here): cost is the
        // slot level the table showed, fee = levels × 100 POINTS
        // (R196 Enchantment.java:96-98). applyTotal re-derives level/bar from
        // the ONE pool — vanilla's onEnchant level mutation must NOT also run.
        ETIMXp.applyTotal(player, player.experienceTotal - cost * 100);
        // Keep vanilla's fresh-seed rotation: onEnchant(stack, 0) is the
        // xpSeed rotation face only (level -= 0 no-op) — no accessor needed.
        player.onEnchant(stack, 0);
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
