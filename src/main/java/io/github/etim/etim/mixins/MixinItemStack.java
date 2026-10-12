package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.quality.EnumQuality;
import io.github.etim.etim.quality.ETIMQuality;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Batch 3: the quality durability write-through. R196 Item:917-925 (audit
 * task 10 §3.1) — {@code getMaxDamage(quality)} =
 * {@code max(round(maxDamage × durability_modifier), 1)} when a quality is
 * present and NOT average.
 *
 * <p>Hook choice (batch-3 design document §一 "MixinItem.setMaxDamage
 * redirect" refined during落码): the per-stack gate
 * {@code ItemStack.getMaxDamage()} is the consumer entrypoint of the whole
 * durability chain (bars, attemptDamageItem caps, anvil repair math all read
 * it), and — unlike {@link net.minecraft.item.Item#getMaxDamage(ItemStack)},
 * which is a forge-patch method with no MCP stable mapping (obf-name space
 * unreliable) — it is a stable vanilla method ({@code func_77958_k} in the
 * MCP table), so the override applies identically in dev and obf builds.</p>
 */
@Mixin(ItemStack.class)
public abstract class MixinItemStack {

    @Inject(
            method = "getMaxDamage()I",
            at = @At("RETURN"),
            cancellable = true
    )
    private void etim$qualityMaxDamage(CallbackInfoReturnable<Integer> cir) {
        if (!ETIMConfig.qualitySystem) {
            return;
        }
        ItemStack self = (ItemStack) (Object) this;
        if (self.isEmpty()) {
            return;
        }
        EnumQuality quality = ETIMQuality.get(self);
        if (quality == null || quality == EnumQuality.AVERAGE) {
            return;
        }
        cir.setReturnValue(Math.max(Math.round(cir.getReturnValue() * quality.getDurabilityModifier()), 1));
    }
}
