package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMEnchantments;
import io.github.etim.etim.mob.ETIMArrowLog;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.item.ItemBow;
import net.minecraft.item.ItemStack;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Quickness port face (batch enchant1, 条 241-245; 案甲 — 摸底 §2.2).
 *
 * <p>The R196 draw face replaces the velocity denominator: R196
 * {@code ItemBow:35-37 getTicksForMaxPull = 20 − round(10×L/5)} while 1.12
 * hard-codes {@code velocity = charge/20} into
 * {@code getArrowVelocity} ({@code ItemBow.java:175-186}, static, int-arg
 * only —终审 #44 判点亲钉). Redirecting the call site at {@code :107} cannot
 * reach the released stack (a static target hands the handler only its
 * args — no owner, no locals to capture), so the release arguments are
 * stashed in the head hook ({@code onPlayerStoppedUsing(stack, …)} carries
 * the bow itself) and consumed by the redirect on the same method — one
 * mixin, two hooks, orthodox capture.</p>
 *
 * <p>The altered path keeps the SAME polynomial and clamp
 * ({@code f=(f²+2f)/3, >1→1}) with the denominator {@code d(L)}; at
 * {@code charge == d} the return is the exact {@code 1.0F}, so the
 * {@code f == 1.0F} crit gate at {@code :120} is preserved for every level
 * (案丙形 discarded per 终审红线). Client face stays vanilla — the B-3
 * rendering drift («half-draw shows full bow») is logged, not silently
 * divergent: the redirect gates on the stashed {@code isRemote} flag.</p>
 */
@Mixin(ItemBow.class)
public abstract class MixinItemBow {

    /** The bow being released (server face; set at onPlayerStoppedUsing HEAD). */
    @Unique
    private static ItemStack etim$releaseBow;

    @Unique
    private static boolean etim$releaseRemote;

    @Inject(method = "onPlayerStoppedUsing", at = @At("HEAD"), remap = true)
    private void etim$stashReleaseBow(ItemStack stack, World worldIn, EntityLivingBase entityLiving,
                                      int timeLeft, CallbackInfo ci) {
        etim$releaseBow = stack;
        etim$releaseRemote = worldIn.isRemote;
    }

    @Redirect(
            method = "onPlayerStoppedUsing",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/item/ItemBow;getArrowVelocity(I)F"
            ),
            remap = true
    )
    private float etim$quicknessVelocity(int charge) {
        // Client face: vanilla render path (B-3 logged; not a judgment channel).
        if (etim$releaseRemote) {
            return ItemBow.getArrowVelocity(charge);
        }
        ItemStack bow = etim$releaseBow;
        int level = (bow == null || bow.isEmpty()) ? 0
                : EnchantmentHelper.getEnchantmentLevel(ETIMEnchantments.QUICKNESS, bow);
        if (level <= 0) {
            float vanilla = ItemBow.getArrowVelocity(charge);
            ETIMArrowLog.row("release charge=" + charge + " divisor=20 velocity="
                    + String.format("%.4f", vanilla) + " lvl=0 vanilla=1");
            return vanilla;
        }
        // R196 ItemBow:35-37 — d(L)=20−round(reduction×L/maxLevel)（reduction=10 ⇒ −2/级）.
        float d = 20.0F - Math.round(ETIMConfig.quicknessTicksReduction
                * ((float) level / ETIMConfig.quicknessMaxLevel));
        if (d < 1.0F) {
            d = 1.0F;
        }
        float f = charge / d;
        f = (f * f + 2.0F * f) / 3.0F;
        if (f > 1.0F) {
            f = 1.0F;
        }
        ETIMArrowLog.row("release charge=" + charge + " divisor=" + String.format("%.0f", d)
                + " velocity=" + String.format("%.4f", f) + " lvl=" + level);
        return f;
    }
}
