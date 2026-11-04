package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.DespawnRules;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Stage 5 slice 1 — the R196 despawn chain base layer (audit 11 §2.1):
 * both the despawn main loop and the layered canDespawn are transcribed in
 * {@link DespawnRules}; defeat them by the mobs.mobDespawnR196 switch
 * (false = the vanilla 1.12 bodies stay untouched).
 *
 * <p>Batch six D-1 pool (条 278) appends the R196 spawn-enchant gate (B-13):
 * the 1.12 face has TWO gates (main-hand 0.25×f, armor 0.5×f); R196 has ONE
 * gate 0.1×tension for every slot (EntityLiving.java:1130-1135). The budget
 * shape (5 + tension × r(18)) is already isomorphic in 1.12 — only the gate
 * probability differs, so the cancel re-runs the vanilla slot loop with the
 * R196 single gate. In-place追加 in this existing mixin (终审 B-18 structure:
 * zero new mixin files).</p>
 */
@Mixin(EntityLiving.class)
public abstract class MixinEntityLiving {

    @Inject(method = "despawnEntity", at = @At("HEAD"), cancellable = true)
    private void etim$tryDespawnEntity(CallbackInfo ci) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        if (DespawnRules.tryDespawn((EntityLiving) (Object) this)) {
            ci.cancel();
        }
    }

    @Inject(method = "canDespawn", at = @At("HEAD"), cancellable = true)
    private void etim$canDespawn(CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        cir.setReturnValue(DespawnRules.canDespawn((EntityLiving) (Object) this));
    }

    @Inject(method = "setEnchantmentBasedOnDifficulty(Lnet/minecraft/world/DifficultyInstance;)V",
            at = @At("HEAD"), cancellable = true)
    private void etim$r196MobEnchantGate(net.minecraft.world.DifficultyInstance difficulty, CallbackInfo ci) {
        if (!ETIMConfig.enchantPoolR196) {
            return;
        }
        EntityLiving self = (EntityLiving) (Object) this;
        float tension = difficulty.getClampedAdditionalDifficulty();
        java.util.Random rnd = ((EntityLivingBase) self).getRNG();

        if (!self.getHeldItemMainhand().isEmpty() && rnd.nextFloat() < 0.1F * tension) {
            self.setItemStackToSlot(net.minecraft.inventory.EntityEquipmentSlot.MAINHAND,
                    net.minecraft.enchantment.EnchantmentHelper.addRandomEnchantment(rnd,
                            self.getHeldItemMainhand(), (int) (5.0F + tension * (float) rnd.nextInt(18)), false));
        }
        for (net.minecraft.inventory.EntityEquipmentSlot slot : net.minecraft.inventory.EntityEquipmentSlot.values()) {
            if (slot.getSlotType() == net.minecraft.inventory.EntityEquipmentSlot.Type.ARMOR) {
                ItemStack stack = self.getItemStackFromSlot(slot);
                if (!stack.isEmpty() && rnd.nextFloat() < 0.1F * tension) {
                    self.setItemStackToSlot(slot,
                            net.minecraft.enchantment.EnchantmentHelper.addRandomEnchantment(rnd,
                                    stack, (int) (5.0F + tension * (float) rnd.nextInt(18)), false));
                }
            }
        }
        io.github.etim.etim.combat.ETIMEnchantPool.row("nonTable src=mob tension="
                + String.format(java.util.Locale.ROOT, "%.2f", tension));
        ci.cancel();
    }
}
