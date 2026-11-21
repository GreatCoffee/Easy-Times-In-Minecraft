package io.github.etim.etim.mob;

import net.minecraft.entity.projectile.EntitySnowball;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.world.World;

/**
 * B-57 — R196 {@code EntityPudding} (EntityPudding.java:1-45): the acidic
 * branch's heavy body. Damage/XP multiplier four, black body, and the wider
 * immunity list (fire, lava, magic and snowballs are the only ways in).
 */
public class ETIMEntityPudding extends ETIMEntityGelatinousCube {

    public ETIMEntityPudding(World world) {
        super(world);
    }

    @Override
    protected ETIMBlockDissolve.Kind getDissolveKind() {
        return ETIMBlockDissolve.Kind.ACID;
    }

    @Override
    protected int getAttackStrengthMultiplier() {
        return 4;
    }

    @Override
    protected boolean isAcidic() {
        return true;
    }

    @Override
    protected ETIMEntityCubic createCubicInstance() {
        return new ETIMEntityPudding(this.world);
    }

    @Override
    protected EnumParticleTypes getSquishParticle() {
        return EnumParticleTypes.SLIME;
    }

    @Override
    protected int getDropSphereSubtype() {
        return ETIMItemGelatinousSphere.BLACK; // R196 EntityPudding.java:19 → 4
    }

    /** R196 isImmuneTo: fire, lava, magic and snowballs pass; the rest bounce. */
    @Override
    protected boolean isImmuneToSource(DamageSource source) {
        return !(source.isFireDamage()
                || source == DamageSource.LAVA
                || source.isMagicDamage()
                || source.getImmediateSource() instanceof EntitySnowball);
    }
}
