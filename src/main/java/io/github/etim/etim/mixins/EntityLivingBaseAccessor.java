package io.github.etim.etim.mixins;

import net.minecraft.entity.EntityLivingBase;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Exposes {@code EntityLivingBase.idleTime} (declared on the *superclass*, so
 * it must be accessor-bridged rather than §Shadow-ed — run25 lesson). R196
 * keeps the despawn counter on {@code Entity.despawn_counter}, incremented
 * once per entity update tick (MITE World.updateEntity :2720) and persisted
 * in NBT; vanilla 1.12 {@code idleTime} is the same once-per-tick server
 * counter, so it is reused as the R196 counter storage.
 */
@Mixin(EntityLivingBase.class)
public interface EntityLivingBaseAccessor {

    @Accessor("idleTime")
    int etim$getIdleTime();

    @Accessor("idleTime")
    void etim$setIdleTime(int value);
}
