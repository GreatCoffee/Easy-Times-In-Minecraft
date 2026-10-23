package io.github.etim.etim.client;

import net.minecraft.client.gui.inventory.GuiFurnace;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.tileentity.TileEntityFurnace;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import io.github.etim.etim.fml.ETIMGuiHandler;

/**
 * Client-only GUI hooks for {@link ETIMGuiHandler} (the ONLY class in the
 * furnace GUI chain importing net.minecraft.client.* — loaded on client
 * invocation only, dedicated servers never touch it).
 */
public final class ETIMClientGuiHooks {

    public static Object getFurnaceGui(int id, EntityPlayer player, World world, int x, int y, int z) {
        if (id == ETIMGuiHandler.FURNACE) {
            TileEntity te = world.getTileEntity(new BlockPos(x, y, z));
            if (te instanceof TileEntityFurnace) {
                return new GuiFurnace(player.inventory, (TileEntityFurnace) te);
            }
        }
        return null;
    }

    private ETIMClientGuiHooks() {
    }
}
