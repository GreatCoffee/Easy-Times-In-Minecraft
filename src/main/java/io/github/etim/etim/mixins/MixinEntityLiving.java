package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.DespawnRules;
import io.github.etim.etim.mob.ETIMFireCountdownDuck;
import io.github.etim.etim.mob.ETIMRepairCooldownDuck;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
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
public abstract class MixinEntityLiving implements ETIMFireCountdownDuck, ETIMRepairCooldownDuck {

    /**
     * B-33 — the R196 {@code increased_chance_of_spreading_fire_countdown}
     * field (EntityLiving.java:41), mixin-carried (1.12 has no such field);
     * public via the {@link ETIMFireCountdownDuck} contract so
     * {@link io.github.etim.etim.mob.ETIMFireSpreadRules} and
     * {@link io.github.etim.etim.mob.ETIMEntityAIMoveToTree} can read/write
     * it. Written at {@code startExecuting} (R196 MoveToTree :65), read by
     * the fire-spread ladder (R196 Entity.java:576-579), decremented here.
     */
    @Unique
    public int etim$increasedChanceOfSpreadingFireCountdown;

    @Unique
    @Override
    public int etim$getIncreasedChanceOfSpreadingFireCountdown() {
        return this.etim$increasedChanceOfSpreadingFireCountdown;
    }

    @Unique
    @Override
    public void etim$setIncreasedChanceOfSpreadingFireCountdown(int value) {
        this.etim$increasedChanceOfSpreadingFireCountdown = value;
    }

    /**
     * B-35 — the R196 {@code food_or_repair_item_pickup_cooldown} field
     * (EntityLiving.java:30), mixin-carried for the non-livestock
     * repair family (skeleton/snowman; the livestock carry it in the
     * {@code ETIMLivestock.IState}, the B-11 arm). Written at pickup
     * (= 400, R196 :662) via {@link ETIMRepairCooldownDuck}, read by
     * {@link io.github.etim.etim.mob.ETIMEntityAIMoveToRepairItem},
     * decremented in the {@code onUpdate} handler below (R196
     * :646-647, the pickup-block slot — TAIL carrier is C-level).
     */
    @Unique
    public int etim$repairPickupCooldown;

    @Unique
    @Override
    public int etim$getRepairPickupCooldown() {
        return this.etim$repairPickupCooldown;
    }

    @Unique
    @Override
    public void etim$setRepairPickupCooldown(int value) {
        this.etim$repairPickupCooldown = value;
    }

    /**
     * B-33 — R196 {@code EntityLiving.onUpdate} countdown self-decrement
     * (:209-212, inside the server guard): the tick the AI write rides out
     * from (arm at path-found, then 100 ticks of boosted spread). The R196
     * slot sits mid-{@code onUpdate}; the 1.12 carrier is a TAIL injection
     * (position drift is C-level, same shape as the Entity hook).
     *
     * <p>B-35 — the repair-pickup cooldown decrement rides the same
     * handler (R196 :646-647, inside the ground-pickup block; the TAIL
     * carrier is C-level per the B-35 摸底 §3-①).</p>
     */
    @Inject(method = "onUpdate", at = @At("TAIL"))
    private void etim$fireCountdownTick(CallbackInfo ci) {
        if (!ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla 1.12 has no countdown at all
        }
        if (((EntityLiving) (Object) this).world.isRemote) {
            return; // R196 :208 — the server guard the decrement lives inside
        }
        if (this.etim$increasedChanceOfSpreadingFireCountdown > 0) {
            this.etim$increasedChanceOfSpreadingFireCountdown--;
        }
        if (this.etim$repairPickupCooldown > 0) { // B-35 — R196 :646-647
            this.etim$repairPickupCooldown--;
        }
    }

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
