package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMDamageLog;
import io.github.etim.etim.combat.R196ArmorModel;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.util.NonNullList;
import net.minecraft.util.DamageSource;
import net.minecraft.item.ItemStack;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Batch D armor-face mixin — the PLAYER path of the three injections (A-1①).
 * Target = the Forge static inner class {@code ISpecialArmor$ArmorProperties}
 * whose {@code applyArmor} (public static float, {@code common/ISpecialArmor
 * .java:132-249}) is the ONLY numeric exit on the player path
 * ({@code entity/player/EntityPlayer.java:1229}; the overridden
 * {@code damageEntity} keeps the mob mixin's OWN armor face out of the player
 * path — hard finding 4 = the player {@code totalArmor} takes the ARMOR
 * attribute only, so the R196 mapping MUST self-compute, it cannot borrow the
 * attribute).
 *
 * <p>remap = false — the Forge-class precedent already in service:
 * {@code mixins/MixinSidedInvWrapper.java:29} (audit20-90 pin ④).</p>
 *
 * <ul>
 *   <li>{@code applyArmor} @RETURN cancellable: the exit value rides the R196
 *       single body (A-1①). Model off = vanilla value logged untouched
 *       (D-36①).</li>
 *   <li>D-34①: the 1.12 per-piece wear — the
 *       {@code stack.damageItem((int)armorDamage, entity)} inside {@code
 *       applyArmor (:234)} — MUST be swallowed, else it double-counts with the
 *       R196 integer-point split inside {@code finalDamage} (audit20-90 pin
 *       ⑤). Byte-located: the two {@code damageItem} calls in {@code
 *       applyArmor} sit at :212 (the AbsorbRatio support section) first and
 *       :234 second → {@code ordinal=1}. The :212 call (pieces with custom
 *       absorb) is NOT touched — D-35① drops foreign mod pieces entirely
 *       (their AbsorbRatio lowers the exit value in place, R196 has no
 *       corresponding concept, no double-count from this side).</li>
 * </ul>
 */
@Mixin(targets = "net.minecraftforge.common.ISpecialArmor$ArmorProperties", remap = false)
public abstract class MixinSpecialArmorProperties {

    @Inject(method = "applyArmor", at = @At("RETURN"), cancellable = true)
    private static void etim$r196PlayerArmor(EntityLivingBase entity, NonNullList<ItemStack> inventory,
            DamageSource source, double damage, CallbackInfoReturnable<Float> cir) {
        if (ETIMConfig.armorModelR196) {
            cir.setReturnValue(R196ArmorModel.finalDamage(entity, source, (float) damage));
        } else {
            ETIMDamageLog.armorValue(entity, (float) damage, cir.getReturnValue()); // D-36①
        }
    }

    /**
     * D-34① — swallow the :234 per-piece wear (the second of the two
     * {@code damageItem} calls; the first, :212, is the AbsorbRatio support
     * and keeps its call).
     */
    @Redirect(method = "applyArmor", at = @At(value = "INVOKE",
            target = "Lnet/minecraft/item/ItemStack;damageItem(ILnet/minecraft/entity/EntityLivingBase;)V",
            ordinal = 1), require = 1)
    private static void etim$suppressVanillaWear(ItemStack stack, int amount, EntityLivingBase entity) {
        // R196 wear already done inside finalDamage (InventoryPlayer.:681-720 face) — empty body.
    }
}
