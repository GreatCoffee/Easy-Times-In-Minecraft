package io.github.etim.etim.mixins;

import io.github.etim.etim.combat.ETIMMelee;
import io.github.etim.etim.mining.ETIMEnchantments;

import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.DamageSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * melee1 player melee hook (batch B2, 条 249-251; D-3 case ① — the single
 * redirect). Wraps the FIRST {@code attackEntityFrom} call of
 * {@code attackTargetEntityWithCurrentItem} (1.12 EntityPlayer.java:1448):
 * the R196 order is disarm BEFORE the damage call ({@code :1231-1242} vs
 * {@code :1244}) and stun/vampiric after the harm confirmation
 * ({@code :1247-1254}); the redirect handler preserves that order while the
 * rest of the 1.12 pipeline (crit/sweep/knockback/thorns/hitEntity) runs
 * vanilla.
 *
 * <p>C-Note3 (终审条 251 bytecode): the sweep second call
 * {@code :1477} has receiver owner {@code EntityLivingBase} while THIS call
 * site's receiver owner is {@code Entity} — the {@code target} string
 * pins {@code Lnet/minecraft/entity/Entity;…} so the sweep site never
 * matches, {@code require = 1} suffices, no ordinal needed.</p>
 *
 * <p>{@code isRemote} full gate (D-3 红线 ②): the single-player client runs
 * this method too (PlayerControllerMP:575) — every effect call inside
 * {@link ETIMMelee} re-checks the same flag, so the client face is a pure
 * pass-through to vanilla.</p>
 */
@Mixin(EntityPlayer.class)
public abstract class MixinEntityPlayerMelee {

    @Redirect(
            method = "attackTargetEntityWithCurrentItem(Lnet/minecraft/entity/Entity;)V",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/Entity;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z"
            ),
            require = 1,
            remap = true
    )
    private boolean etim$meleeHook(Entity target, DamageSource source, float amount) {
        EntityPlayer self = (EntityPlayer) (Object) this;
        if (self.world.isRemote) {
            return target.attackEntityFrom(source, amount);
        }
        // R196 :1231-1242 — disarm BEFORE the damage call (伤前).
        ETIMMelee.applyDisarming(self, target);
        boolean harmed = target.attackEntityFrom(source, amount);
        if (harmed && target instanceof EntityLivingBase) {
            // R196 :1249-1254 — stun then vampiric, after the harm gate.
            ETIMMelee.applyStun(self, (EntityLivingBase) target);
            ETIMMelee.applyVampiric(self, (EntityLivingBase) target, amount); // B-5: amount = the 1.12 f basis
        }
        int stunLevel = EnchantmentHelper.getEnchantmentLevel(ETIMEnchantments.STUN, self.getHeldItemMainhand());
        int vampLevel = EnchantmentHelper.getEnchantmentLevel(ETIMEnchantments.VAMPIRIC, self.getHeldItemMainhand());
        int disarmLevel = EnchantmentHelper.getEnchantmentLevel(ETIMEnchantments.DISARMING, self.getHeldItemMainhand());
        if (stunLevel > 0 || vampLevel > 0 || disarmLevel > 0) {
            ETIMMelee.row("melee target=" + target.getName()
                    + " lvl_stun=" + stunLevel + " lvl_vamp=" + vampLevel
                    + " lvl_disarm=" + disarmLevel + " harmed=" + harmed);
        }
        return harmed;
    }
}
