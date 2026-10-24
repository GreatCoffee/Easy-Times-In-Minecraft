package io.github.etim.etim.mixins;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.ContainerRepair;
import net.minecraft.inventory.IInventory;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * 批三修理面（砧修链）— read access to ContainerRepair's private members for
 * the repair-take face (ETIMAnvilRepair: the anvil pos for the wear
 * accumulator) and the takeover recompute (input/output slots, world, player,
 * the typed name for the rename overlay).
 */
@Mixin(ContainerRepair.class)
public interface ContainerRepairAccessor {

    @Accessor("outputSlot")
    IInventory etim$getOutputSlot();

    @Accessor("inputSlots")
    IInventory etim$getInputSlots();

    @Accessor("world")
    World etim$getWorld();

    @Accessor("pos")
    BlockPos etimGetPos();

    @Accessor("player")
    EntityPlayer etim$getPlayer();

    @Accessor("repairedItemName")
    String etim$getRepairedItemName();
}
