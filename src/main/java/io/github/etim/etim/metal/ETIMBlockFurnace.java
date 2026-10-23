package io.github.etim.etim.metal;

import java.util.Random;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.fml.ETIMGuiHandler;
import net.minecraft.block.Block;
import net.minecraft.block.BlockContainer;
import net.minecraft.block.BlockHorizontal;
import net.minecraft.block.SoundType;
import net.minecraft.block.material.Material;
import net.minecraft.block.properties.IProperty;
import net.minecraft.block.properties.PropertyDirection;
import net.minecraft.block.state.BlockStateContainer;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.Container;
import net.minecraft.inventory.IInventory;
import net.minecraft.inventory.InventoryHelper;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.stats.StatList;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.tileentity.TileEntityFurnace;
import net.minecraft.util.EnumBlockRenderType;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.Mirror;
import net.minecraft.util.Rotation;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * One ETIM furnace tier, both R196 halves (idle + burning) as SEPARATE block
 * instances — the 1.12 vanilla FURNACE/LIT_FURNACE shape the 终审 B-4 改判
 * pinned (Blocks.java:389-390; the 对照报告's single-block LIT-property
 * reading was the 1.13+ form). The TileEntity is the VANILLA
 * {@link TileEntityFurnace} (vanilla {@code update()} fires
 * {@code BlockFurnace.setState} on ignite/burnout — MixinBlockFurnace routes
 * that call to the tier's twin here, the R196
 * {@code updateFurnaceBlockState} :136-152 shape: keep-inventory swap,
 * re-validate, re-set the same TE).
 *
 * <p>Drop faces (R196 BlockFurnace.java:40-71): mining/pick drops the IDLE
 * furnace item (canBeCarried/createStackedBlock); explosion drops the base
 * material — clay and hardenedClay drop nothing. The burning light is
 * R196's 0.875.</p>
 */
public class ETIMBlockFurnace extends BlockContainer {

    /** The vanilla-shared facing property (same instance BlockFurnace uses). */
    public static final PropertyDirection FACING = BlockHorizontal.FACING;

    /** Blocks the inventory drop during the twin swap (R196 keepFurnaceInventory :139/:147). */
    private static boolean etim$keepInventory;

    private final ETIMFurnaceTier tier;
    private final boolean burning;

    public ETIMBlockFurnace(ETIMFurnaceTier tier, boolean burning) {
        super(tier.material);
        this.tier = tier;
        this.burning = burning;
        this.setDefaultState(this.blockState.getBaseState().withProperty(FACING, EnumFacing.NORTH));
        this.setHardness(tier.hardness);
        // Furnace-class blast resistance = the vanilla furnace value (10.0);
        // R196 pins no resistance row — C 级登记观察.
        this.setResistance(10.0F);
        this.setSoundType(SoundType.STONE);
        this.setRegistryName(ETIM.MOD_ID, "furnace_" + tier.name + (burning ? "_lit" : ""));
        this.setTranslationKey("etim.furnace_" + tier.name);
        if (burning) {
            this.setLightLevel(0.875F);
        }
    }

    public ETIMFurnaceTier getTier() {
        return this.tier;
    }

    public boolean isBurningBlock() {
        return this.burning;
    }

    // ------------------------------------------------------------- twin swap

    /**
     * R196 BlockFurnace.updateFurnaceBlockState :136-152 — keep-inventory
     * block swap, then re-validate and re-set the SAME tile entity.
     * Called from MixinBlockFurnace when the vanilla furnace loop asks
     * BlockFurnace.setState for an ETIM block.
     */
    public void setBurningTwin(boolean burning, World world, BlockPos pos, IBlockState oldState) {
        ETIMBlockFurnace twin = ETIMBlocks.twinOf(this.tier, burning);
        if (twin == null || twin == this) {
            return;
        }
        TileEntity te = world.getTileEntity(pos);
        etim$keepInventory = true;
        world.setBlockState(pos, twin.getDefaultState().withProperty(FACING, oldState.getValue(FACING)), 3);
        etim$keepInventory = false;
        if (te != null) {
            te.validate();
            world.setTileEntity(pos, te);
        }
    }

    // ------------------------------------------------------------- drops

    /**
     * Mining/pick drop = the IDLE furnace item (R196 createStackedBlock
     * :40-42 returns the idle block, canBeCarried :35-37).
     */
    @Override
    public Item getItemDropped(IBlockState state, Random rand, int fortune) {
        return Item.getItemFromBlock(ETIMBlocks.idleOf(this.tier));
    }

