package io.github.etim.etim.mob;

/**
 * B-55 — shared face of the R196 bat family ({@code EntityBat} subclasses with
 * their own experience values). Kept separate from the vanilla class so probes
 * and the renderer can read the R196 numbers without reflection.
 */
public interface ETIMBatFamily {

    /** R196 {@code EntityBat.getExperienceValue()}: vampire 5, nightwing 10, giant 10. */
    int etimExperienceValue();
}
