package io.github.etim.etim.fml;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.ContainerFurnace;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.tileentity.TileEntityFurnace;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.fml.common.network.IGuiHandler;

/**
 * Batch B1: ETIM's first GuiHandler (批文项2). The furnace GUI rides the FML
 * openGui path so the pos rides the open packet and BOTH ends bind the REAL
 * tile entity's inventory — the vanilla displayGUIChest chain binds a dumb
 * ContainerLocalMenu mirror on the client, which would read the vanilla cap
 * for every tier there. Server element opens ContainerFurnace (public code
 * only, dedicated-server safe); the client element lives in
 * io.github.etim.etim.client.ETIMClientGuiHooks (client.* imports confined
 * to that class — it loads on client invocation only).
 */
public final class ETIMGuiHandler implements IGuiHandler {

    public static final int FURNACE = 0;

    @Override
    public Object getServerGuiElement(int id, EntityPlayer player, World world, int x, int y, int z) {
        if (id == FURNACE) {
            TileEntity te = world.getTileEntity(new BlockPos(x, y, z));
            if (te instanceof TileEntityFurnace) {
                return new ContainerFurnace(player.inventory, (TileEntityFurnace) te);
            }
        }
        return null;
    }

    @Override
    public Object getClientGuiElement(int id, EntityPlayer player, World world, int x, int y, int z) {
        // Only ever invoked client-side; the hook class keeps the client imports.
        return io.github.etim.etim.client.ETIMClientGuiHooks.getFurnaceGui(id, player, world, x, y, z);
    }
}
