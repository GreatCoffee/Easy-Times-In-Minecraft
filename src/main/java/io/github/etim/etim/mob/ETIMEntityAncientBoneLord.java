package io.github.etim.etim.mob;

import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.world.World;

/**
 * R196 {@code EntityAncientBoneLord.java:1-46} port (M5-01/02/03 + M7-04).
 * The underworld's top revenant: follow 40 / speed 0.27F / attack 8.0 /
 * hp 24.0 (R196 :12-18), the weighted weapon pool (sword w2 +
 * battleAxe/warHammer w1 — the tournament gate is dropped per the C-8
 * precedent, ETIMMobEquip.java:35-36), the full ancient-metal armor set
 * (:34-40), XP {@code super×2} (:43-45 — the BoneLord face is already
 * ×3, so the net multiplier over the vanilla skeleton base is ×6), and the
 * troop face rolls Longdead units ({@link ETIMEntityBoneLord#getTroopClass},
 * M5-08). Equipment rides the {@link ETIMMobEquip#skeletonEquip} dispatch —
 * the Ancient branch sits BEFORE the BoneLord branch (:246 面前插).
 */
public class ETIMEntityAncientBoneLord extends ETIMEntityBoneLord {

    public ETIMEntityAncientBoneLord(World world) {
        super(world);
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(40.0D); // :14
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.27D); // :15
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(8.0D); // :16
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(24.0D); // :17
        ETIMMobEquip.mobLog("ancient attr hp=24 atk=8 spd=0.27");
    }

    // R196 :43-45 — XP super×2 (on top of the BoneLord ×3).
    @Override
    protected int getExperiencePoints(EntityPlayer player) {
        return super.getExperiencePoints(player) * 2;
    }
}