    @Override
    public int quantityDropped(Random random) {
        return 1;
    }

    /** Pick block = the idle furnace (R196 idPicked :220-222). */
    @Override
    public ItemStack getItem(World worldIn, BlockPos pos, IBlockState state) {
        return new ItemStack(ETIMBlocks.idleOf(this.tier));
    }

    /**
     * Explosions never use the default drop path (R196 :46-67 runs its own
     * base-material chain) — the base-material spawn happens in
     * {@link #onExplosionDestroy}.
     */
    @Override
    public boolean canDropFromExplosion(net.minecraft.world.Explosion explosion) {
        return false;
    }

    /** R196 :46-67: exploded → the base material; clay/hardenedClay → nothing. */
    @Override
    public void onExplosionDestroy(World world, BlockPos pos, net.minecraft.world.Explosion explosion) {
        if (!world.isRemote && this.tier.explodeDropItem != null) {
            Block.spawnAsEntity(world, pos, new ItemStack(this.tier.explodeDropItem));
        }
    }

    // ------------------------------------------------------------- TE + GUI

    @Override
    public TileEntity createNewTileEntity(World worldIn, int meta) {
        return new TileEntityFurnace();
    }

    @Override
    public boolean onBlockActivated(World worldIn, BlockPos pos, IBlockState state, EntityPlayer playerIn,
                                    EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ) {
        if (!worldIn.isRemote) {
            TileEntity te = worldIn.getTileEntity(pos);
            if (te instanceof TileEntityFurnace) {
                // FML GuiHandler path (批文项2): the pos rides the open packet so the
                // client binds the REAL client-side TE — the vanilla displayGUIChest
                // chain binds a dumb ContainerLocalMenu mirror client-side and the
                // per-tier cap would read vanilla there.
                playerIn.openGui(ETIM.instance(), ETIMGuiHandler.FURNACE, worldIn, pos.getX(), pos.getY(), pos.getZ());
                playerIn.addStat(StatList.FURNACE_INTERACTION);
            }
        }
        return true;
    }

    @Override
    public void onBlockPlacedBy(World worldIn, BlockPos pos, IBlockState state, EntityLivingBase placer, ItemStack stack) {
        worldIn.setBlockState(pos, state.withProperty(FACING, placer.getHorizontalFacing().getOpposite()), 2);
        if (stack.hasDisplayName()) {
            TileEntity te = worldIn.getTileEntity(pos);
            if (te instanceof TileEntityFurnace) {
                ((TileEntityFurnace) te).setCustomInventoryName(stack.getDisplayName());
            }
        }
    }

    @Override
    public IBlockState getStateForPlacement(World worldIn, BlockPos pos, EnumFacing facing, float hitX, float hitY,
                                            float hitZ, int meta, EntityLivingBase placer) {
        return this.getDefaultState().withProperty(FACING, placer.getHorizontalFacing().getOpposite());
    }

    @Override
    public void onBlockAdded(World worldIn, BlockPos pos, IBlockState state) {
        this.setDefaultFacing(worldIn, pos, state);
    }

    private void setDefaultFacing(World worldIn, BlockPos pos, IBlockState state) {
        if (!worldIn.isRemote) {
            IBlockState north = worldIn.getBlockState(pos.north());
            IBlockState south = worldIn.getBlockState(pos.south());
            IBlockState west = worldIn.getBlockState(pos.west());
            IBlockState east = worldIn.getBlockState(pos.east());
            EnumFacing enumfacing = state.getValue(FACING);
            if (enumfacing == EnumFacing.NORTH && north.isFullBlock() && !south.isFullBlock()) {
                enumfacing = EnumFacing.SOUTH;
            } else if (enumfacing == EnumFacing.SOUTH && south.isFullBlock() && !north.isFullBlock()) {
                enumfacing = EnumFacing.NORTH;
            } else if (enumfacing == EnumFacing.WEST && west.isFullBlock() && !east.isFullBlock()) {
                enumfacing = EnumFacing.EAST;
            } else if (enumfacing == EnumFacing.EAST && east.isFullBlock() && !west.isFullBlock()) {
                enumfacing = EnumFacing.WEST;
            }
            worldIn.setBlockState(pos, state.withProperty(FACING, enumfacing), 2);
        }
    }

