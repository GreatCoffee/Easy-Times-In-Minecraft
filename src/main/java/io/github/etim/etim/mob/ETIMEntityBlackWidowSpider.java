package io.github.etim.etim.mob;

import net.minecraft.world.World;

/**
 * R196 {@code EntityBlackWidowSpider} port (:3-13) — pure inheritance: the
 * whole judged face (poison 960 via the Wood exact-class branch, 50% spawn
 * gate, jungle-only weight row) rides the carrier. Experience = 5×8/5 = 8
 * (verdict G-S7, integer-exact per the javap imul/idiv face).
 */
public class ETIMEntityBlackWidowSpider extends ETIMEntityWoodSpider {

    public ETIMEntityBlackWidowSpider(World world) {
        super(world);
        this.experienceValue = 8;
    }
}
