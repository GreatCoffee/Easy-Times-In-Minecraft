package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMDamageLog;
import io.github.etim.etim.combat.R196ArmorModel;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.util.DamageSource;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Batch D armor-face mixin — the MOB path of the three injections (A-1①,
 * audit20-89/90); the player path rides MixinSpecialArmorProperties and the
 * player {@code damageEntity} row rides MixinEntityPlayer (the overridden
 * {@code entity/player/EntityPlayer.java:1223} body keeps this mixin's own
 * {@code damageEntity} injections from ever firing for players — the two
 * begin/end pairs are single-dispatch each, audit20-90 pin).
 *
 * <ul>
 *   <li>{@code applyArmorCalculations} @RETURN (1.12
 *       {@code entity/EntityLivingBase.java:1509-1518}): the ONLY mob numeric
 *       exit — replaced by the R196 single body (A-1①). Model off = the
 *       vanilla value is logged untouched (D-36① A/B face).</li>
 *   <li>{@code applyPotionDamageCalculations} @HEAD (:1523-1554): when the
 *       model is ON it must return the incoming value CONSTANTLY (A-6①,
 *       audit20-90 pin ②) — the resistance/enchant protections are already
 *       flat-weighted inside {@code finalDamage}, any pass-through of the
 *       vanilla multiplicative body double-counts. No logging here (the R196
 *       face has no vanilla-corresponding potion step).</li>
 * </ul>
 *
 * <p>D-34/D-35 live in {@link MixinSpecialArmorProperties}; the R196 wear
 * body for players rides {@code R196ArmorModel.damageArmorR196} — mobs have
 * NO armor-wear face in either generation (R196
 * {@code EntityLivingBase.java:1368-1369} empty = 1.12 baseline :1498-1500).</p>
 */
@Mixin(EntityLivingBase.class)
public abstract class MixinEntityLivingBaseDamage {

    @Inject(method = "applyArmorCalculations", at = @At("RETURN"), cancellable = true)
    private void etim$r196Armor(DamageSource source, float damage, CallbackInfoReturnable<Float> cir) {
        EntityLivingBase self = (EntityLivingBase) (Object) this;
        if (ETIMConfig.armorModelR196) {
            cir.setReturnValue(R196ArmorModel.finalDamage(self, source, damage));
        } else {
            ETIMDamageLog.armor(self, damage, cir.getReturnValue()); // D-36①: log the vanilla value only
        }
    }

    @Inject(method = "applyPotionDamageCalculations", at = @At("HEAD"), cancellable = true)
    private void etim$r196Potion(DamageSource source, float damage, CallbackInfoReturnable<Float> cir) {
        if (ETIMConfig.armorModelR196) {
            cir.setReturnValue(damage); // A-6①: constantly return the incoming value
        }
    }

    @Inject(method = "damageEntity", at = @At("HEAD"))
    private void etim$begin(DamageSource source, float amount, org.spongepowered.asm.mixin.injection.callback.CallbackInfo ci) {
        ETIMDamageLog.begin((EntityLivingBase) (Object) this, source, amount);
    }

    @Inject(method = "damageEntity", at = @At("RETURN"))
    private void etim$end(DamageSource source, float amount, org.spongepowered.asm.mixin.injection.callback.CallbackInfo ci) {
        ETIMDamageLog.end((EntityLivingBase) (Object) this, source);
    }
}
