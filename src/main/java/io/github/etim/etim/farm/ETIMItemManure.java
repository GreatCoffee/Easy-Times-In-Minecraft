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
 * <p>After the W-FM1/W-FM7 regression fixes (audit20 条 284, users 甲) the
 * mushroom chain is the R196 three-stage maturity carried by
 * {@link ETIMMushroomGrowthTile} (1.12 has no metadata to spare; the stage
 * TE is collected via {@code MixinBlockMushroomTile}'s two needles on the
 * hasTileEntity/createTileEntity seam — the farm1 farmland-TE pattern):</p>
 * <ul>
 *   <li>the CLICK arms (R196 {@code ItemManure.tryFertilizeBlock:15-57}):
 *       flight-safety gates = {@code isLegalAt} (the sky-occlusion bridge),
 *       the ground match (red⇔grass / brown⇔mycelium), and
 *       {@code isOutdoors} (the verbatim R196 flood port). Every gate-passed
 *       click consumes the manure; the R196 :51 0.5 roll gates whether THIS
 *       click increments the stage. Giant pays at stage maturity via 1.12
 *       {@code BlockMushroom.generateBigMushroom} (the public direct call —
 *       air → typed giant → restore-on-failure; on failure the mature stage
 *       TE is re-pinned, the :213-215 metadata face).</li>
 *   <li>a red mushroom ABOVE clicked-on grass (R196 :50-52 — W-FM7 B-1
 *       修: the grass TOP entrance).</li>
 *   <li>a mushroom standing on farmland recurses DOWN to the farmland arm
 *       (R196 :22-24).</li>
 *   <li>the MYCELIUM TOP arm (R196 {@code BlockMycelium.fertilize}): NO
 *       roll, every legal click increments the stage — giant at the 3rd;
 *       the R196 indoor gate (TRY {@code tryGrowGiantMushroom:183-191})
 *       silently denies the grow but {@code fertilize} returns true, so the
 *       manure IS consumed (B-4 修·甲 白吃 face).</li>
 *   <li>the farmland TOP face: unchanged from 条 283 (A-2 no-consume when
 *       already fertilized; C-15 log-only; the crops/stem recursion sits
 *       before it).</li>
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

    /** The R196 stage core ({@code incrementGrowth/isMature :193-241}).
     *  Returns the pre-click stage, {@code MAX} when this click paid the
     *  giant, or {@code -1} when the roll skipped the increment. */
    private static int etim$stage(EntityPlayer player, World world, BlockPos pos, IBlockState state, Block block, boolean increment) {
        ETIMMushroomGrowthTile te = ETIMMushroomGrowthTile.get(world, pos);
        int stage = te == null ? 0 : te.getGrowth();
        if (!increment) {
            return -1;
        }
        if (te == null) {
            te = new ETIMMushroomGrowthTile();
            world.setTileEntity(pos, te); // effective since MixinBlockMushroomTile (A-2 修)
        }
        te.setGrowth(stage + 1); // R196 incrementGrowth clamped inside
        if (te.getGrowth() >= ETIMMushroomGrowthTile.MAX_GROWTH) {
            // B-5 修（条 285-286 用户甲）— stamp the code-grown series so the
            // Forge place-snapshot wrapper's PlaceEvent (giant block hardness
            // 0.2) is denied in chargePlace: R196 charges the place face only
            // via tryPlaceHeldItemAsBlock (:2654-2659), which the manure
            // click never touches.
            io.github.etim.etim.hunger.ETIMEndurance.stampCodeGrown(player, world.getTotalWorldTime());
            boolean paid = ((BlockMushroom) block).generateBigMushroom(world, pos, state, world.rand);
            if (!paid) {
                // B-2 修 — R196 :213-215 restores the metadata with the
                // maturity bit still set; the block churn can drop the TE,
                // so re-pin the mature stage for the retry click.
                ETIMMushroomGrowthTile pin = ETIMMushroomGrowthTile.get(world, pos);
                if (pin == null) {
                    pin = new ETIMMushroomGrowthTile();
                    world.setTileEntity(pos, pin);
                }
                pin.setGrowth(ETIMMushroomGrowthTile.MAX_GROWTH);
                ETIMFarm.row("fertilize src=manure giant=failed stage=3/3 (generate denied; retry next click)");
            }
            return ETIMMushroomGrowthTile.MAX_GROWTH;
        }
        return stage + 1;
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

        // the mushroom CLICK arm (red: outdoor grass / brown: indoor mycelium — R196 :15-57)
        if (block instanceof BlockMushroom) {
            // R196 :22-24 — a mushroom standing on farmland recurses DOWN
            BlockPos below = pos.down();
            if (world.getBlockState(below).getBlock() == Blocks.FARMLAND) {
                return onItemUse(player, world, below, hand, EnumFacing.UP, hitX, hitY, hitZ);
            }
            boolean red = block == Blocks.RED_MUSHROOM;
            Block ground = world.getBlockState(below).getBlock();
            boolean legalGround = red ? ground == Blocks.GRASS : ground == Blocks.MYCELIUM;
            boolean outdoors = ETIMFarm.isOutdoorsMITE(world, pos.getX(), pos.getY(), pos.getZ(), true);
            boolean legalOut = red ? outdoors : !outdoors;
            boolean legal = ETIMFarm.mushroomLegalAtMITE(world, pos);
            if (!legalGround || !legalOut || !legal) {
                ETIMFarm.row("fertilize src=manure kind=" + (red ? "red" : "brown")
                        + " gate=deny ground=" + (legalGround ? 1 : 0)
                        + " out=" + (red ? (legalOut ? 1 : 0) : (legalOut ? 0 : 1))
                        + " legal=" + (legal ? 1 : 0)
                        + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
                return EnumActionResult.FAIL; // R196 gate fail = silent, no consume
            }
            boolean rollHit = randRoll < 0.5F;
            int stage = etim$stage(player, world, pos, state, block, rollHit);
            if (stage < 0) {
                ETIMFarm.row("fertilize src=manure kind=" + (red ? "red" : "brown")
                        + " roll=" + String.format(java.util.Locale.ROOT, "%.2f", randRoll)
                        + " stage=-1 (roll missed; manure consumed)");
            } else {
                ETIMFarm.row("fertilize src=manure kind=" + (red ? "red" : "brown")
                        + " roll=" + String.format(java.util.Locale.ROOT, "%.2f", randRoll)
                        + " stage=" + Math.min(stage, ETIMMushroomGrowthTile.MAX_GROWTH) + "/3 giant="
                        + (stage >= ETIMMushroomGrowthTile.MAX_GROWTH ? 1 : 0));
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

        // the grass TOP entrance: a red mushroom ABOVE clicked-on grass
        // walks up to the mushroom arm (R196 :50-52 — W-FM7 B-1 修)
        if (block == Blocks.GRASS && facing == EnumFacing.UP
                && world.getBlockState(pos.up()).getBlock() == Blocks.RED_MUSHROOM) {
            return onItemUse(player, world, pos.up(), hand, EnumFacing.UP, hitX, hitY, hitZ);
        }

        // the MYCELIUM TOP arm (R196 BlockMycelium.fertilize — NO roll, the
        // stage increments EVERY legal click; giant at the 3rd)
        if (block == Blocks.MYCELIUM && facing == EnumFacing.UP) {
            BlockPos above = pos.up();
            IBlockState aboveState = world.getBlockState(above);
            if (aboveState.getBlock() != Blocks.BROWN_MUSHROOM) {
                return EnumActionResult.FAIL;
            }
            if (!ETIMFarm.mushroomLegalAtMITE(world, above)) {
                return EnumActionResult.FAIL; // R196 tryGrowGiantMushroom :170 — silent
            }
            boolean outdoors = ETIMFarm.isOutdoorsMITE(world, above.getX(), above.getY(), above.getZ(), true);
            if (outdoors) {
                // B-4 修·甲 — R196 denies the grow but fertilize returns
                // TRUE, so the manure is consumed (the 白吃 face); the stage
                // stays untouched.
                ETIMFarm.row("fertilize src=manure chain=mycelium roll=none outdoor=1 stage=-1 (no-grow; manure consumed)");
                stack.shrink(1);
                return EnumActionResult.SUCCESS;
            }
            int stage = etim$stage(player, world, above, aboveState, aboveState.getBlock(), true);
            ETIMFarm.row("fertilize src=manure chain=mycelium roll=none stage="
                    + Math.min(Math.max(stage, 0), ETIMMushroomGrowthTile.MAX_GROWTH) + "/3 giant="
                    + (stage >= ETIMMushroomGrowthTile.MAX_GROWTH ? 1 : 0));
            stack.shrink(1);
            return EnumActionResult.SUCCESS;
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
