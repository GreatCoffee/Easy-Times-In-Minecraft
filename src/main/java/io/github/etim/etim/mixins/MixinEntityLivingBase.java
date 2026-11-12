package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import io.github.etim.etim.mob.ETIMMassiveFallDuck;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.EntityChicken;
import net.minecraft.util.DamageSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-10 batch 2 (audit20 条 303) — F-3, the jump feather face (R196
 * {@code EntityChicken.jump :185-191}: after the super body, !child +
 * 1-in-40 + not-in-water → {@code tryDropFeather(true)}, the
 * retain-at-least-one arm whose meter needs 2+ to shed one). 1.12 declares
 * {@code jump()} on EntityLivingBase (:2006), so the injection lives here
 * behind an instanceof chicken gate — unrelated living entities pay a single
 * failed instanceof per jump; with {@code livestockProductionR196} off the
 * vanilla body stands untouched.
 */
@Mixin(EntityLivingBase.class)
public abstract class MixinEntityLivingBase implements ETIMMassiveFallDuck {

    @Inject(method = "jump", at = @At("TAIL"))
    private void etim$chickenJumpFeather(CallbackInfo ci) {
        if (ETIMConfig.livestockProductionR196 && (Object) this instanceof EntityChicken) {
            ETIMLivestockEvents.jumpFeather((EntityChicken) (Object) this);
        }
    }

    /**
     * B-38 drop-face pack — the R196 massive-fall flag (R196
     * {@code EntityLivingBase :74 public boolean has_taken_massive_fall_damage};
     * the setter :1130-1133 {@code damage >= maxHealth * 0.5} at the fall
     * face). The 1.12 carrier = {@code EntityLivingBase.fall(float,float)
     * :1451-1476}: the redirect sits on the
     * {@code attackEntityFrom(DamageSource.FALL, i)} call (:1464), where
     * {@code i} is the computed fall damage — the R196 5-damage clamp
     * (:1125-1127) is an R196 world-balance face and is not transposed
     * (摸底 §3-C3), so the criterion stays {@code i >= maxHealth * 0.5}.
     */
    @Unique
    private boolean etim$hasTakenMassiveFallDamageValue;

    @Override
    public boolean etim$hasTakenMassiveFallDamage() {
        return this.etim$hasTakenMassiveFallDamageValue;
    }

    @Override
    public void etim$setHasTakenMassiveFallDamage(boolean value) {
        this.etim$hasTakenMassiveFallDamageValue = value;
    }

    @Redirect(
            method = "fall(FF)V",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/EntityLivingBase;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z"))
    private boolean etim$massiveFallFlag(EntityLivingBase self, DamageSource source, float amount) {
        if (!self.world.isRemote && source == DamageSource.FALL
                && amount >= self.getMaxHealth() * 0.5F) {
            this.etim$hasTakenMassiveFallDamageValue = true;
        }
        return self.attackEntityFrom(source, amount);
    }
}
