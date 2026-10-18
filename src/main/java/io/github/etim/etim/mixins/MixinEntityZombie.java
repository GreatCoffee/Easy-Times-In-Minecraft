package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMEntityAIDig;
import net.minecraft.entity.monster.EntityZombie;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * AI-02 — R196 hangs the dig task in the digger-base constructor
 * (EntityAnimalWatcher.java:14 {@code tasks.addTask(1, new
 * EntityAIWatchAnimal(this))}); the ETIM host is zombies only (mobs-ai
 * verdict 裁 3 — the sensor's {@code instanceof EntityZombie} judgement face
 * closes the chain), so the task joins at the initEntityAI tail. Priority 1 /
 * mutex 3 are the R196 faces (:9/:14).
 */
@Mixin(EntityZombie.class)
public abstract class MixinEntityZombie {

    @Inject(method = "initEntityAI", at = @At("TAIL"))
    private void etim$addDigAI(CallbackInfo ci) {
        EntityZombie zombie = (EntityZombie) (Object) this;
        // A7（2026-10-18 裁）：cfg 门只在执行面（ETIMEntityAIDig.shouldExecute 首出口），
        // 注册面只留 isRemote —— 注册面双闸使 gate=cfg 行结构性不可达。
        if (!zombie.world.isRemote) {
            zombie.tasks.addTask(1, new ETIMEntityAIDig(zombie)); // R196 :14, priority 1 / mutex 3
        }
    }
}
