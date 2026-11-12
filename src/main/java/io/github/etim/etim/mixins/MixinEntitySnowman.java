package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityAISeekShelterFromRain;
import io.github.etim.etim.mob.ETIMEntityAIMoveToRepairItem;
import io.github.etim.etim.mob.ETIMEntityAIAvoidFire;
import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-19 (C-16-5 residual) — the R196 {@code EntitySnowman} ctor :14 seat:
 * {@code addTask(4, EntityAISeekShelterFromRain, 1.0F)}. Unique {@code
 * (World)} ctor — one firing per spawn.
 *
 * <p>B-35 — the R196 {@code EntitySnowman :15} repair seat:
 * {@code addTask(2, new EntityAIMoveToRepairItem(this, 1.0F, true))},
 * the second handler below (the snowball-table mob, R196 {@code
 * EntitySnowman :116-119}). The 1.12 ctor has no comparable seat
 * ({@code EntitySnowman :51-55}); the seat-order note (WanderAvoidWater
 * is registered first at the same priority 2) is the C-note in the
 * B-35 摸底 §3-④. Family flag <b>livestockNeedsR196</b> (the fourteenth
 * reuse, the B-18 precedent).</p>
 */
@Mixin(net.minecraft.entity.monster.EntitySnowman.class)
public abstract class MixinEntitySnowman {

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$shelterAITask(net.minecraft.world.World world, CallbackInfo ci) {
        ((EntityLiving) (Object) this).tasks.addTask(4,
                new ETIMEntityAISeekShelterFromRain((EntityLiving) (Object) this, 1.0F));
    }

    /**
     * B-35 — the R196 {@code EntitySnowman :15} repair seat:
     * {@code addTask(2, new ETIMEntityAIMoveToRepairItem(living))}
     * (R196 {@code EntitySnowman :15}, the ctor arg speed 1.0F +
     * swim_if_necessary). One firing per spawn chain, same carrier as
     * the B-19 shelter seat above.
     */
    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$moveToRepairItemAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving living = (EntityLiving) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        living.tasks.addTask(2, new ETIMEntityAIMoveToRepairItem(living)); // R196 EntitySnowman :15
    }

    /**
     * B-36 — the R196 {@code EntitySnowman :16} AvoidFire seat:
     * {@code addTask(2, new EntityAIAvoidFire(this, 1.0F, true))} — the
     * third handler. The snowman is fire-vulnerable (its own AwayFromFire
     * face in vanilla is absent from the 1.12 ctor {@code :51-55}); the
     * family flag gates the seat (the fifteenth reuse).
     */
    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$avoidFireAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving living = (EntityLiving) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        living.tasks.addTask(2, new ETIMEntityAIAvoidFire(living, 1.0F, true)); // R196 EntitySnowman :16
    }
}
