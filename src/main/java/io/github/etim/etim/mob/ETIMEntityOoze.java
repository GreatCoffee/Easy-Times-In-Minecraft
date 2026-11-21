package io.github.etim.etim.mob;

import net.minecraft.entity.projectile.EntitySnowball;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.world.World;

/**
 * B-57 — R196 {@code EntityOoze} (EntityOoze.java:1-77) on the ported
 * {@link ETIMEntityGelatinousCube} protocol.
 *
 * <p>Carried faces: acidic kind (acid dissolve table), size clamp to two,
 * damage/XP multiplier three, gray squish particle, lava/magic/snowball-only
 * damage immunity, climbing flag driven by horizontal collision with the
 * 0.2 climb speed, and the size-1 slimeball drop inherited from the cubic
 * base.</p>
 */
public class ETIMEntityOoze extends ETIMEntityGelatinousCube {

    /** R196 EntityOoze.isOnLadder reads the climbing data byte. */
    private boolean climbing;

    public ETIMEntityOoze(World world) {
        super(world);
    }

    /** R196 setSize(size &lt; 2 ? size : 2). */
    @Override
    public void setCubicSize(int size) {
        super.setCubicSize(Math.max(1, Math.min(size, 2)));
    }

    /** Public wrapper for the mining-spawn path (R196 calls setSize(1)). */
    public void setOozeSize(int size) {
        this.setCubicSize(size);
    }

    @Override
    protected ETIMBlockDissolve.Kind getDissolveKind() {
        return ETIMBlockDissolve.Kind.ACID;
    }

    @Override
    protected int getAttackStrengthMultiplier() {
        return 3;
    }

    @Override
    protected boolean isAcidic() {
        return true;
    }

    @Override
    protected ETIMEntityCubic createCubicInstance() {
        return new ETIMEntityOoze(this.world);
    }

    @Override
    protected EnumParticleTypes getSquishParticle() {
        return EnumParticleTypes.SLIME;
    }

    @Override
    protected int getDropSphereSubtype() {
        return ETIMItemGelatinousSphere.GRAY; // R196 EntityOoze.java:31 → 3
    }

    /** R196 isImmuneTo: only lava, magic and snowballs get through. */
    @Override
    protected boolean isImmuneToSource(DamageSource source) {
        return !(source == DamageSource.LAVA
                || source.isMagicDamage()
                || source.getImmediateSource() instanceof EntitySnowball);
    }

    @Override
    public void onUpdate() {
        super.onUpdate();
        if (!this.world.isRemote) {
            this.climbing = this.collidedHorizontally;
        }
    }

    /** R196 EntityOoze.isOnLadder reads the climbing flag. */
    @Override
    public boolean isOnLadder() {
        return this.climbing;
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (!this.world.isRemote && this.climbing && this.moveForward != 0.0F) {
            this.motionY = 0.2D;
        }
    }
}
