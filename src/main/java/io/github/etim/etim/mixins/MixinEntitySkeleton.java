package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityAIFleeSun;
import io.github.etim.etim.mob.ETIMEntityAIMoveToRepairItem;
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
 *
 * <p>B-35 — the R196 {@code EntitySkeleton :23} repair seat:
 * {@code addTask(4, new EntityAIMoveToRepairItem(this, 1.0F, true))},
 * the second handler below. The 1.12 skeleton ctor body is empty
 * ({@code EntitySkeleton :19-24}, the {@code AbstractSkeleton} super
 * runs the task table and {@code setCombatTask}), so the TAIL of the
 * unique {@code (World)} ctor lands after everything. Same-priority
 * note: combat is {@code addTask(4, aiArrowAttack)} ({@code
 * AbstractSkeleton :241}), registered before this arm — equal priority
 * never preempts, so the seat order is a C-note in the B-35 摸底 §3-④
 * (R196 registers repair first). Family flag <b>livestockNeedsR196</b>
 * (the fourteenth reuse, the B-18 precedent).</p>
 */
@Mixin(net.minecraft.entity.monster.EntitySkeleton.class)
public abstract class MixinEntitySkeleton {

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$fleeSunAITask(net.minecraft.world.World world, CallbackInfo ci) {
        ((EntityLiving) (Object) this).tasks.addTask(3,
                new ETIMEntityAIFleeSun((net.minecraft.entity.EntityCreature) (Object) this, 1.0D));
    }

    /**
     * B-35 — the R196 {@code EntitySkeleton :23} repair seat:
     * {@code addTask(4, new EntityAIMoveToRepairItem(this, 1.0F, true))}
     * (the bone-table mob, R196 {@code EntitySkeleton :352-355}). One
     * firing per spawn chain, same carrier as the B-24 FleeSun seat
     * above.
     */
    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$moveToRepairItemAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving living = (EntityLiving) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        living.tasks.addTask(4, new ETIMEntityAIMoveToRepairItem(living)); // R196 EntitySkeleton :23
    }
}
