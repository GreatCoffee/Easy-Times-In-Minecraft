package io.github.etim.etim.mixins;

import io.github.etim.etim.combat.ETIMMelee;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.monster.EntityMob;
import net.minecraft.util.DamageSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * melee1 mob-side hook (batch B2, 条 249-251; D-4 = 本批一并收 — 条 250
 * beats the report's §0 F9 alternate wording, 条 251 C-注1). Wraps the single
 * {@code attackEntityFrom} call of {@code EntityMob.attackEntityAsMob}
 * (1.12 EntityMob.java:109, receiver owner {@code Entity}): R196 applied
 * stun/vampiric from the MOB's held stack at both of its call sites
 * ({@code EntityMob:96-99} base + {@code :168-171} second face — 终审 T-1
 * same-shape confirm). WITHOUT this batch hook ETIM's randomly-enchanted mob
 * weapons (ETIMMobEquip:107-113) would carry a dead vampiric/stun face — the
 * closing window 条 249 flagged.
 *
 * <p>Disarming does NOT ride the mob hook (R196 operator face is
 * EntityPlayer-only, C-1). Input basis = {@code amount} (B-5 declaration:
 * R196 read {@code result.getAmountOfHealthLost()}, 1.12 has no such return).</p>
 */
@Mixin(EntityMob.class)
public abstract class MixinEntityMobMelee {

    @Redirect(
            method = "attackEntityAsMob(Lnet/minecraft/entity/Entity;)Z",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/Entity;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z"
            ),
            require = 1,
            remap = true
    )
    private boolean etim$mobMeleeHook(Entity target, DamageSource source, float amount) {
        EntityMob self = (EntityMob) (Object) this;
        boolean harmed = target.attackEntityFrom(source, amount);
        if (harmed && target instanceof EntityLivingBase) {
            ETIMMelee.applyStun(self, (EntityLivingBase) target);
            ETIMMelee.applyVampiric(self, (EntityLivingBase) target, amount);
        }
        return harmed;
    }
}
