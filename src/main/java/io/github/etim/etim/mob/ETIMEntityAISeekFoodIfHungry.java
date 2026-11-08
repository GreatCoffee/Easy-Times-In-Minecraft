package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLiving;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * B-23 — R196 {@code EntityAISeekFoodIfHungry} verbatim hooks on the
 * {@link ETIMEntityAISeekNeedBase} machinery: the food arm's need meter =
 * the capability food level, the block table = GRASS + TALLGRASS
 * (R196 {@code getFoodBlockIDs}), the seat = the four-livestock ctor
 * {@code addTask(2, this, 1.0F, swim=true)}.
 */
public class ETIMEntityAISeekFoodIfHungry extends ETIMEntityAISeekNeedBase {

    public ETIMEntityAISeekFoodIfHungry(EntityLiving owner, float movementSpeed) {
        super(owner, movementSpeed, true); // R196 :7 — swim_if_necessary true (the food arm)
    }

    @Override
    protected float needLevel() {
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        return s == null ? 1.0F : s.getFood();
    }

    @Override
    protected float satedLevel() {
        return needLevel(); // R196 food tail — getFood() > 0.95F cuts the follow
    }

    @Override
    protected boolean needLow() {
        return needLevel() < 0.5F; // R196 isHungry :128-130
    }

    @Override
    protected boolean needUrgent() {
        return needLevel() < 0.25F; // R196 isVeryHungry :132-134
    }

    @Override
    protected boolean needDesperate() {
        return needLevel() < 0.05F; // R196 isDesperateForFood :136-138
    }

    @Override
    protected boolean nearSelf() {
        return io.github.etim.etim.mob.ETIMLivestockEvents.isNearFoodAt(this.world,
                MathHelper.floor(this.owner.posX), MathHelper.floor(this.owner.posY),
                MathHelper.floor(this.owner.posZ), MathHelper.floor(this.owner.height), 0.0F, this.owner);
    }

    @Override
    protected boolean near(int x, int y, int z) {
        return io.github.etim.etim.mob.ETIMLivestockEvents.isNearFoodAt(this.world, x, y, z,
                MathHelper.floor(this.owner.height), 0.0F, this.owner);
    }

    @Override
    protected boolean targetBlockAt(World w, int x, int y, int z) {
        // R196 getFoodBlockIDs = {grass, tallGrass}
        net.minecraft.block.state.IBlockState st = w.getBlockState(new net.minecraft.util.math.BlockPos(x, y, z));
        return st.getBlock() == net.minecraft.init.Blocks.GRASS
                || st.getBlock() == net.minecraft.init.Blocks.TALLGRASS;
    }

    @Override
    protected String edgeLabel() {
        return "seekfood";
    }
}
