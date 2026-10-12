package io.github.etim.etim.mixins;

import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Exposes {@code EntityLiving.persistenceRequired} (declared on the target
 * class itself, but private) for the R196 despawn main loop, which starts
 * every pass with "persisted mob → counter = 0" (MITE EntityLiving:762).
 */
@Mixin(EntityLiving.class)
public interface EntityLivingAccessor {

    @Accessor("persistenceRequired")
    boolean etim$isPersistenceRequired();
}
