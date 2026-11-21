package io.github.etim.etim.mob;

import net.minecraft.world.World;

/**
 * B-55 — R196 {@code EntityGiantVampireBat} (EntityGiantVampireBat.java:3-9):
 * a vampire bat with a 2× scale factor and nothing else. R196 reuses the same
 * class body and branches on {@code isGiantSized()} (2.0 health/damage
 * multiplier, 10 XP, 1.0×1.8 hitbox); this child pins the same three values,
 * and the underworld spawn substitution
 * ({@code ETIMUnderworldSpawns.substituteClassToSpawn}, C-5) swaps 1/6 of the
 * vampire bats for it.
 */
public class ETIMEntityGiantVampireBat extends ETIMEntityVampireBat {

    public ETIMEntityGiantVampireBat(World world) {
        super(world);
        this.experienceValue = 10;
        this.setSize(1.0F, 1.8F);
    }

    @Override
    protected float etimScaleFactor() {
        return 2.0F;
    }

    @Override
    protected boolean isGiant() {
        return true;
    }
}
