package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMBlockLog;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.item.ItemStack;
import net.minecraft.util.DamageSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * AD-10+SH step 1 (the gate — 批文 §四 三步序红线: this lands FIRST; opening
 * the MixinItem BLOCK face before it would arm the vanilla full-free path and
 * every carry would block at 100% instead of 50%).
 *
 * <p>R196 has no {@code canBlockDamageSource} body at all — the 1.12 shield
 * full-free segment ({@code entity/EntityLivingBase.java:996-1012},
 * {@code amount = 0}) must go off. This method is {@code private} with
 * exactly ONE caller ({@code :996}; 会话五 javap 卷 112-b), so one HEAD
 * cancellable injection does both jobs (对照报告 §9.1):</p>
 * <ul>
 *   <li>b 档: the whole vanilla {@code amount = 0} segment turns dead — the
 *       shield's defense now rides {@code ETIMBlocking#onLivingHurt}
 *       (50% + R196 减算链) instead;</li>
 *   <li>d 档保险丝: a TOOL carrier can never reach {@code :996}'s condition
 *       later either — even if {@code Item} carries {@code EnumAction.BLOCK}
 *       after step 2, this body returns {@code false} before any direction
 *       dot-product, so tools can NEVER take the vanilla free path.</li>
 * </ul>
 *
 * <p>{@code isActiveItemStackBlocking} (:3113-3132) has no other caller than
 * this body (javadp 卷 112-b) — no second injection needed. The vanilla method
 * body is left un-deleted (§9.3口径: 只登记不删).</p>
 */
@Mixin(EntityLivingBase.class)
public abstract class MixinEntityLivingBaseBlock {

    @Inject(method = "canBlockDamageSource(Lnet/minecraft/util/DamageSource;)Z",
            at = @At("HEAD"), cancellable = true)
    private void etim$blockGate(DamageSource source, CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.blockModel) {
            return;                                     // W14 ①: gate off = vanilla shield untouched
        }
        ItemStack active = ((EntityLivingBase) (Object) this).getActiveItemStack();
        if (active.isEmpty()) {
            return;                                     // nothing in use — vanilla already returns false here
        }
        // §9.1 min-face: only a live use stack matters (else the row is noise)
        ETIMBlockLog.gate((EntityLivingBase) (Object) this, source, active);
        cir.setReturnValue(false);                      // b 档: the full-free segment is closed
    }
}
