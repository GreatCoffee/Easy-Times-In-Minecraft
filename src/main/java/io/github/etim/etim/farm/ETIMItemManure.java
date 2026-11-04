package io.github.etim.etim.farm;

import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * R196 {@code ItemManure} port (farmland-moisture batch, audit20 条 280-282,
 * D-6 甲 users明文 = the施用 face; the 获取 face (R196 EntityLivestock manure
 * drop + TileEntityChest worm-compost — 终审 A-6) is debt-registered for a
 * later batch, survival obtains manure via {@code /give etim:manure} for
 * now).
 *
 * <p>The размест chain (R196 ItemManure.tryFertilizeBlock one-hand):</p>
 * <ul>
 *   <li>farmland TOP face → the R196 manure arm ({@code BlockFarmland.fertilize}):
 *       only when NOT already fertilized (A-2 — full/fertilized means NO
 *       consumption), then TE fertilized + the soilEnrichment log face
 *       (C-15 — log only, no CriteriaTriggers).</li>
 *   <li>crops/stem/brown-mushroom clicked → recurse to the farmland below
 *       (R196 recursion face).</li>
 *   <li>red mushroom on grass + OUTDOORS ({@code canSeeSky} coarse bridge,
 *       C-16 — no 1.12 {@code isOutdoors}) → 0.5 roll → the big mushroom
 *       (IGrowable grow face — R196 {@code tryGrowGiantMushroom} is the
 *       staged metadata growth; the 1.12 bridge rolls the SAME 0.5 and lets
 *       IGrowable pay the giant directly).</li>
 *   <li>brown mushroom on mycelium + INDOORS → same 0.5 roll face.</li>
 *   <li>mycelium TOP with a brown mushroom above → 0.5 roll face
 *       (R196 {@code BlockMycelium.fertilize}).</li>
 * </ul>
 */
public final class ETIMItemManure extends Item {

    private static Item item;

    public static void register() {
        item = new ETIMItemManure();
        item.setTranslationKey("etim.manure");
        item.setRegistryName(new net.minecraft.util.ResourceLocation("etim", "manure"));
        item.setCreativeTab(CreativeTabs.MATERIALS); // R196 tabMaterials
        net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.register(item);
        ETIMFarm.row("manure reg etim:manure");
    }

    public static Item item() {
        return item;
    }

    private ETIMItemManure() {
    }

    @Override
    public EnumActionResult onItemUse(EntityPlayer player, World world, BlockPos pos, EnumHand hand,
                                      EnumFacing facing, float hitX, float hitY, float hitZ) {
        if (world.isRemote) {
            return EnumActionResult.PASS;
        }
        ItemStack stack = player.getHeldItem(hand);
        IBlockState state = world.getBlockState(pos);
        Block block = state.getBlock();
        float randRoll = world.rand.nextFloat();

        // BlockMushroom face (red: outdoor grass / brown: indoor mycelium — R196 :16-56)
        if (block == Blocks.RED_MUSHROOM || block == Blocks.BROWN_MUSHROOM) {
            BlockPos below = pos.down();
            Block ground = world.getBlockState(below).getBlock();
            boolean outdoor = world.canSeeSky(pos); // C-16 coarse bridge
            boolean red = block == Blocks.RED_MUSHROOM;
            boolean legal = red ? (ground == Blocks.GRASS && outdoor)
                    : (ground == net.minecraft.init.Blocks.MYCELIUM && !outdoor);
            if (!legal) {
                return EnumActionResult.FAIL;
            }
            if (randRoll < 0.5F) {
                ((net.minecraft.block.IGrowable) block).grow(world, world.rand, pos, state);
            }
            ETIMFarm.row("fertilize src=manure kind=" + (red ? "red" : "brown")
                    + " roll=" + String.format(java.util.Locale.ROOT, "%.2f", randRoll) + " chain=mushroom");
            stack.shrink(1); // R196 convertOneOfHeldItem(null) on success
            return EnumActionResult.SUCCESS;
        }

        // the crops/stem/brown-mushroom recursion face (R196 else-branch → farm below)
        if (block instanceof net.minecraft.block.BlockCrops || block instanceof net.minecraft.block.BlockStem) {
            pos = pos.down();
            state = world.getBlockState(pos);
            block = state.getBlock();
        }

        // the mycelium TOP face (R196 :59-64 → BlockMycelium.fertilize: the brown
        // mushroom above takes the 0.5 giant roll)
        if (block == Blocks.MYCELIUM && facing == EnumFacing.UP) {
            if (world.getBlockState(pos.up()).getBlock() == Blocks.BROWN_MUSHROOM) {
                if (world.rand.nextFloat() < 0.5F) {
                    ((net.minecraft.block.IGrowable) Blocks.BROWN_MUSHROOM).grow(world, world.rand,
                            pos.up(), world.getBlockState(pos.up()));
                }
                ETIMFarm.row("fertilize src=manure chain=mycelium");
                stack.shrink(1);
                return EnumActionResult.SUCCESS;
            }
            return EnumActionResult.FAIL;
        }

        // the farmland TOP face (R196 manure arm — A-2 already-fertilized ⇒ no consume)
        if (block == Blocks.FARMLAND && facing == EnumFacing.UP) {
            io.github.etim.etim.tileentity.ETIMFarmlandTile te = ETIMFarm.farmlandTile(world, pos);
            if (te != null && te.isFertilized()) {
                return EnumActionResult.FAIL;
            }
            ETIMFarm.setFertilized(world, pos, true);
            ETIMFarm.row("fertilize src=manure chain=farm soilEnrichment=1"); // C-15 log-only
            stack.shrink(1);
            return EnumActionResult.SUCCESS;
        }

        return EnumActionResult.PASS;
    }
}
