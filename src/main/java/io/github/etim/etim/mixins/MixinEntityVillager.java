package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMEntityAISeekShelterFromRain;
import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-19 (C-16-5 residual) — the R196 {@code EntityVillager} ctor :49 seat:
 * {@code addTask(4, EntityAISeekShelterFromRain, 0.6F)} — the villager is
 * the only SLOWER carrier in the R196 shelter family. The (World) ctor
 * delegates to the (World, int) terminal body, which host the single seat
 * (one firing per spawn).
 */
@Mixin(net.minecraft.entity.passive.EntityVillager.class)
public abstract class MixinEntityVillager {

    @Inject(method = "<init>(Lnet/minecraft/world/World;I)V", at = @At("TAIL"))
    private void etim$shelterAITask(net.minecraft.world.World world, int profession, CallbackInfo ci) {
        ((EntityLiving) (Object) this).tasks.addTask(4,
                new ETIMEntityAISeekShelterFromRain((EntityLiving) (Object) this, 0.6F));
    }
}
