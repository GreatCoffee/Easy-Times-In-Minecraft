package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMEntityAISeekShelterFromRain;
import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-19 (C-16-5 residual) — the R196 {@code EntitySnowman} ctor :14 seat:
 * {@code addTask(4, EntityAISeekShelterFromRain, 1.0F)}. Unique {@code
 * (World)} ctor — one firing per spawn.
 */
@Mixin(net.minecraft.entity.monster.EntitySnowman.class)
public abstract class MixinEntitySnowman {

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$shelterAITask(net.minecraft.world.World world, CallbackInfo ci) {
        ((EntityLiving) (Object) this).tasks.addTask(4,
                new ETIMEntityAISeekShelterFromRain((EntityLiving) (Object) this, 1.0F));
    }
}
