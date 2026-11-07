package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.EntityAgeable;
import net.minecraft.entity.passive.EntityVillager;
import net.minecraft.entity.ai.EntityAIVillagerMate;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * B-18 (audit20 条 309 C级 8) — the villager birth face pair. R196
 * {@code EntityAIVillagerMate.giveBirth :93-100} writes THREE age values:
 * both parents get {@code setGrowingAgeAfterBreeding()} = {@code 16000}
 * ({@code EntityAgeable :57-59}) and the newborn gets
 * {@code setGrowingAgeToNewborn()} = {@code -64000}. The 1.12 vanilla
 * body hardcodes {@code 6000} on both parents (:132-133) and
 * {@code -24000} on the child (:140) — the same picture the animal mate
 * family had before B-12.
 *
 * <p>carriers: two value-only redirects inside the same 1.12 method —
 * the parent writes ride the {@code EntityVillager}-owned callsites
 * (:132-133, one redirect, both occurrences) through the B-12 full-chain
 * helper ({@code 6000 -> 16000}), and the child write rides the
 * {@code EntityAgeable}-owned callsite (:140) through the newborn helper.
 * The Forge {@code BabyEntitySpawnEvent} cancel branch (:137-138) stays
 * vanilla ahead of the child write — B-12 case-3 disposition carries over
 * (Forge-borne, no R196 counterpart, ETIM does not fire it); the
 * {@code setIsWillingToMate(false)} face (:134-135) has no R196 consumer
 * and stays vanilla. Flag inside the helpers; rows ring only on real
 * movement.</p>
 */
@Mixin(EntityAIVillagerMate.class)
public abstract class MixinEntityAIVillagerMate {

    @Redirect(
        method = "giveBirth",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/passive/EntityVillager;setGrowingAge(I)V"),
        require = 2)
    private void etim$villagerParentCooldown(EntityVillager parent, int vanillaAge) {
        int mapped = ETIMLivestockEvents.r196BreedCooldown(vanillaAge);
        parent.setGrowingAge(mapped);
        if (mapped != vanillaAge) {
            ETIMLivestockEvents.ageGateRow("villagerParent", parent, mapped);
        }
    }

    @Redirect(
        method = "giveBirth",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/EntityAgeable;setGrowingAge(I)V"),
        require = 1)
    private void etim$villagerBirthAge(EntityAgeable child, int vanillaAge) {
        child.setGrowingAge(ETIMLivestockEvents.r196NewbornAge(vanillaAge));
        if (child.getGrowingAge() != vanillaAge) {
            ETIMLivestockEvents.ageGateRow("villagerBirth", child, child.getGrowingAge());
        }
    }
}
