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
}
