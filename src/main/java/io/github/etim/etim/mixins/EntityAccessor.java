package io.github.etim.etim.mixins;

import net.minecraft.entity.Entity;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Exposes {@code Entity.world} (protected in the vanilla {@link Entity}
 * superclass) to plain server-side logic classes — the despawn decision code
 * (stage 5 slice 1, {@code mob/DespawnRules}) runs on the *living* subclass,
 * where a §Shadow would hit the "shadows only map fields declared by the
 * target class itself" trap (run25/26 lesson).
 */
@Mixin(Entity.class)
public interface EntityAccessor {

    @Accessor("world")
    World etim$getWorld();
}
