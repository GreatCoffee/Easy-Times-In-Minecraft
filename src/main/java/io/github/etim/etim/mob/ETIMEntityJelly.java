package io.github.etim.etim.mob;

import net.minecraft.util.EnumParticleTypes;
import net.minecraft.world.World;

/**
 * B-57 — R196 {@code EntityJelly} (EntityJelly.java:1-25): the pepsin branch of
 * the slime family. Damage/XP multiplier two, ochre body.
 */
public class ETIMEntityJelly extends ETIMEntityGelatinousCube {

    public ETIMEntityJelly(World world) {
        super(world);
    }

    @Override
    protected ETIMBlockDissolve.Kind getDissolveKind() {
        return ETIMBlockDissolve.Kind.PEPSIN;
    }

    @Override
    protected int getAttackStrengthMultiplier() {
        return 2;
    }

    @Override
    protected boolean isAcidic() {
        return false;
    }

    @Override
    protected ETIMEntityCubic createCubicInstance() {
        return new ETIMEntityJelly(this.world);
    }

    @Override
    protected EnumParticleTypes getSquishParticle() {
        return EnumParticleTypes.SLIME;
    }
}