    @Override
    public void breakBlock(World worldIn, BlockPos pos, IBlockState state) {
        if (!etim$keepInventory) {
            TileEntity te = worldIn.getTileEntity(pos);
            if (te instanceof TileEntityFurnace) {
                InventoryHelper.dropInventoryItems(worldIn, pos, (TileEntityFurnace) te);
                worldIn.updateComparatorOutputLevel(pos, this);
            }
        }
        super.breakBlock(worldIn, pos, state);
    }

    // ------------------------------------------------------------- comparator

    @Override
    public boolean hasComparatorInputOverride(IBlockState state) {
        return true;
    }

    @Override
    public int getComparatorInputOverride(IBlockState blockState, World worldIn, BlockPos pos) {
        return Container.calcRedstone(worldIn.getTileEntity(pos));
    }

    // ------------------------------------------------------------- burning fx

    @Override
    @SideOnly(Side.CLIENT)
    @SuppressWarnings("incomplete-switch")
    public void randomDisplayTick(IBlockState stateIn, World worldIn, BlockPos pos, Random rand) {
        if (this.burning) {
            EnumFacing enumfacing = stateIn.getValue(FACING);
            double d0 = pos.getX() + 0.5D;
            double d1 = pos.getY() + rand.nextDouble() * 6.0D / 16.0D;
            double d2 = pos.getZ() + 0.5D;
            double d3 = 0.52D;
            double d4 = rand.nextDouble() * 0.6D - 0.3D;
            if (rand.nextDouble() < 0.1D) {
                worldIn.playSound(d0, pos.getY(), d2, net.minecraft.init.SoundEvents.BLOCK_FURNACE_FIRE_CRACKLE,
                        SoundCategory.BLOCKS, 1.0F, 1.0F, false);
            }
            switch (enumfacing) {
                case WEST:
                    worldIn.spawnParticle(EnumParticleTypes.SMOKE_NORMAL, d0 - d3, d1, d2 + d4, 0.0D, 0.0D, 0.0D);
                    worldIn.spawnParticle(EnumParticleTypes.FLAME, d0 - d3, d1, d2 + d4, 0.0D, 0.0D, 0.0D);
                    break;
                case EAST:
                    worldIn.spawnParticle(EnumParticleTypes.SMOKE_NORMAL, d0 + d3, d1, d2 + d4, 0.0D, 0.0D, 0.0D);
                    worldIn.spawnParticle(EnumParticleTypes.FLAME, d0 + d3, d1, d2 + d4, 0.0D, 0.0D, 0.0D);
                    break;
                case NORTH:
                    worldIn.spawnParticle(EnumParticleTypes.SMOKE_NORMAL, d0 + d4, d1, d2 - d3, 0.0D, 0.0D, 0.0D);
                    worldIn.spawnParticle(EnumParticleTypes.FLAME, d0 + d4, d1, d2 - d3, 0.0D, 0.0D, 0.0D);
                    break;
                case SOUTH:
                    worldIn.spawnParticle(EnumParticleTypes.SMOKE_NORMAL, d0 + d4, d1, d2 + d3, 0.0D, 0.0D, 0.0D);
                    worldIn.spawnParticle(EnumParticleTypes.FLAME, d0 + d4, d1, d2 + d3, 0.0D, 0.0D, 0.0D);
            }
        }
    }

    // ------------------------------------------------------------- state map

    @Override
    public EnumBlockRenderType getRenderType(IBlockState state) {
        return EnumBlockRenderType.MODEL;
    }

    @Override
    public IBlockState getStateFromMeta(int meta) {
        EnumFacing enumfacing = EnumFacing.byIndex(meta);
        if (enumfacing.getAxis() == EnumFacing.Axis.Y) {
            enumfacing = EnumFacing.NORTH;
        }
        return this.getDefaultState().withProperty(FACING, enumfacing);
    }

    @Override
    public int getMetaFromState(IBlockState state) {
        return state.getValue(FACING).getIndex();
    }

    @Override
    public IBlockState withRotation(IBlockState state, Rotation rot) {
        return state.withProperty(FACING, rot.rotate(state.getValue(FACING)));
    }

    @Override
    public IBlockState withMirror(IBlockState state, Mirror mirrorIn) {
        return state.withProperty(FACING, mirrorIn.mirror(state.getValue(FACING)));
    }

    @Override
    protected BlockStateContainer createBlockState() {
        return new BlockStateContainer(this, new IProperty[] {FACING});
    }
}
