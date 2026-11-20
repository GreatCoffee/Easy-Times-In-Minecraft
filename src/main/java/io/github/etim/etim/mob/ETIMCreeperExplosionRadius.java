package io.github.etim.etim.mob;

/**
 * B-47 carrier for the R196 infernal-creeper radius ({@code explosionRadius *= 2.0F}).
 *
 * <p>1.12 keeps {@code EntityCreeper.explosionRadius} private with no setter, so
 * {@code MixinEntityCreeper} exposes this one write. The interface is implemented
 * on the base class; only {@link ETIMEntityInfernalCreeper} calls it.</p>
 */
public interface ETIMCreeperExplosionRadius {

    void etim$setExplosionRadius(int radius);

    int etim$getExplosionRadius();
}
