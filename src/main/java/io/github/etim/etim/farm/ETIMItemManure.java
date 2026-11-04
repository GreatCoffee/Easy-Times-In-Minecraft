package io.github.etim.etim.farm;

import net.minecraft.block.Block;
import net.minecraft.block.BlockMushroom;
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
 * <p>The place chain (R196 ItemManure.tryFertilizeBlock one-hand), after the
 * W-FM1 regression B-3/B-4 修·甲 (audit20 条 284): the mushroom growth is the
 * R195 three-stage maturity — R196 {@code BlockMushroom.tryGrowGiantMushroom}
 * carries {@code getGrowthBits()=3} in the block metadata; 1.12 mushrooms
 * have no metadata to spare, so the stage rides
 * {@link ETIMMushroomGrowthTile} (the farm1 fertilized-TE pattern, 条 256).
 * THREE staged arms:</p>
 * <ul>
 *   <li>red on grass + OUTDOORS / brown on mycelium + INDOORS (the click
 *       arms, R196 :15-57): legality gates → the 0.5 roll (R196
 *       {@code ItemManure:51}) gates THIS click's stage increment — the manure
 *       is consumed on every gate-passed click, hit or miss; the giant pays at
 *       stage maturity (expected ~6 clicks per giant).</li>
 *   <li>mycelium TOP with a brown mushroom above (R196
 *       {@code BlockMycelium.fertilize}): NO roll, every click increments the
 *       stage — giant at the 3rd click; the indoors gate (R196
 *       {@code tryGrowGiantMushroom:183-191}) DENIES the grow but the manure
 *       is still consumed (B-4 修·甲 白吃 face — {@code fertilize} returns
 *       true regardless).</li>
 *   <li>the giant payer is 1.12 {@code BlockMushroom.generateBigMushroom}
 *       direct call (the one-hand :199-216 semantic — air → typed
 *       WorldGenBigMushroom → failed generate restores the small mushroom with
 *       the stage still at maturity for a retry).</li>
 * </ul>
 * <p>The farmland/crops/stem faces are unchanged from 条 283 (A-2 no-consume
 * recursion chain; C-15 log-only achievements; C-16 {@code canSeeSky} coarse
 * bridge for outdoors).</p>
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

    /** The R196 stage core: {@code incrementGrowth + isMaturity} (:193-241).
     *  Weighted face: returns the pre-increment stage, or {@code 3} when this
     *  click PAID the giant (and {@code -1} when the roll skipped it). */
    private static int etim$stage(World world, BlockPos pos, IBlockState state, Block block, boolean increment) {
        ETIMMushroomGrowthTile te = ETIMMushroomGrowthTile.get(world, pos);
        int stage = te == null ? 0 : te.getGrowth();
        if (!increment) {
            return -1;
        }
        if (te == null) {
            te = new ETIMMushroomGrowthTile();
            world.setTileEntity(pos, te);
        }
        te.setGrowth(stage + 1); // R196 incrementGrowth — clamped at max inside setGrowth
        if (te.getGrowth() >= ETIMMushroomGrowthTile.MAX_GROWTH) {
            // R196 :199-216 — the 1.12 public direct call carries the identical
            // air → typed-giant → restore-on-failure spine.
            ((BlockMushroom) block).generateBigMushroom(world, pos, state, world.rand);
            return ETIMMushroomGrowthTile.MAX_GROWTH;
        }
        return te.getGrowth();
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

        // the click arm (red: outdoor grass / brown: indoor mycelium — R196 :15-57)
        if (block == Blocks.RED_MUSHROOM || block == Blocks.BROWN_MUSHROOM) {
            BlockPos below = pos.down();
            Block ground = world.getBlockState(below).getBlock();
            boolean outdoor = world.canSeeSky(pos); // C-16 coarse bridge
            boolean red = block == Blocks.RED_MUSHROOM;
            boolean legalGround = red ? ground == Blocks.GRASS : ground == Blocks.MYCELIUM;
            boolean legalOut = red ? outdoor : !outdoor;
            // R196 :16-17 isLegalAt evidence — the 1.12 canBlockStay bridge
            // (light <13 unless the mycelium/podzol short-circuit).
            boolean legalLight = ((BlockMushroom) block).canBlockStay(world, pos, state);
            if (!legalGround || !legalOut || !legalLight) {
                return EnumActionResult.FAIL;
            }
            boolean rollHit = randRoll < 0.5F;
            int stage = etim$stage(world, pos, state, block, rollHit);
            if (stage >= 0) {
                ETIMFarm.row("fertilize src=manure kind=" + (red ? "red" : "brown")
                        + " roll=" + String.format(java.util.Locale.ROOT, "%.2f", randRoll)
                        + " stage=" + Math.min(stage, ETIMMushroomGrowthTile.MAX_GROWTH) + "/3 giant="
                        + (stage >= ETIMMushroomGrowthTile.MAX_GROWTH ? 1 : 0));
            } else {
                ETIMFarm.row("fertilize src=manure kind=" + (red ? "red" : "brown")
                        + " roll=" + String.format(java.util.Locale.ROOT, "%.2f", randRoll)
                        + " stage=-1 (roll missed; manure consumed)");
            }
            stack.shrink(1); // R196 :52-57 — the gated click consumes either way
            return EnumActionResult.SUCCESS;
        }

        // the crops/stem recursion face (R196 else-branch → farm below)
        if (block instanceof net.minecraft.block.BlockCrops || block instanceof net.minecraft.block.BlockStem) {
            pos = pos.down();
            state = world.getBlockState(pos);
            block = state.getBlock();
        }

        // the mycelium TOP face (R196 BlockMycelium.fertilize — NO roll, the
        // stage increments EVERY click; B-4 修·甲 indoors gate first)
        if (block == Blocks.MYCELIUM && facing == EnumFacing.UP) {
            BlockPos above = pos.up();
            IBlockState aboveState = world.getBlockState(above);
            if (aboveState.getBlock() == Blocks.BROWN_MUSHROOM) {
                if (!((BlockMushroom) Blocks.BROWN_MUSHROOM).canBlockStay(world, above, aboveState)) {
                    return EnumActionResult.FAIL; // R196 tryGrowGiantMushroom :170 isLegalAt
                }
                boolean outdoor = world.canSeeSky(above);
                if (outdoor) {
                    // B-4 修·甲: the giant is denied but the heredity of the
                    // call chain returns true — manure consumed, stage frozen
                    // (R196 :183-191 early false inside an ignored return).
                    ETIMFarm.row("fertilize src=manure chain=mycelium roll=none outdoor=1 stage=-1 (no-grow; manure consumed)");
                    stack.shrink(1);
                    return EnumActionResult.SUCCESS;
                }
                int stage = etim$stage(world, above, aboveState, aboveState.getBlock(), true);
                ETIMFarm.row("fertilize src=manure chain=mycelium roll=none stage="
                        + Math.min(stage, ETIMMushroomGrowthTile.MAX_GROWTH) + "/3 giant="
                        + (stage >= ETIMMushroomGrowthTile.MAX_GROWTH ? 1 : 0));
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
