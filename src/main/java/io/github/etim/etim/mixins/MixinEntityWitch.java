package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityAIWanderBackToSpawnPoint;
import io.github.etim.etim.mob.ETIMEntityAIWitchRoaming;
import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-30 — the R196 {@code EntityWitch :46} wander-back-to-spawn-point seat:
 * {@code addTask(3, new EntityAIWanderBackToSpawnPoint(this, 1.0F, true))}.
 * The MITE-独有 spawn-face arm — grep window
 * {@code new EntityAIWanderBackToSpawnPoint} is witch-ONLY (the four
 * livestock never get it). The 1.12 vanilla witch ctor has no comparable
 * seat — add-only, no removeIf face (the MixinEntityWolf B-29 precedent).
 * Family flag <b>livestockNeedsR196</b> (the ninth reuse, the B-18
 * precedent).
 */
@Mixin(net.minecraft.entity.monster.EntityWitch.class)
public abstract class MixinEntityWitch {

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$wanderBackToSpawnAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving living = (EntityLiving) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        living.tasks.addTask(3, new ETIMEntityAIWanderBackToSpawnPoint(living, 1.0F)); // R196 EntityWitch :46
    }

    /**
     * B-34 — the R196 {@code EntityWitch :47} night-roam seat:
     * {@code addTask(3, new EntityAIWitchRoaming(this))}. The MITE-独有
     * roam-face arm — the 1.12 vanilla witch ctor has no comparable seat,
     * add-only. Family flag <b>livestockNeedsR196</b> (the thirteenth
     * reuse).
     */
    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$witchRoamingAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving living = (EntityLiving) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        living.tasks.addTask(3, new ETIMEntityAIWitchRoaming(living)); // R196 EntityWitch :47
    }
}
