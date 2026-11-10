package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityAIPanic;
import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-29 — the R196 {@code EntityWolf :39} panic seat: {@code addTask(1,
 * EntityAIFleeAttackerOrPanic, 1.0F, 0.0F)}. The chance-0 face means the
 * wolf never re-panics from the chance roll — but the flee face (revenge
 * target under 32F) and the burn/spook faces ride the same arm. The 1.12
 * vanilla wolf ctor has NO EntityAIPanic seat (L81 tasks only swimming/
 * sit/avoid/leap/attack/wander) — so this is add-only, no removeIf face.
 */
@Mixin(net.minecraft.entity.passive.EntityWolf.class)
public abstract class MixinEntityWolf {

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$panicFleeAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving living = (EntityLiving) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        living.tasks.addTask(1, new ETIMEntityAIPanic(living, 1.0F, 0.0F)); // R196 EntityWolf :39
    }
}
