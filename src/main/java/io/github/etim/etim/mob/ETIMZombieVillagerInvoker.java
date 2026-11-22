package io.github.etim.etim.mob;

import java.util.UUID;

/**
 * B-65 census F :162 — accessor for the protected 1.12 zombie-villager cure
 * entry point.
 *
 * <p>{@code EntityZombieVillager#startConverting(UUID, int)} is protected;
 * the R196 golden-apple arm needs to start the conversion with its own
 * pacing, so the mixin exposes it through this interface. The interface
 * lives outside the mixin package (mixin packages cannot be referenced
 * directly by other classes).</p>
 */
public interface ETIMZombieVillagerInvoker {

    void etim$startConverting(UUID starter, int ticks);
}
