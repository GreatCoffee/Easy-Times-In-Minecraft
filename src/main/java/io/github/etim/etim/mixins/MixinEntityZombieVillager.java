package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMZombieVillagerInvoker;
import java.util.UUID;
import net.minecraft.entity.monster.EntityZombieVillager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

/**
 * B-65 census F :162 — exposes the protected
 * {@code EntityZombieVillager#startConverting(UUID, int)} so the golden-apple
 * arm can start the cure with the R196 pacing (enchanted meta = 1 tick,
 * plain meta = 3600..6000).
 */
@Mixin(EntityZombieVillager.class)
public abstract class MixinEntityZombieVillager implements ETIMZombieVillagerInvoker {

    @Override
    @Invoker("startConverting")
    public abstract void etim$startConverting(UUID starter, int ticks);
}
