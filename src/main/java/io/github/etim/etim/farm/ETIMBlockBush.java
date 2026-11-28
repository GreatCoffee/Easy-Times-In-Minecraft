package io.github.etim.etim.farm;

import net.minecraft.block.Block;
import net.minecraft.block.BlockBush;
import net.minecraft.block.SoundType;
import net.minecraft.block.material.Material;
import net.minecraft.block.properties.PropertyInteger;
import net.minecraft.block.state.BlockStateContainer;
import net.minecraft.block.state.IBlockState;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Biomes;
import net.minecraft.init.Blocks;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.NonNullList;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.EnumSkyBlock;
import net.minecraft.world.IBlockAccess;
import net.minecraft.world.World;
import net.minecraft.world.biome.Biome;

import javax.annotation.Nullable;
import java.util.Random;

/**
 * R196 {@code BlockBush} (block 249 {@code bush}, subtype {@code blueberry}) —
 * B-71 (census {@code F:125}).
 *
 * <p>Metadata layout (R196 {@code BlockBush.java:34-72}): low two bits are the
 * subtype (only {@code BLUEBERRY = 0} exists), bits 2-3 are the berry growth
 * 0..3, and 3 means ripe. 1.12 carries growth as a block state; the item meta
 * stays R196's {@code getItemSubtype} value {@code 3 << 2 = 12} on every drop
 * (A-B-71-4).</p>
 *
 * <p>Faces: placement = biome ({@code FOREST}/{@code FOREST_HILLS}) + open sky
 * (R196 :97-106); survival = soil + (open sky || raw light 8..15, R196
 * {@code BlockPlant.java:25-53}); growth = temperature window 0.7 ± 1.0 × the
 * 0.1 base × humidity 1.0 × MITE global 0.25, gated on the combined light
 * ABOVE the bush being exactly 15 (R196 :174-206, {@code BlockGrowingPlant}
 * :17-96); bone meal is a DEAD face (R196 {@code fertilize} has no caller,
 * A-B-71-1) — this block deliberately does NOT implement {@code IGrowable}.
 * Drops split per A-B-71-11: {@code getDrops} only the bush itself (so
 * explosions drop the bush, never berries); berries leave through
 * right-click picking, player harvest, and illegal-removal with a player
 * within 16 blocks (R196 :108-162).</p>
 */
public class ETIMBlockBush extends BlockBush {

    /** R196 berry growth 0..3 (bits 2-3); 3 = ripe. */
    public static final PropertyInteger GROWTH = PropertyInteger.create("growth", 0, 3);
    public static final int MAX_GROWTH = 3;
    /** R196 {@code getItemSubtype} — every bush item/drop carries meta 12. */
    public static final int META_WITH_BERRIES = MAX_GROWTH << 2;

    /** R196 {@code BlockBush.java:209-216}: both optimal bounds are 0.7F. */
    private static final float OPTIMAL_TEMP = 0.7F;
    private static final float TEMP_TOLERANCE = 1.0F;
    private static final float BASE_RATE = 0.1F;
    private static final float GLOBAL_RATE = 0.25F;
    /** R196 {@code BlockGrowingPlant.java:86-92}: growth light window 15..15. */
    private static final int GROWTH_LIGHT = 15;
    /** R196 {@code BlockBush.java:12-14}: 0.3 half-width, 0.6 tall. */
    private static final AxisAlignedBB BOX =
            new AxisAlignedBB(0.2D, 0.0D, 0.2D, 0.8D, 0.6D, 0.8D);

    public ETIMBlockBush() {
        super(Material.PLANTS);
        setHardness(0.05F);                 // R196 Block.java:936
        setSoundType(SoundType.PLANT);      // R196 soundGrassFootstep
        setDefaultState(blockState.getBaseState().withProperty(GROWTH, 0));
        setTickRandomly(true);
        setCreativeTab(CreativeTabs.DECORATIONS);
    }

    // ---------------------------------------------------------------- state

    @Override
    protected BlockStateContainer createBlockState() {
        return new BlockStateContainer(this, GROWTH);
    }

