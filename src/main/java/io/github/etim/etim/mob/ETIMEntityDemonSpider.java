package io.github.etim.etim.mob;

import net.minecraft.block.material.Material;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.init.MobEffects;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.DamageSource;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * R196 {@code EntityDemonSpider} port (:3-58). Experience = 5×3 = 15
 * (verdict G-S7). The EntityAIGetOutOfLava task (:6) is N/A per verdict
 * G-S4 — fire/lava immunity makes its behavior face near-zero; the sound
 * face rides the user's G-S9b verdict (vanilla spider, pitched down).
 */
public class ETIMEntityDemonSpider extends ETIMEntityArachnid {

    public ETIMEntityDemonSpider(World world) {
        super(world, 1.0F); // 1.4F×0.9F box
        this.experienceValue = 15;
        // this.tasks.addTask(4, GetOutOfLava) — N/A (verdict G-S4)
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(18.0D);   // :15-19
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(5.0D);
    }

    @Override
    public float getSoundPitch() {
        return super.getSoundPitch() * 0.6F; // user verdict G-S9b: low/tense vanilla variant
    }

    @Override
    public boolean peacefulDuringDay() {
        return false; // R196 :44-46
    }

    /**
     * R196 :30-42 — poison 480 + move-slowdown V for 50 ticks (both stamped
     * by the javap face: bipush 50 / iconst_5).
     */
    @Override
    public boolean attackEntityAsMob(Entity target) {
        boolean flag = super.attackEntityAsMob(target);
        if (flag && target instanceof EntityLivingBase) {
            EntityLivingBase elb = (EntityLivingBase) target;
            elb.addPotionEffect(new PotionEffect(MobEffects.POISON, 480, 0));
            elb.addPotionEffect(new PotionEffect(MobEffects.SLOWNESS, 50, 5));
        }
        return flag;
    }

    /**
     * R196 :48-54 — isHarmedByFire/isHarmedByLava both false: the fire/lava
     * damage sources are refused outright.
     */
    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        if (source == DamageSource.IN_FIRE || source == DamageSource.ON_FIRE
                || source == DamageSource.LAVA) {
            return false;
        }
        return super.attackEntityFrom(source, amount);
    }

    /**
     * R196 :56-58 canSpawnInShallowWater=false, consumed by the R196
     * EntityLiving spawn-geometry arm (one-hand: top-block water → false;
     * foot water under a solid top → false).
     */
    @Override
    public boolean getCanSpawnHere() {
        if (!super.getCanSpawnHere()) {
            return false;
        }
        BlockPos foot = new BlockPos(this.posX, this.posY, this.posZ);
        BlockPos above = foot.up();
        if (this.world.getBlockState(above).getMaterial() == Material.WATER) {
            return false;
        }
        return !(this.world.getBlockState(foot).getMaterial() == Material.WATER
                && this.world.getBlockState(above).isNormalCube());
    }
}
