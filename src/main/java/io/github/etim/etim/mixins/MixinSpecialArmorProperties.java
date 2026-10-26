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
 *   <li>{@code applyArmor} @HEAD cancellable (armorD-recheck A-3 = fix a):
 *       model ON returns the R196 single body with the raw incoming
 *       {@code damage} (the old @RETURN face saw the CombatRules-multiplied
 *       local — double-count); the vanilla body is skipped, so the former
 *       D-34 wear-suppression {@code @Redirect} on ISpecialArmor.:234 is
 *       retired (R196 wear is the split inside {@code finalDamage}).</li>
 *   <li>{@code applyArmor} @RETURN audit-logger: model OFF only — the vanilla
 *       value logged untouched (D-36①, the W19 audit face runs the full
 *       vanilla body including its per-piece wear).</li>
 * </ul>
 */
@Mixin(targets = "net.minecraftforge.common.ISpecialArmor$ArmorProperties", remap = false)
public abstract class MixinSpecialArmorProperties {

    /**
     * armorR196 @HEAD cancellable (armorD-recheck A-3 = fix a): the vanilla
     * multiplicative body is skipped entirely when the model is ON (the @RETURN
     * read saw the CombatRules-multiplied local — double-count); the R196 wear
     * face rides {@link R196ArmorModel#finalDamage} ({@code damageArmorR196},
     * InventoryPlayer.:681-720), so the former D-34 wear-suppression
     * {@code @Redirect} on the :234 {@code damageItem} is RETIRED (its body
     * never executes under the model; W19's model-off face runs full vanilla
     * wear again). Model OFF = no-op here, vanilla body runs, @RETURN below
     * logs the vanilla value (D-36①).
     */
    @Inject(method = "applyArmor", at = @At("HEAD"), cancellable = true)
    private static void etim$r196PlayerArmorHead(EntityLivingBase entity, NonNullList<ItemStack> inventory,
            DamageSource source, double damage, CallbackInfoReturnable<Float> cir) {
        if (ETIMConfig.armorModelR196) {
            cir.setReturnValue(R196ArmorModel.finalDamage(entity, source, (float) damage));
        }
    }

    @Inject(method = "applyArmor", at = @At("RETURN"), cancellable = true)
    private static void etim$r196PlayerArmorReturn(EntityLivingBase entity, NonNullList<ItemStack> inventory,
            DamageSource source, double damage, CallbackInfoReturnable<Float> cir) {
        // body only executes when the model is OFF — D-36①: vanilla value logged untouched
        if (!ETIMConfig.armorModelR196) {
            ETIMDamageLog.armorValue(entity, (float) damage, cir.getReturnValue());
        }
    }
}
