package io.github.etim.etim.mixins;

import net.minecraft.entity.Entity;
import net.minecraft.nbt.NBTTagCompound;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
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
        // legacy entities (:1899). BUT the marker must fire ONLY when the
        // key is actually present: vanilla /summon (and some spawn paths)
        // still route readFromNBT with an empty tag, and an unconditional
        // mark flagged FRESH entities as restored — their water seed was
        // then skipped and they died at counter=200 (C4 window 20:25:22
        // EntitySquid#957 restored=true age=1 — root cause registered).
        // Non-living carriers (items, minecarts, ...) have no idle field —
        // skip them the same way the write side does (boot 20:24:35
        // ClassCastException on EntityItem, four counts, world load).
        if (!(((Object) this) instanceof net.minecraft.entity.EntityLivingBase)) {
            return;
        }
        ((EntityLivingBaseAccessor) (Object) this).etim$setIdleTime(tag.getInteger("despawn_counter"));
        if (tag.hasKey("despawn_counter")) {
            Object self = this;
            if (self instanceof net.minecraft.entity.EntityLiving) {
                io.github.etim.etim.mob.DespawnRules.markCounterRestored(
                        (net.minecraft.entity.EntityLiving) self);
            }
        }
    }

    // ------------------- underworld 二阶段 T3: the portal tick drive -------------------

    /**
     * underworld portal travel (批文 T2-1/A2-1): the 1.12 vanilla in-portal
     * branch resolves its target dimension at entity/Entity.java:516-523
     * (hardcoded -1↔0). R196 keeps a per-entity destination
     * ({\code portal_destination_dimension_id}, Entity.java:474). The ETIM
     * face: {@link io.github.etim.etim.world.ETIMBlockPortal
     * #onEntityCollidedWithBlock} registers the per-entity target; the
     * redirect swaps it in and mounts the R196 Teleporter transcription for
     * dim 0 / -2 arrivals (nether and everything else keep vanilla).
     * require=1: the single vanilla call site inside onEntityUpdate.
     */
    @Redirect(
            method = "onEntityUpdate()V",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/entity/Entity;changeDimension(I)Lnet/minecraft/entity/Entity;"),
            require = 1
    )
    private Entity etim$portalTarget(Entity self, int vanillaTarget) {
        int target = io.github.etim.etim.world.ETIMBlockPortal.consumePortalTarget(self, vanillaTarget);
        // A-2 (recheck verdict 2026-10-25): Forge changeDimension flips
        // self.dimension BEFORE placeEntity runs (Entity.java:2963 vs :3002,
        // rfg tree) — self.dimension is still the ORIGIN only here, at the
        // redirect. Capture it for the teleporter; consumed in placeEntity.
        io.github.etim.etim.world.ETIMPortalTeleporter.pushSourceDimension(self.dimension);
        return self.changeDimension(target,
                io.github.etim.etim.world.ETIMBlockPortal.teleporterFor(self, target));
    }

    /**
     * T3 cooldown (B2-5, R196 Entity.java:2178-2179 = 900): non-player
     * entities take the config value; players keep the 1.12 face
     * (EntityPlayer = 10, R196 player = 10 — zero code, B2-4 fine-grain
     * creative 1-vs-0 stays a registered drift).
     */
    @Inject(method = "getPortalCooldown()I", at = @At("TAIL"), cancellable = true)
    private void etim$portalCooldown(CallbackInfoReturnable<Integer> cir) {
        if (!((Object) this instanceof net.minecraft.entity.player.EntityPlayer)) {
            cir.setReturnValue(io.github.etim.etim.ETIMConfig.portalCooldown);
        }
    }
}
