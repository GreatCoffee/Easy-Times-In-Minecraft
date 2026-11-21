package io.github.etim.etim.mob;

import net.minecraft.block.Block;
import net.minecraft.block.BlockAnvil;
import net.minecraft.block.BlockBed;
import net.minecraft.block.BlockButtonStone;
import net.minecraft.block.BlockButtonWood;
import net.minecraft.block.BlockCactus;
import net.minecraft.block.BlockCauldron;
import net.minecraft.block.BlockChest;
import net.minecraft.block.BlockCocoa;
import net.minecraft.block.BlockDaylightDetector;
import net.minecraft.block.BlockDoor;
import net.minecraft.block.BlockEnchantmentTable;
import net.minecraft.block.BlockFence;
import net.minecraft.block.BlockFenceGate;
import net.minecraft.block.BlockHay;
import net.minecraft.block.BlockHopper;
import net.minecraft.block.BlockLadder;
import net.minecraft.block.BlockLeaves;
import net.minecraft.block.BlockLever;
import net.minecraft.block.BlockLilyPad;
import net.minecraft.block.BlockMelon;
import net.minecraft.block.BlockPane;
import net.minecraft.block.BlockPistonBase;
import net.minecraft.block.BlockPistonExtension;
import net.minecraft.block.BlockPressurePlate;
import net.minecraft.block.BlockPumpkin;
import net.minecraft.block.BlockRailBase;
import net.minecraft.block.BlockRedstoneComparator;
import net.minecraft.block.BlockRedstoneDiode;
import net.minecraft.block.BlockRedstoneWire;
import net.minecraft.block.BlockSkull;
import net.minecraft.block.BlockStandingSign;
import net.minecraft.block.BlockTrapDoor;
import net.minecraft.block.BlockTripWire;
import net.minecraft.block.BlockTripWireHook;
import net.minecraft.block.BlockWallSign;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * B-57 — the R196 {@code Block.getDissolvePeriod} / {@code Block.onContactWithAcid}
 * table (Block.java:3210-3308), re-expressed against the 1.12 block classes.
 *
 * <p>R196 returns a period in ticks: {@code 0} = instant, {@code 400} = slow
 * (twenty entity seconds for a size-1 cube), {@code -1} = never. The entity
 * side divides by 20 and adds {@code size} progress per twenty ticks
 * ({@code EntityGelatinousCube.java:208-225} / {@code :333-383}).</p>
 *
 * <p>Pepsin is the slime/jelly/blob branch: only cloth-like blocks, cake and
 * tripwire. Acid is the ooze/pudding branch: the R196 class lists plus the
 * "material is harmed by acid" fallback, which in R196 defaults to
 * {@code true} for every material that does not opt out — so stone, dirt,
 * ores and other solid rock stay at -1 through the "solid" terminal.</p>
 */
public final class ETIMBlockDissolve {

    /** R196 {@code DamageSource.pepsin}. */
    public static final int INSTANT = 0;
    /** R196 slow period in ticks (400 ticks = 20 s at period/20 scaling). */
    public static final int SLOW = 400;
    /** R196 "cannot be dissolved". */
    public static final int NEVER = -1;

    public enum Kind {
        ACID,
        PEPSIN
    }

    /** R196 {@code Block.getDissolvePeriod(World,x,y,z,damage_source)}. */
    public static int period(IBlockState state, Kind kind) {
        if (state == null || state.getBlock() == Blocks.AIR) {
            return NEVER;
        }
        return kind == Kind.PEPSIN ? pepsinPeriod(state) : acidPeriod(state);
    }

    private static int pepsinPeriod(IBlockState state) {
        Block block = state.getBlock();
        if (block instanceof BlockTripWire) {
            return SLOW;
        }
        // R196 Material.isHarmedByPepsin: cloth / carpet / cake (all 400).
        if (block == Blocks.WOOL || block == Blocks.CARPET || block == Blocks.CAKE) {
            return SLOW;
        }
        return NEVER;
    }

