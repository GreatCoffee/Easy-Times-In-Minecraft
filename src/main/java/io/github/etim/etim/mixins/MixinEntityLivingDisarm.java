package io.github.etim.etim.mixins;

import io.github.etim.etim.combat.ETIMMelee;

import net.minecraft.entity.EntityLiving;
import net.minecraft.nbt.NBTTagCompound;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * melee1 disarm lock carrier (batch B2, 条 249-251; B-3 — R196's
 * {@code EntityLiving.ticks_disarmed} has NO 1.12 field. The counter lives in
 * {@link ETIMMelee}'s per-entity WeakHashMap instead of a mixin-injected
 * field: the mixin AP refuses an {@code @Accessor} that targets another
 * mixin's {@code @Unique} field, and the four host faces below are the
 * judged surface — timers tick, NBT persists, pickup locks. 终审 T-1 pinned
 * the hosts: NBT write {@code :411}, read {@code :505}, tick {@code :644},
 * pickup gate {@code :1327}). While the counter is positive the mob cannot
 * pick loot up — otherwise it would immediately re-grab the dropped weapon
 * and disarm would be a no-op.
 */
@Mixin(EntityLiving.class)
public abstract class MixinEntityLivingDisarm {

    @Inject(method = "onLivingUpdate", at = @At("TAIL"), remap = true)
    private void etim$disarmTickDecrement(CallbackInfo ci) {
        EntityLiving self = (EntityLiving) (Object) this;
        if (ETIMMelee.getDisarmTicks(self) > 0) {
            ETIMMelee.tickDisarm(self);
        }
    }

    @Inject(method = "writeEntityToNBT(Lnet/minecraft/nbt/NBTTagCompound;)V",
            at = @At("TAIL"), remap = true)
    private void etim$disarmWriteNBT(NBTTagCompound compound, CallbackInfo ci) {
        EntityLiving self = (EntityLiving) (Object) this;
        int ticks = ETIMMelee.getDisarmTicks(self);
        if (ticks > 0) {
            compound.setInteger("ETIMDisarmTicks", ticks);
        }
    }

    @Inject(method = "readEntityFromNBT(Lnet/minecraft/nbt/NBTTagCompound;)V",
            at = @At("TAIL"), remap = true)
    private void etim$disarmReadNBT(NBTTagCompound compound, CallbackInfo ci) {
        if (compound.hasKey("ETIMDisarmTicks")) {
            ETIMMelee.setDisarmTicks((EntityLiving) (Object) this,
                    compound.getInteger("ETIMDisarmTicks"));
        }
    }

    @Inject(method = "canPickUpLoot()Z", at = @At("HEAD"), cancellable = true, remap = true)
    private void etim$disarmPickupGate(CallbackInfoReturnable<Boolean> cir) {
        if (ETIMMelee.getDisarmTicks((EntityLiving) (Object) this) > 0) {
            cir.setReturnValue(false);
        }
    }
}