    @Override
    public IBlockState getStateFromMeta(int meta) {
        int growth = (meta >> 2) & 3;
        return getDefaultState().withProperty(GROWTH, growth);
    }

    @Override
    public int getMetaFromState(IBlockState state) {
        return state.getValue(GROWTH) << 2;
    }

    /** R196 {@code getMetadataForPlacement :164-171}: creative keeps berries, survival starts at 0. */
    @Override
    public IBlockState getStateForPlacement(World world, BlockPos pos, EnumFacing facing,
                                            float hitX, float hitY, float hitZ, int meta,
                                            EntityLivingBase placer) {
        boolean creative = placer instanceof EntityPlayer
                && ((EntityPlayer) placer).capabilities.isCreativeMode;
        return getDefaultState().withProperty(GROWTH, creative ? MAX_GROWTH : 0);
    }

    // ------------------------------------------------------------ pure faces

    /** R196 {@code BlockBush.java:97-99}: only the two concrete forest instances. */
    public static boolean isBushBiome(Biome biome) {
        return biome == Biomes.FOREST || biome == Biomes.FOREST_HILLS;
    }

    /** R196 {@code BlockPlant.isLegalOn :51-53}: grass / dirt / tilled field. */
    public static boolean soilOk(IBlockState soil) {
        Block block = soil.getBlock();
        return block == Blocks.GRASS || block == Blocks.DIRT || block == Blocks.FARMLAND;
    }

    /** R196 {@code BlockBush.java:174-180}: 0.1 × tempMod × humidity 1.0 × 0.25. */
    public static float growthRateFor(float temperature) {
        float delta = Math.max(OPTIMAL_TEMP - temperature, temperature - OPTIMAL_TEMP);
        float tempMod = Math.max(1.0F - Math.max(delta, 0.0F) / TEMP_TOLERANCE, 0.0F);
        return BASE_RATE * tempMod * 1.0F * GLOBAL_RATE;
    }

    public static boolean hasBerries(int growth) {
        return growth >= MAX_GROWTH;
    }

    // ------------------------------------------------------------- placement

    @Override
    public boolean canPlaceBlockAt(World world, BlockPos pos) {
        // A-B-71-2: the biome + sky gate belongs to PLACEMENT only.
        return world.getBlockState(pos).getBlock().isReplaceable(world, pos)
                && isBushBiome(world.getBiome(pos))
                && world.canSeeSky(pos)
                && soilOk(world.getBlockState(pos.down()));
    }

    @Override
    public boolean canBlockStay(World world, BlockPos pos, IBlockState state) {
        if (!soilOk(world.getBlockState(pos.down()))) {
            return false;
        }
        if (world.canSeeSky(pos)) {
            return true;   // R196 BlockPlant.ignoresLightCheckIfUnderOpenSky :21-23
        }
        int light = Math.max(world.getLightFor(EnumSkyBlock.SKY, pos),
                world.getLightFor(EnumSkyBlock.BLOCK, pos));
        return light >= 8 && light <= 15;   // R196 BlockPlant :25-42 (RAW light)
    }

    @Override
    public AxisAlignedBB getBoundingBox(IBlockState state, IBlockAccess world, BlockPos pos) {
        return BOX;   // A-B-71-9
    }

    // ----------------------------------------------------------------- tick

