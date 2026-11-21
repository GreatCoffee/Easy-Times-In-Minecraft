package io.github.etim.etim.mob;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.potion.PotionEffect;
import net.minecraft.init.MobEffects;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.world.World;

/**
 * B-57 — R196 {@code EntityBlob} (EntityBlob.java:1-25): pepsin branch,
 * damage/XP multiplier three, and the contact slow (the player loses movement
 * speed for a hundred ticks when a blob connects).
 */
public class ETIMEntityBlob extends ETIMEntityGelatinousCube {

    public ETIMEntityBlob(World world) {
        super(world);
    }

    @Override
    protected ETIMBlockDissolve.Kind getDissolveKind() {
        return ETIMBlockDissolve.Kind.PEPSIN;
    }

    @Override
    protected int getAttackStrengthMultiplier() {
        return 3;
    }

    @Override
    protected boolean isAcidic() {
        return false;
    }

    @Override
    protected ETIMEntityCubic createCubicInstance() {
        return new ETIMEntityBlob(this.world);
    }

    @Override
    protected EnumParticleTypes getSquishParticle() {
        return EnumParticleTypes.SLIME;
    }

    @Override
    protected boolean slowsPlayerOnContact() {
        return true;
    }

    @Override
    public boolean attackEntityAsMob(Entity target) {
        boolean hit = super.attackEntityAsMob(target);
        if (hit && target instanceof EntityLivingBase) {
            ((EntityLivingBase) target).addPotionEffect(new PotionEffect(MobEffects.SLOWNESS, 100, 5));
        }
        return hit;
    }

    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        boolean hurt = super.attackEntityFrom(source, amount);
        if (hurt && source.getTrueSource() instanceof EntityLivingBase) {
            ((EntityLivingBase) source.getTrueSource())
                    .addPotionEffect(new PotionEffect(MobEffects.SLOWNESS, 100, 5));
        }
        return hurt;
    }
}
