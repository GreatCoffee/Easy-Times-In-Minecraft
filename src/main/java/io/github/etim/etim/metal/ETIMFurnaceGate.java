package io.github.etim.etim.metal;

import net.minecraft.block.Block;
import net.minecraft.block.BlockButton;
import net.minecraft.block.BlockFlower;
import net.minecraft.block.BlockMushroom;
import net.minecraft.block.BlockSapling;
import net.minecraft.block.BlockTallGrass;
import net.minecraft.block.BlockTorch;
import net.minecraft.block.BlockVine;
import net.minecraft.block.BlockLilyPad;
import net.minecraft.init.Blocks;
import net.minecraft.item.Item;
import net.minecraft.item.ItemBed;
import net.minecraft.item.ItemBoat;
import net.minecraft.item.ItemBlock;
import net.minecraft.item.ItemDoor;
import net.minecraft.item.ItemStack;

/**
 * The R196 large-item definition (C-M3 自写表 — the 对照报告 §四 pinned the
 * eight-block small list off Slot.isLargeItem first-hand): every BLOCK item
 * is large EXCEPT torch / sapling / flower / tallGrass / mushroom / button /
 * lilyPad / vine; on the item side door / boat / bed are large. Everything
 * else (raw ingots, food, tools) is small.
 *
 * <p>The consumer is the clay tier's {@code acceptsLargeItems=false} face
 * (R196 BlockFurnace.java:240-242 override), applied at the three R196
 * admission layers (批文项4): the slot layer (MixinSlot /
 * MixinSlotFurnaceFuel), canSmelt (MixinTileEntityFurnace) and
 * isItemValidForSlot (hopper path).</p>
 */
public final class ETIMFurnaceGate {

    public static boolean isLargeItem(ItemStack stack) {
        Item item = stack.getItem();
        if (item instanceof ItemBlock) {
            Block block = ((ItemBlock) item).getBlock();
            return !(block instanceof BlockTorch
                    || block instanceof BlockSapling
                    || block instanceof BlockFlower
                    || block instanceof BlockTallGrass
                    || block instanceof BlockMushroom
                    || block instanceof BlockButton
                    || block instanceof BlockLilyPad
                    || block instanceof BlockVine);
        }
        return item instanceof ItemDoor
                || item instanceof ItemBoat
                || item instanceof ItemBed;
    }

    private ETIMFurnaceGate() {
    }
}
