package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMEntityAIFleeSun;
import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-24 — the R196 {@code EntitySkeleton} ctor :17 seat:
 * {@code addTask(3, new EntityAIFleeSun(this, 1.0))}. The unique {@code
 * (World)} ctor hosts every spawn chain (B-19/B-22 same carrier). C-note
 * 3: 1.12's AbstractSkeleton umbrella drags WitherSkeleton/Stray along;
 * R196's skeleton is the single warrior class. The R196
 * {@code avoidsSunlight()} veto has no 1.12 flag — the AI skips burning
 * skeletons WITHOUT helmets only by the SEAT-side alive/burning chain; the
 * helmet semantics ride vanilla armor (C-grade).
 */
@Mixin(net.minecraft.entity.monster.EntitySkeleton.class)
public abstract class MixinEntitySkeleton {

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$fleeSunAITask(net.minecraft.world.World world, CallbackInfo ci) {
        ((EntityLiving) (Object) this).tasks.addTask(3,
                new ETIMEntityAIFleeSun((net.minecraft.entity.EntityCreature) (Object) this, 1.0D));
    }
}
