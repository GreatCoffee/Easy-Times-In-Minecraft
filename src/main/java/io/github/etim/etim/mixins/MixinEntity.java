package io.github.etim.etim.mixins;

import net.minecraft.entity.Entity;
import net.minecraft.nbt.NBTTagCompound;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Stage 5 slice 1 — R196 despawn-counter persistence (MITE Entity:1801/:1899
 * writes {@code despawn_counter} in the base NBT of EVERY entity; the read
 * side returns 0 for legacy saves). Vanilla 1.12's {@code idleTime} is not
 * persisted; with the counter driving the despawn chain it must survive
 * reloads. Players also carry the field (harmless — the despawn chain never
 * runs for them).
 */
@Mixin(Entity.class)
public abstract class MixinEntity {

    @Inject(method = "writeToNBT(Lnet/minecraft/nbt/NBTTagCompound;)Lnet/minecraft/nbt/NBTTagCompound;",
            at = @At("TAIL"))
    private void etim$writeDespawnCounter(NBTTagCompound tag,
                                          CallbackInfoReturnable<NBTTagCompound> cir) {
        // unconditional 0-storage for LIVING entities, like MITE :1801 — but
        // items/minecarts are NOT living entities (the EntityLivingBase
        // accessor cast would raise), so gate on the type
        if (((Object) this) instanceof net.minecraft.entity.EntityLivingBase) {
            tag.setInteger("despawn_counter",
                    ((EntityLivingBaseAccessor) (Object) this).etim$getIdleTime());
        }
    }

    @Inject(method = "readFromNBT", at = @At("TAIL"))
    private void etim$readDespawnCounter(NBTTagCompound tag, CallbackInfo ci) {
        // missing key → getInteger returns 0 — the MITE read semantics for
        // legacy entities (:1899)
        ((EntityLivingBaseAccessor) (Object) this).etim$setIdleTime(tag.getInteger("despawn_counter"));
        Object self = this;
        if (self instanceof net.minecraft.entity.EntityLiving) {
            io.github.etim.etim.mob.DespawnRules.markCounterRestored(
                    (net.minecraft.entity.EntityLiving) self);
        }
    }
}
