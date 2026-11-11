package io.github.etim.etim.mixins;

import net.minecraft.pathfinding.NodeProcessor;
import net.minecraft.pathfinding.PathNavigate;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * B-31 — exposes {@code PathNavigate.nodeProcessor} (protected on the
 * vanilla {@link PathNavigate} superclass) to the R196 break-door face.
 * R196's {@code PathNavigate.getCanBreakDoors()} flag maps onto the 1.12
 * node-processor state ({@code PathNavigateGround.setBreakDoors :319 →
 * NodeProcessor.setCanOpenDoors}), so {@code ETIMEntityAIBreakDoor}'s
 * base-scan gate (R196 EntityAIDoorInteract :25) reads the carrier as
 * {@code nodeProcessor.getCanOpenDoors()}. Same shadow-trap shape as
 * {@link EntityAccessor} (a §Shadow on the owning class would not reach
 * the superclass-declared field).
 */
@Mixin(PathNavigate.class)
public interface PathNavigateAccessor {

    @Accessor("nodeProcessor")
    NodeProcessor etim$getNodeProcessor();
}