    @Override
    public void updateTick(World world, BlockPos pos, IBlockState state, Random rand) {
        if (world.isRemote) {
            return;
        }
        super.updateTick(world, pos, state, rand);   // R196 :184 — legality first
        IBlockState now = world.getBlockState(pos);
        if (now.getBlock() != this) {
            return;
        }
        int growth = now.getValue(GROWTH);
        if (growth >= MAX_GROWTH) {                  // R196 :188 — ripe stops
            ETIMFarm.bushRow("growth pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " result=ripe growth=" + growth);
            return;
        }
        Biome biome = world.getBiome(pos);
        float temp = biome.getDefaultTemperature();
        float rate = growthRateFor(temp) * ETIMFarm.bushGrowthMultiplier();
        if (rate <= 0.0F) {                          // R196 :193
            ETIMFarm.bushRow("growth pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " result=cold mod=0.000 temp=" + fmt(temp));
            return;
        }
        int light = world.getLightFromNeighbors(pos.up());   // A-B-71-5
        if (light != GROWTH_LIGHT) {
            ETIMFarm.bushRow("growth pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " result=dark light=" + light);
            return;
        }
        float roll = rand.nextFloat();
        if (roll < rate) {                           // R196 :197-198
            world.setBlockState(pos, now.withProperty(GROWTH, growth + 1), 2);
            ETIMFarm.bushRow("growth pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " from=" + growth + " to=" + (growth + 1) + " light=" + light
                    + " rate=" + fmt(rate) + " roll=" + fmt(roll) + " temp=" + fmt(temp)
                    + " mod=" + fmt(tempMod(temp)));
        }
    }

    private static float tempMod(float temperature) {
        float delta = Math.max(OPTIMAL_TEMP - temperature, temperature - OPTIMAL_TEMP);
        return Math.max(1.0F - Math.max(delta, 0.0F) / TEMP_TOLERANCE, 0.0F);
    }

    private static String fmt(float value) {
        return String.format(java.util.Locale.ROOT, "%.3f", value);
    }

    // ---------------------------------------------------------------- drops

    /**
     * A-B-71-11: the self drop only — always meta 12 (R196 {@code Block.java:2344}
     * {@code getItemSubtype}). Explosions ride this method too, so they drop the
     * bush and never the berries (R196 :158-162).
     */
    @Override
    public void getDrops(NonNullList<ItemStack> drops, IBlockAccess world, BlockPos pos,
                         IBlockState state, int fortune) {
        drops.add(new ItemStack(Item.getItemFromBlock(this), 1, META_WITH_BERRIES));
    }

    /** Player break (A-B-71-11 path 3): berries on top of the self drop. */
    @Override
    public void harvestBlock(World world, EntityPlayer player, BlockPos pos, IBlockState state,
                             @Nullable TileEntity te, ItemStack stack) {
        super.harvestBlock(world, player, pos, state, te, stack);
        if (hasBerries(state.getValue(GROWTH))) {
            spawnAsEntity(world, pos, new ItemStack(ETIMFarmBlocks.BLUEBERRIES));
            ETIMFarm.bushRow("harvest pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " growth=" + state.getValue(GROWTH) + " result=berries drops=etim:blueberries:1");
        }
    }

    /** Illegal removal (A-B-71-11 path 2 / A-B-71-3): no player nearby → silent air. */
    @Override
    protected void checkAndDropBlock(World world, BlockPos pos, IBlockState state) {
        if (canBlockStay(world, pos, state)) {
            return;
        }
        boolean berries = hasBerries(state.getValue(GROWTH));
        boolean playerNear = world.getClosestPlayer(pos.getX() + 0.5D, pos.getY() + 0.5D,
                pos.getZ() + 0.5D, 16.0D, false) != null;
        if (berries && playerNear) {
            spawnAsEntity(world, pos, new ItemStack(ETIMFarmBlocks.BLUEBERRIES));
        }
        ETIMFarm.bushRow("illegal pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                + " growth=" + state.getValue(GROWTH) + " player=" + (playerNear ? 1 : 0)
                + " drops=" + (berries && playerNear ? "etim:blueberries:1" : "none"));
        world.setBlockToAir(pos);
    }

    /** Right-click picking (A-B-71-11 path 1); creative behaves the same (C-B-71-4). */
    @Override
    public boolean onBlockActivated(World world, BlockPos pos, IBlockState state, EntityPlayer player,
                                    EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ) {
        int growth = state.getValue(GROWTH);
        if (!hasBerries(growth)) {
            if (!world.isRemote) {
                ETIMFarm.bushRow("pick pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                        + " growth=" + growth + " result=refused");
            }
            return false;
        }
        if (!world.isRemote) {
            spawnAsEntity(world, pos, new ItemStack(ETIMFarmBlocks.BLUEBERRIES));
            world.setBlockState(pos, state.withProperty(GROWTH, 0), 2);
            ETIMFarm.bushRow("pick pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " growth=" + growth + " result=berries->0 drops=etim:blueberries:1");
        }
        return true;
    }
}
