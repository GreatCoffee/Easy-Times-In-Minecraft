package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMEntityAISeekShelterFromRain;
import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-19 (C-16-5 residual) — the R196 {@code EntityFireElemental} ctor :18
 * seat: {@code addTask(2, EntityAISeekShelterFromRain, 1.0F)} — the PRIORITY
 * 2 seat is unique in the family (the fire elemental avoids dousing rain at
 * a higher precedence than the mobs' food/water errands). 1.12 carrier =
 * {@code EntityBlaze} (nether-only — the seat is faithful dead code there,
 * C-grade note 5). Unique {@code (World)} ctor — one firing per spawn.
 */
@Mixin(net.minecraft.entity.monster.EntityBlaze.class)
public abstract class MixinEntityBlaze {

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$shelterAITask(net.minecraft.world.World world, CallbackInfo ci) {
        ((EntityLiving) (Object) this).tasks.addTask(2,
                new ETIMEntityAISeekShelterFromRain((EntityLiving) (Object) this, 1.0F));
    }
}
