package io.github.etim.etim.mob;

/**
 * B-55 — the R196 {@code EntityPlayer.vision_dimming} field
 * (EntityPlayer.java:45) on the 1.12 player. R196 keeps it on the player
 * itself, decays it 0.01/tick and persists it as NBT {@code vision_dimming};
 * the 1.12 carrier is a mixin field behind this interface.
 */
public interface ETIMVisionDimmingDuck {

    float etim$getVisionDimming();

    void etim$setVisionDimming(float value);
}
