package io.github.etim.etim.farm;

import net.minecraft.block.Block;
import net.minecraft.init.Blocks;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * The R196 {@code BlockMushroom} growth-stage carrier (W-FM1 B-3 修·甲,
 * audit20 条 284): R196 keeps {@code getGrowthBits()=3} inside the block
 * metadata ({@code BlockMushroom:219-241}); 1.12 mushrooms have no metadata
 * to spare, so the stage rides this TE — the farm1 fertilized-TE seam
 * (条 256) at the mushroom's own position.
 *
 * <p>Stale-face policy = the farm1 pattern: {@link #get} nulls itself when
 * the block under it stopped being a small mushroom (picked/broken/replaced),
 * so a broken/replant cycle simply restarts the three-stage count, and the
 * TE never answers for a wrong host. The stage is server-invisible state
 * (no renderer, no update packet — nothing to draw).</p>
 */
public class ETIMMushroomGrowthTile extends TileEntity {

    /** R196 {@code getGrowthBits()/:223-225} = 3. */
    public static final int MAX_GROWTH = 3;

    private int growth;

    /** The TE at {@code pos} when the host is a small mushroom, else {@code null}. */
    public static ETIMMushroomGrowthTile get(World world, BlockPos pos) {
        TileEntity te = world.getTileEntity(pos);
        if (!(te instanceof ETIMMushroomGrowthTile)) {
            return null;
        }
        Block block = world.getBlockState(pos).getBlock();
        if (block != Blocks.BROWN_MUSHROOM && block != Blocks.RED_MUSHROOM) {
            return null;
        }
        return (ETIMMushroomGrowthTile) te;
    }

    public int getGrowth() {
        return growth;
    }

    public void setGrowth(int value) {
        growth = Math.max(0, Math.min(MAX_GROWTH, value));
        markDirty();
    }

    @Override
    public void readFromNBT(NBTTagCompound compound) {
        super.readFromNBT(compound);
        growth = compound.getInteger("EtimMushroomGrowth");
    }

    @Override
    public NBTTagCompound writeToNBT(NBTTagCompound compound) {
        super.writeToNBT(compound);
        compound.setInteger("EtimMushroomGrowth", growth);
        return compound;
    }
}
