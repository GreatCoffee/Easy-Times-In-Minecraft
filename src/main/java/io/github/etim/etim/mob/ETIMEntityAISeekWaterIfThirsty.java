package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLiving;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

/**
 * B-23 — R196 {@code EntityAISeekWaterIfThirsty} verbatim hooks on the
 * {@link ETIMEntityAISeekNeedBase} machinery: the water arm's need meter =
 * the capability water level, the block table = WATER (still/flowing) +
 * both snow forms + watered CAULDRON (R196 {@code getWaterBlockIDs} ——
 * the covered-source veto rides the events scanner's cover test), the seat
 * = the four-livestock ctor {@code addTask(2, this, 1.0F, swim=false)}.
 */
public class ETIMEntityAISeekWaterIfThirsty extends ETIMEntityAISeekNeedBase {

    public ETIMEntityAISeekWaterIfThirsty(EntityLiving owner, float movementSpeed) {
        super(owner, movementSpeed, false); // R196 :7 — swim_if_necessary false (the water arm)
    }

    @Override
    protected float needLevel() {
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        return s == null ? 1.0F : s.getWater();
    }

    @Override
    protected float satedLevel() {
        return needLevel(); // R196 water tail — getWater() > 0.95F cuts the follow
    }

    @Override
    protected boolean needLow() {
        return needLevel() < 0.5F; // R196 isThirsty :124-126
    }

    @Override
    protected boolean needUrgent() {
        return needLevel() < 0.25F; // R196 isVeryThirsty :140-142
    }

    @Override
    protected boolean needDesperate() {
        return needLevel() < 0.05F; // R196 isDesperateForWater :144-146
    }

    @Override
    protected boolean nearSelf() {
        return io.github.etim.etim.mob.ETIMLivestockEvents.isNearWaterSourceAt(this.world,
                MathHelper.floor(this.owner.posX), MathHelper.floor(this.owner.posY),
                MathHelper.floor(this.owner.posZ), MathHelper.floor(this.owner.height),
                this.owner.posY + this.owner.getEyeHeight());
    }

    @Override
    protected boolean near(int x, int y, int z) {
        return io.github.etim.etim.mob.ETIMLivestockEvents.isNearWaterSourceAt(this.world, x, y, z,
                MathHelper.floor(this.owner.height), this.owner.posY + this.owner.getEyeHeight());
    }

    @Override
    protected boolean targetBlockAt(World w, int x, int y, int z) {
        // R196 getWaterBlockIDs = {waterStill, waterMoving, snow, blockSnow, cauldron}
        net.minecraft.util.math.BlockPos pos = new net.minecraft.util.math.BlockPos(x, y, z);
        net.minecraft.block.state.IBlockState st = w.getBlockState(pos);
        net.minecraft.block.Block b = st.getBlock();
        return b == net.minecraft.init.Blocks.WATER || b == net.minecraft.init.Blocks.SNOW_LAYER
                || b == net.minecraft.init.Blocks.SNOW || b == net.minecraft.init.Blocks.CAULDRON;
    }

    @Override
    protected String edgeLabel() {
        return "seekwater";
    }
}
