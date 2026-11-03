package io.github.etim.etim.tileentity;

import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.tileentity.TileEntity;

/**
 * farm1 (batch B4, audit20 条 254-257 D-1) fertilized-bit carrier for
 * vanilla farmland. R196 rode metadata bit 8 (BlockFarmland.java:18/:184-194)
 * — 1.12 proven-dead (getStateFromMeta {@code meta & 7}, palette-only chunk
 * storage, 终审条 257 亲证) so the bit lives as a Chunk-persisted TE instead
 * (free NBT round-trip; removed automatically when the farmland is swapped
 * out by turnToDirt/setBlockState, the identical "fertilized dies with the
 * block" semantics as R196's metadata bit).
 *
 * <p>Client note: no sync packets — the SERVER is the authority for growth
 * scheduling and drops; the client keeps vanilla facing.</p>
 */
public class ETIMFarmlandTile extends TileEntity {

    private boolean fertilized;

    public boolean isFertilized() {
        return fertilized;
    }

    public void setFertilized(boolean value) {
        if (value != fertilized) {
            fertilized = value;
            markDirty();
        }
    }

    @Override
    public void readFromNBT(NBTTagCompound compound) {
        super.readFromNBT(compound);
        fertilized = compound.getBoolean("EtimFertilized");
    }

    @Override
    public NBTTagCompound writeToNBT(NBTTagCompound compound) {
        super.writeToNBT(compound);
        compound.setBoolean("EtimFertilized", fertilized);
        return compound;
    }

    /**
     * A-1 (farm1 W-F, 会话七条 259): Forge's default kills non-vanilla TEs
     * on ANY state change — farmland moisture dries/waters in ticks, so the
     * fertilized bit died within seconds. R196 {@code setWetness} preserves
     * bit 8 across moisture writes (BlockFarmland.java:180-182), so the TE
     * survives SAME-block state changes and still dies with the block
     * (turnToDirt/破块) — the identical "fertilized lives with the block"
     * semantics.
     */
    @Override
    public boolean shouldRefresh(net.minecraft.world.World world, net.minecraft.util.math.BlockPos pos,
                                 net.minecraft.block.state.IBlockState oldState,
                                 net.minecraft.block.state.IBlockState newState) {
        return oldState.getBlock() != newState.getBlock();
    }
}
