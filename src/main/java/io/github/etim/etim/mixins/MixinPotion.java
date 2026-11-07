package io.github.etim.etim.mixins;

import java.util.Map;
import java.util.Map.Entry;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.ai.attributes.AbstractAttributeMap;
import net.minecraft.entity.ai.attributes.AttributeModifier;
import net.minecraft.entity.ai.attributes.IAttribute;
import net.minecraft.entity.ai.attributes.IAttributeInstance;
import net.minecraft.init.MobEffects;
import net.minecraft.potion.Potion;

import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMEnchantPool;
import io.github.etim.etim.mining.ETIMEnchantments;

/**
 * B-15 (free-action effect face, 条 321): the R196
 * {@code Potion.applyAttributesModifiersToEntity :236-260} shred insert —
 * on the slow-down potion, shred the applied modifier amount by the
 * wearer's free_action gear level: {@code amount *= (1.0F − L × 0.8F / 4)}
 * (L = {@code EnchantmentHelper.getFreeActionModifier(entity)}; the divisor
 * 4 = R196 {@code EnchantmentFreeAction.getNumLevels() :9-11} native, an
 * in-code constant — the B-2 cfg cap rides the enchant levels, not this
 * car). Per-level: L1 ×0.8 / L2 ×0.6 / L3 ×0.4 / L4 ×0.2.
 *
 * <p>Carrier: 1.12 {@code Potion.applyAttributesModifiersToEntity
 * :315-326} is the same trunk (removeModifier pre-attach, then an inline
 * {@code new AttributeModifier(...)} with enough
 * {@code getAttributeModifierAmount(amplifier, modifier)} — R196
 * {@code func_111183_a}) so the head-rewrite here reproduces the vanilla
 * trunk verbatim and inserts ONLY the shred before the apply. The scorer
 * face is the 1.12 identity check {@code this == MobEffects.SLOWNESS} —
 * 1.12 has exactly one slow-down potion (the R196 body textual check was
 * {@code getName().equals("potion.moveSlowdown")}; obf 1.12 names are not
 * stable, identity is).</p>
 *
 * <p>NOT in this batch (freeaction-立项摸底 §一): the paralysis resistance
 * face (R196 EntityLivingBase :1254/:1275/:2086 — 1.12 has zero consumers:
 * the vision_dimming chain (EntityNightwing/EntityShadow) is not ported and
 * the R196 speed chain does not exist here) and the R196 player-face
 * trims (Potion :239-242) — both stay debts.</p>
 */
@Mixin(Potion.class)
public abstract class MixinPotion {

    /** 1.12 private registration map (R196 {@code field_111188_I} same seat). */
    @Shadow
    @Final
    private Map<IAttribute, AttributeModifier> attributeModifierMap;

    @Shadow
    public abstract String getName();

    @Shadow
    public abstract double getAttributeModifierAmount(int amplifier, AttributeModifier modifier);

    @Inject(method = "applyAttributesModifiersToEntity", at = @At("HEAD"), cancellable = true, require = 1)
    private void etim$slownessFreeShred(EntityLivingBase entity, AbstractAttributeMap attributeMap, int amplifier,
            CallbackInfo ci) {
        if (!ETIMConfig.freeActionShredR196 || (Object) this != MobEffects.SLOWNESS || entity == null) {
            return; // vanilla body (the one apply path B-2 pool members ride)
        }
        int levels = ETIMEnchantments.getFreeActionLevels(entity);
        if (levels <= 0) {
            return; // no gear → vanilla
        }
        double shredFactor = 1.0F - levels * 0.8F / 4.0F;
        for (Entry<IAttribute, AttributeModifier> entry : this.attributeModifierMap.entrySet()) {
            IAttributeInstance instance = attributeMap.getAttributeInstance(entry.getKey());
            if (instance != null) {
                AttributeModifier template = entry.getValue();
                instance.removeModifier(template);
                double amount = this.getAttributeModifierAmount(amplifier, template);
                double shredded = amount * shredFactor;
                instance.applyModifier(new AttributeModifier(template.getID(), this.getName() + " " + amplifier,
                        shredded, template.getOperation()));
                ETIMEnchantPool.row("free_action src=slowdownShred potion=" + this.getName()
                        + " level=" + levels
                        + " amountRaw=" + String.format(java.util.Locale.ROOT, "%.4f", amount)
                        + " amountShred=" + String.format(java.util.Locale.ROOT, "%.4f", shredded)
                        + " entity=" + entity.getName());
            }
        }
        ci.cancel();
    }
}
