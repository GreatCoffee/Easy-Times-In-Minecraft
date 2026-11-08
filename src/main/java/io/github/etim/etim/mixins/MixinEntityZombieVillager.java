package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMEntityAIFleeSun;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.passive.EntityVillager;
import net.minecraft.entity.monster.EntityZombieVillager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-18 (audit20 条 309 C级 8) — the child-cure age carry-over face. When a
 * baby zombie villager is cured, 1.12 {@code EntityZombieVillager
 * .finishConversion :237} hardcodes the freshly-born villager's age to
 * {@code -24000} (inside the existing {@code isChild()} gate — vanilla
 * keeps a cured child a child). R196 carries the same gate
 * {@code EntityZombie.java:360-362} but routes the write through
 * {@code setGrowingAgeToNewborn()} = {@code -64000} — the cure face is
 * R196's uniform newborn pipeline, not the vanilla spawn window.
 *
 * <p>carrier: a value-only redirect on the villager write (the vanilla
 * {@code isChild()} gate stays untouched ahead of it). The helper is
 * flag-gated inside — flag off passes the vanilla {@code -24000} back
 * verbatim, and the ageGateRow only rings when the value actually moved
 * (the helper's mapping), matching the other B-18 faces.</p>
 */
@Mixin(EntityZombieVillager.class)
public abstract class MixinEntityZombieVillager {

    /**
     * B-24 — the R196 {@code EntityZombie.setVillager :83-88} zombie-villager
     * seat: {@code addTask(1, EntityAIRestrictSun)} + {@code addTask(2,
     * EntityAIFleeSun, 1.0)}. R196 calls the wedge inside {@code
     * setVillager(true)} (the zombie-villager spawning); 1.12's zombie
     * villager is its own entity class — the ctor TAIL is the carrier.
     * {@code EntityAIRestrictSun} = the 1.12 vanilla class (zero new code).
     */
    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$fleeSunAITask(net.minecraft.world.World world, CallbackInfo ci) {
        net.minecraft.entity.EntityCreature creature = (net.minecraft.entity.EntityCreature) (Object) this;
        creature.tasks.addTask(1, new net.minecraft.entity.ai.EntityAIRestrictSun(creature));
        creature.tasks.addTask(2, new ETIMEntityAIFleeSun(creature, 1.0D));
    }

    @Redirect(
        method = "finishConversion",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/passive/EntityVillager;setGrowingAge(I)V"),
        require = 1)
    private void etim$cureChildAge(EntityVillager villager, int vanillaAge) {
        villager.setGrowingAge(ETIMLivestockEvents.r196NewbornAge(vanillaAge));
        if (villager.getGrowingAge() != vanillaAge) {
            ETIMLivestockEvents.ageGateRow("zombieCureChild", villager, villager.getGrowingAge());
        }
    }
}