    private static int acidPeriod(IBlockState state) {
        Block block = state.getBlock();
        Material material = state.getMaterial();
        // Grass / mycelium do not dissolve; they turn into dirt (onContact).
        if (block == Blocks.GRASS || block == Blocks.MYCELIUM) {
            return NEVER;
        }
        // R196 :3224-3230 — doors, chests, pressure plates, panes.
        if (block instanceof BlockDoor) {
            return block == Blocks.IRON_DOOR ? NEVER : SLOW;
        }
        if (block instanceof BlockChest || block instanceof BlockPressurePlate || block instanceof BlockPane) {
            return SLOW;
        }
        // R196 :3232-3234 — anvils by metal type (iron is harmed in R196).
        if (block instanceof BlockAnvil) {
            return SLOW;
        }
        // R196 :3236-3256 — the explicit 400 list.
        if (block instanceof BlockRailBase
                || block instanceof BlockButtonWood
                || block instanceof BlockLever
                || block instanceof BlockStandingSign
                || block instanceof BlockWallSign
                || block instanceof BlockLadder
                || block instanceof BlockBed
                || block instanceof BlockPistonBase
                || block instanceof BlockPistonExtension
                || block instanceof BlockCactus
                || block instanceof BlockMelon
                || block instanceof BlockPumpkin
                || block instanceof BlockRedstoneDiode
                || block instanceof BlockTrapDoor
                || block instanceof BlockEnchantmentTable
                || block instanceof BlockSkull
                || block instanceof BlockRedstoneComparator
                || block instanceof BlockDaylightDetector
                || block instanceof BlockHopper
                || block instanceof BlockHay) {
            return SLOW;
        }
        // R196 :3258-3278 — harmed materials with extra exclusions.
        if (block instanceof BlockButtonStone || block instanceof BlockRedstoneWire) {
            return NEVER;
        }
        if (block instanceof BlockFence || block instanceof BlockFenceGate
                || block instanceof BlockCauldron || block instanceof BlockCocoa) {
            return SLOW;
        }
        if (block instanceof BlockLilyPad || block instanceof BlockLeaves) {
            return INSTANT;
        }
        if (block instanceof BlockTripWireHook) {
            return SLOW;
        }
        if (!isSolidStandardForm(material, state)) {
            return INSTANT;
        }
        // Solid rock/soil/metal default: indestructible under acid.
        return NEVER;
    }

    private static boolean isSolidStandardForm(Material material, IBlockState state) {
        return material.blocksMovement() && state.isFullCube();
    }

    /**
     * R196 {@code Block.onContactWithAcid(world,x,y,z,face,show_fx)} for the
     * acid family. Returns true when the block changed.
     */
    public static boolean onContactWithAcid(World world, BlockPos pos) {
        return onContactWithAcid(world, pos, null);
    }

    /**
     * B-58 face-aware form (R196 Block.java:3181-3200): grass / mycelium only
     * turn to dirt when the contact face is the top (or absent); a side / bottom
     * hit is refused. Every other block ignores the face.
     */
    public static boolean onContactWithAcid(World world, BlockPos pos, EnumFacing face) {
        if (world.isRemote) {
            return false;
        }
        IBlockState state = world.getBlockState(pos);
        Block block = state.getBlock();
        if (block == Blocks.GRASS || block == Blocks.MYCELIUM) {
            if (face != null && face != EnumFacing.UP) {
                return false;
            }
            world.setBlockState(pos, Blocks.DIRT.getDefaultState(), 2);
            steam(world, pos, true);
            return true;
        }
        int period = period(state, Kind.ACID);
        if (period == INSTANT) {
            world.setBlockToAir(pos);
            steam(world, pos, true);
            return true;
        }
        if (period > INSTANT) {
            steam(world, pos, false);
        }
        return false;
    }

    /**
     * R196 {@code Block.onContactWithPepsin} (Block.java:3161-3179) — the jelly
     * / blob branch. Only {@link #SLOW}/{@link #INSTANT} blocks react; instant
     * ones go to air with the weak steam FX, gradual ones only steam.
     */
    public static boolean onContactWithPepsin(World world, BlockPos pos) {
        return onContactWithPepsin(world, pos, null);
    }

    /** B-58 face-aware pepsin form; the face is unused by R196's pepsin body. */
    public static boolean onContactWithPepsin(World world, BlockPos pos, EnumFacing face) {
        if (world.isRemote) {
            return false;
        }
        IBlockState state = world.getBlockState(pos);
        int period = period(state, Kind.PEPSIN);
        if (period < 0) {
            return false;
        }
        if (period == INSTANT) {
            steam(world, pos, false);
            world.setBlockToAir(pos);
            return true;
        }
        steam(world, pos, false);
        return false;
    }

    /** R196 {@code EnumBlockFX.smoke_and_steam} / {@code steam} / particles-only. */
    public static void steam(World world, BlockPos pos, boolean strong) {
        if (world.isRemote) {
            return;
        }
        double x = pos.getX() + 0.5D;
        double y = pos.getY() + 0.5D;
        double z = pos.getZ() + 0.5D;
        world.spawnParticle(EnumParticleTypes.SMOKE_LARGE, x, y, z, 0.0D, 0.0D, 0.0D);
        if (strong) {
            world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL, x, y + 0.3D, z, 0.0D, 0.0D, 0.0D);
        }
    }

    /** Render-bounds intersection, R196 {@code Block.doRenderBoundsIntersectWith}. */
    public static boolean intersects(World world, BlockPos pos, AxisAlignedBB box) {
        IBlockState state = world.getBlockState(pos);
        if (state.getMaterial() == Material.AIR) {
            return false;
        }
        // R196 intersects the block's render bounds, so torches/plants (no collision box) count too.
        // getBoundingBox returns block-local (0..1) coordinates, so offset it before testing.
        AxisAlignedBB bounds = state.getBoundingBox(world, pos);
        return bounds != Block.NULL_AABB && bounds != null
                && bounds.offset(pos.getX(), pos.getY(), pos.getZ()).intersects(box);
    }

    private ETIMBlockDissolve() {
    }
}
