package io.github.etim.etim.mob;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.init.Items;
import net.minecraft.init.MobEffects;
import net.minecraft.item.Item;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.DamageSource;
import net.minecraft.world.World;

/**
 * R196 {@code EntityWoodSpider} port (:3-52) — the CARRIER class for
 * BlackWidow/Phase; per verdict G-S5 it does NOT enter the spawn tables.
 */
public class ETIMEntityWoodSpider extends ETIMEntityArachnid {

    public ETIMEntityWoodSpider(World world) {
        super(world, 0.6F); // R196 :5-7 — 0.84F×0.54F box after the Arachnid scaling
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(6.0D);     // :10-14
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.8D);
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(1.0D);
    }

    @Override
    public float getSoundVolume() {
        return super.getSoundVolume() * 0.6F; // R196 :16-21
    }

    @Override
    public float getSoundPitch() {
        return super.getSoundPitch() * 1.2F; // R196 :23-28
    }

    @Override
    public boolean peacefulDuringDay() {
        return false; // R196 :30-32 — wood family is hostile day and night
    }

    /**
     * R196 :34-47 — the poison branch keyed on the EXACT class (wood 240 /
     * black widow 960); 1.12's boolean flag stands in for the R196
     * EntityDamageResult.entityLostHealth face (C-grade register).
     */
    @Override
    public boolean attackEntityAsMob(Entity target) {
        boolean flag = super.attackEntityAsMob(target);
        if (flag && target instanceof EntityLivingBase) {
            EntityLivingBase elb = (EntityLivingBase) target;
            if (this.getClass() == ETIMEntityWoodSpider.class) {
                elb.addPotionEffect(new PotionEffect(MobEffects.POISON, 240, 0));
            } else if (this.isBlackWidowSpider()) {
                elb.addPotionEffect(new PotionEffect(MobEffects.POISON, 960, 0));
            }
        }
        return flag;
    }

    /** R196 :49-51 — 40% silk, else nothing. */
    @Override
    protected Item getDropItem() {
        return this.rand.nextFloat() < 0.4F ? Items.STRING : null;
    }
}
