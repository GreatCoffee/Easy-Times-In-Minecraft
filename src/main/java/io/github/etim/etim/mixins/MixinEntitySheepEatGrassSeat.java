package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityAIEatGrass;
import net.minecraft.entity.ai.EntityAIEatGrass;
import net.minecraft.entity.passive.EntitySheep;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.Iterator;

/**
 * B-28 (audit20 tiao 352-353) — the R196 eat-grass seat carrier. The R196
 * seat is the vanilla sheep priority-5 slot (EntitySheep field :26 + ctor
 * :37 addTask(5)), so the carrier REPLACES the vanilla EntityAIEatGrass
 * instance this entity already holds: under the family flag the vanilla
 * task entry is removed from the task list and the R196 agent takes the
 * same slot (the flag-off pass-through keeps vanilla untouched). The B-10
 * eatGrassBonus tail on this same class stays put — this AI's harvest
 * face calls {@code owner.eatGrassBonus()} directly, so the bonus chain
 * (setSheared/addGrowth/addFood-capability) is the R196 verbatim.
 */
@Mixin(EntitySheep.class)
public abstract class MixinEntitySheepEatGrassSeat {

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$eatGrassAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntitySheep sheep = (EntitySheep) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: the vanilla AI keeps the seat (the flag-off pass-through)
        }
        // remove the vanilla entry first — R196's role is the priority-5 slot owner
        Iterator<net.minecraft.entity.ai.EntityAITasks.EntityAITaskEntry> it = sheep.tasks.taskEntries.iterator();
        while (it.hasNext()) {
            net.minecraft.entity.ai.EntityAITasks.EntityAITaskEntry entry = it.next();
            if (entry.action instanceof EntityAIEatGrass) {
                it.remove();
                break;
            }
        }
        sheep.tasks.addTask(5, new ETIMEntityAIEatGrass(sheep));
    }
}
