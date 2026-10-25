package io.github.etim.etim.world;

import net.minecraft.block.Block;
import net.minecraft.block.BlockBreakable;
import net.minecraft.block.material.Material;
import net.minecraft.block.properties.PropertyInteger;
import net.minecraft.block.state.BlockStateContainer;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.IBlockAccess;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraft.world.DimensionType;

import java.util.Map;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMBlocks;

/**
 * underworld 二阶段 T1 — the R196 portal block, full transcription.
 *
 * <p>R196 one-hand: {@code BlockPortal.java} (668 lines). Faces:</p>
 * <ul>
 *   <li>Destination metadata ({@code :8-11/:408-436}): 0 = to overworld,
 *       1 = to underworld, 2 = to nether; bit 8 = runegate (reserved —
 *       D-17 后置, not maintained here). bit↔id maps are static.</li>
 *   <li>{@code tryToCreatePortal} ({\code :97-152}): The End rejects; axis is
 *       seeded by adjacent obsidian; cavity 2×3 of air/fire (spark has no
 *       1.12 carrier — B2-1, fire-only); two-pass setBlock (meta 0 first,
 *       then the location metadata, both flag 2 — R196 :137-149).</li>
 *   <li>Frame maintenance ({\code :154-193}): bottom obsidian, column 3 high,
 *       breaks to air when any frame face fails.</li>
 *   <li>Location type ({\code :408-418}): runegate position reserved;
 *       nether → 1; touching the bottom block ({\code :365-385}, the
 *       {@code isBottomBlock} semantics realized here as mantl_or_core
 *       meta 0) → overworld ? 1 : 2; else 0.</li>
 *   <li>Collision ({\code :84-95}): thin 0.125F shell, layout read off the
 *       neighbour portal column (no axis in metadata).</li>
 *   <li>Entry ({\code :557-574}): non-riding/non-ridden entities entering the
 *       door register the destination dimension; the tick drive lives in the
 *       1.12 {@code Entity.onEntityUpdate} portal section (vanilla counts
 *       {@code portalCounter} to {@code getMaxInPortalTime()} = 80 — same
 *       both generations, zero code) with the target resolved through
 *       {@link #consumePortalTarget}.</li>
 * </ul>
 *
 * <p>1.12 vanilla for-door spawner face ({\code block/BlockPortal.java:
 * 69-88}, PigZombie) is NOT ported — R196 hard-short-circuits it
 * ({\code :40-43 flag=true} dead code, D-15): an ETIM door does not spawn.</p>
 */
public class ETIMBlockPortal extends BlockBreakable {

    public static final int DESTINATION_OVERWORLD = 0;
    public static final int DESTINATION_UNDERWORLD = 1;
    public static final int DESTINATION_NETHER = 2;
    /** D-17 后置 — bit preserved in metadata space, never SET in this batch. */
    public static final int IS_RUNEGATE = 8;

    /** D-17: runegate check stays a metadata-bit read only. */
    public static boolean isRunegate(int metadata) {
        return (metadata & IS_RUNEGATE) != 0;
    }

    public static final PropertyInteger DESTINATION = PropertyInteger
            .create("destination", DESTINATION_OVERWORLD, DESTINATION_NETHER);

    /** Entities standing in an ETIM door — the R196 per-entity
     * {@code portal_destination_dimension_id} (Entity.java:474) with no 1.12
     * carrier (A2-1). Consumed on use; not persisted (standing inside a door
     * across a restart re-arms from 0 and the door re-registers on the first
     * collision tick anyway). */
    private static final Map<Entity, Integer> PORTAL_TARGETS =
            java.util.Collections.synchronizedMap(new java.util.WeakHashMap<>());

    public ETIMBlockPortal() {
        super(Material.PORTAL, false);
        this.setRegistryName("portal");
        this.setDefaultState(this.blockState.getBaseState().withProperty(DESTINATION, DESTINATION_OVERWORLD));
        this.setHardness(-1.0F);
        this.setResistance(3600000.0F);
        this.setTickRandomly(true);
        this.setLightLevel(0.75F);
    }


    @Override
    protected BlockStateContainer createBlockState() {
        return new BlockStateContainer(this, DESTINATION);
    }

    @Override
    public IBlockState getStateFromMeta(int metadata) {
        return this.getDefaultState().withProperty(DESTINATION, getDestinationBit(metadata));
    }

    @Override
    public int getMetaFromState(IBlockState state) {
        return state.getValue(DESTINATION);
    }

    // ------------------- destination <-> bit maps (R196 :279-281/:387-436) -------------------

    /** R196 BlockPortal.java:279-281. */
    public static int getDestinationBit(int metadata) {
        return metadata & ~IS_RUNEGATE;
    }

    /** R196 BlockPortal.java:387-402. */
    public static int getDestinationBitForDimensionId(int destination_dimension_id) {
        if (destination_dimension_id == 0) {
            return 0;
        }
        if (destination_dimension_id == ETIMDimensions.UNDERWORLD) {
            return 1;
        }
        if (destination_dimension_id == -1) {
            return 2;
        }
        ETIM.LOGGER.info("[DimLog] portal destination not handled " + destination_dimension_id + " [server]");
        return 0;
    }

    /** R196 BlockPortal.java:420-436. */
    public static int getDestinationDimensionIdForMetadata(int metadata) {
        int destination_bit = getDestinationBit(metadata);
        if (destination_bit == 0) {
            return 0;
        }
        if (destination_bit == 1) {
            return ETIMDimensions.UNDERWORLD;
        }
        if (destination_bit == 2) {
            return -1;
        }
        return 0;
    }

    // ------------------- portal-target registry (the A2-1 channel) -------------------

    /** R196 BlockPortal.java:557-574 → Entity.setInPortal(id). */
    public static void registerPortalTarget(Entity entity, int dimension_id) {
        PORTAL_TARGETS.put(entity, dimension_id);
    }

    /** MixinEntity redirect face: returns the ETIM destination while standing
     * in an ETIM door, the vanilla -1↔0 target otherwise. */
    public static int consumePortalTarget(Entity entity, int vanillaTarget) {
        Integer etim = PORTAL_TARGETS.remove(entity);
        return etim != null ? etim : vanillaTarget;
    }

    /**
     * The travel carrier: underworld / overworld arrivals hand landings to
     * {@link ETIMPortalTeleporter} (the R196 Teleporter transcription); every
     * other dimension keeps the vanilla Teleporter (nether unchanged).
     */
    public static net.minecraftforge.common.util.ITeleporter teleporterFor(Entity entity, int dimensionIn) {
        if (dimensionIn == 0 || dimensionIn == ETIMDimensions.UNDERWORLD) {
            return ETIMPortalTeleporter.forWorld(entity.getServer().getWorld(dimensionIn));
        }
        return new net.minecraft.world.Teleporter(entity.getServer().getWorld(dimensionIn));
    }

    // ------------------- tryToCreatePortal (R196 :97-152) -------------------

    public boolean tryToCreatePortal(World world, BlockPos pos) {
        if (world.provider.getDimensionType() == DimensionType.THE_END) {
            return false;
        }
        int x = pos.getX(), y = pos.getY(), z = pos.getZ();
        byte var5 = 0;
        byte var6 = 0;
        if (world.getBlockState(new BlockPos(x - 1, y, z)).getBlock() == Blocks.OBSIDIAN
                || world.getBlockState(new BlockPos(x + 1, y, z)).getBlock() == Blocks.OBSIDIAN) {
            var5 = 1;
        }
        if (world.getBlockState(new BlockPos(x, y, z - 1)).getBlock() == Blocks.OBSIDIAN
                || world.getBlockState(new BlockPos(x, y, z + 1)).getBlock() == Blocks.OBSIDIAN) {
            var6 = 1;
        }
        if (var5 == var6) {
            return false;
        }
        if (world.getBlockState(new BlockPos(x - var5, y, z - var6)).getMaterial() == Material.AIR) {
            x -= var5;
            z -= var6;
        }
        for (int var7 = -1; var7 <= 2; var7++) {
            for (int var8 = -1; var8 <= 3; var8++) {
                if (var7 != -1 && var7 != 2 || var8 != -1 && var8 != 3) {
                    Block var10 = world.getBlockState(new BlockPos(x + var5 * var7, y + var8, z + var6 * var7)).getBlock();
                    boolean frame = var7 == -1 || var7 == 2 || var8 == -1 || var8 == 3;
                    if (frame) {
                        if (var10 != Blocks.OBSIDIAN) {
                            return false;
                        }
                    } else if (var10 != Blocks.AIR && var10 != Blocks.FIRE) {
                        // R196 also accepts Block.spark (:130) — no 1.12 carrier (B2-1)
                        return false;
                    }
                }
            }
        }
        portalFill(world, x, y, z, var5, var6, 0);
        int metadata = this.getPortalTypeBasedOnLocation(world, new BlockPos(x, y, z), true);
        portalFill(world, x, y, z, var5, var6, metadata);
        ETIMDimensions.dimLog("portal-create x=" + x + " y=" + y + " z=" + z + " meta=" + metadata);
        return true;
    }

    /** R196 :137-149 two-pass fill — both passes flag 2. */
    private void portalFill(World world, int x, int y, int z, byte var5, byte var6, int metadata) {
        for (int var11 = 0; var11 < 2; var11++) {
            for (int var8 = 0; var8 < 3; var8++) {
                world.setBlockState(new BlockPos(x + var5 * var11, y + var8, z + var6 * var11),
                        this.getStateFromMeta(metadata), 2);
            }
        }
    }

    // ------------------- frame helpers (R196 :215-277) -------------------

    private int getFrameMinX(World world, int x, int y, int z) {
        boolean x_aligned = world.getBlockState(new BlockPos(x + 1, y, z)).getBlock() == this;
        int min_x;
        for (min_x = x; world.getBlockState(new BlockPos(min_x - 1, y, z)).getBlock() == this; x_aligned = true) {
            min_x--;
        }
        return x_aligned ? min_x - 1 : min_x;
    }

    private int getFrameMaxX(World world, int x, int y, int z) {
        boolean x_aligned = world.getBlockState(new BlockPos(x - 1, y, z)).getBlock() == this;
        int max_x;
        for (max_x = x; world.getBlockState(new BlockPos(max_x + 1, y, z)).getBlock() == this; x_aligned = true) {
            max_x++;
        }
        return x_aligned ? max_x + 1 : max_x;
    }

    private int getFrameMinY(World world, int x, int y, int z) {
        int min_y = y;
        while (world.getBlockState(new BlockPos(x, min_y - 1, z)).getBlock() == this) {
            min_y--;
        }
        return min_y - 1;
    }

    private int getFrameMaxY(World world, int x, int y, int z) {
        int max_y = y;
        while (world.getBlockState(new BlockPos(x, max_y + 1, z)).getBlock() == this) {
            max_y++;
        }
        return max_y + 1;
    }

    private int getFrameMinZ(World world, int x, int y, int z) {
        boolean z_aligned = world.getBlockState(new BlockPos(x, y, z + 1)).getBlock() == this;
        int min_z;
        for (min_z = z; world.getBlockState(new BlockPos(x, y, min_z - 1)).getBlock() == this; z_aligned = true) {
            min_z--;
        }
        return z_aligned ? min_z - 1 : min_z;
    }

    private int getFrameMaxZ(World world, int x, int y, int z) {
        boolean z_aligned = world.getBlockState(new BlockPos(x, y, z - 1)).getBlock() == this;
        int max_z;
        for (max_z = z; world.getBlockState(new BlockPos(x, y, max_z + 1)).getBlock() == this; z_aligned = true) {
            max_z++;
        }
        return z_aligned ? max_z + 1 : max_z;
    }

    // ------------------- isTouchingBottomBedrock (R196 :365-385) -------------------

    /**
     * The {@code isBottomBlock(x,y,z)} semantics realized directly (NA-10):
     * bottom cell = mantl_or_core meta 0 (首段 M1-03 face). The
     * {@code frame_min_y > 8} gate is verbatim R196 :367-369.
     */
    public boolean isTouchingBottomBedrock(World world, int x, int y, int z) {
        int frame_min_y = this.getFrameMinY(world, x, y, z);
        if (frame_min_y > 8) {
            return false;
        }
        int frame_min_x = this.getFrameMinX(world, x, y, z);
        int frame_max_x = this.getFrameMaxX(world, x, y, z);
        int frame_min_z = this.getFrameMinZ(world, x, y, z);
        int frame_max_z = this.getFrameMaxZ(world, x, y, z);
        for (int frame_x = frame_min_x; frame_x <= frame_max_x; frame_x++) {
            for (int frame_z = frame_min_z; frame_z <= frame_max_z; frame_z++) {
                IBlockState below = world.getBlockState(new BlockPos(frame_x, frame_min_y - 1, frame_z));
                if (below.getBlock() == ETIMBlocks.MANTLE_OR_CORE
                        && below.getBlock().getMetaFromState(below) == 0) {
                    return true;
                }
            }
        }
        return false;
    }

    // ------------------- location type (R196 :408-418, D-17 bit reserved) -------------------

    public int getPortalTypeBasedOnLocation(World world, BlockPos pos, boolean test_for_runegate) {
        // test_for_runegate accepted for R196-signature fidelity (D-17: isRunegate
        // stays a metadata read — never set in this batch, so the branch is inert).
        if (world.provider.getDimensionType() == DimensionType.NETHER) {
            return 1;
        } else if (this.isTouchingBottomBedrock(world, pos.getX(), pos.getY(), pos.getZ())) {
            return world.provider.getDimensionType() == DimensionType.OVERWORLD ? 1 : 2;
        } else {
            return 0;
        }
    }

    // ------------------- updateType (R196 :540-546) + tick -------------------

    private boolean updateType(World world, BlockPos pos) {
        int metadata = world.getBlockState(pos).getValue(DESTINATION);
        int new_metadata = this.getPortalTypeBasedOnLocation(world, pos, true);
        return new_metadata != metadata && isRunegate(new_metadata) != isRunegate(metadata)
                ? world.setBlockState(pos, this.getDefaultState().withProperty(DESTINATION, new_metadata), 3)
                : false;
    }

    @Override
    public void updateTick(World world, BlockPos pos, IBlockState state, java.util.Random random) {
        this.updateType(world, pos);
    }

    // ------------------- frame maintenance (R196 :154-193) -------------------

    /** WP5 判行（B-1 补行）：破框后本门方块散却 —— setBlockToAir + [DimLog]。 */
    private void collapsePortal(World world, BlockPos pos) {
        world.setBlockToAir(pos);
        ETIM.LOGGER.info("[DimLog] portal-break x=" + pos.getX() + " y=" + pos.getY() + " z=" + pos.getZ()
                + " dim=" + world.provider.getDimension() + " [server]");
    }

    @Override
    public void neighborChanged(IBlockState state, World world, BlockPos pos, Block neighborBlock, BlockPos fromPos) {
        int x = pos.getX(), y = pos.getY(), z = pos.getZ();
        byte var6 = 0;
        byte var7 = 1;
        if (world.getBlockState(new BlockPos(x - 1, y, z)).getBlock() == this
                || world.getBlockState(new BlockPos(x + 1, y, z)).getBlock() == this) {
            var6 = 1;
            var7 = 0;
        }
        int var8 = y;
        while (world.getBlockState(new BlockPos(x, var8 - 1, z)).getBlock() == this) {
            var8--;
        }
        if (world.getBlockState(new BlockPos(x, var8 - 1, z)).getBlock() != Blocks.OBSIDIAN) {
            this.collapsePortal(world, pos);
            return;
        }
        int var9 = 1;
        while (var9 < 4 && world.getBlockState(new BlockPos(x, var8 + var9, z)).getBlock() == this) {
            var9++;
        }
        if (var9 == 3 && world.getBlockState(new BlockPos(x, var8 + var9, z)).getBlock() == Blocks.OBSIDIAN) {
            boolean xAligned = world.getBlockState(new BlockPos(x - 1, y, z)).getBlock() == this
                    || world.getBlockState(new BlockPos(x + 1, y, z)).getBlock() == this;
            boolean zAligned = world.getBlockState(new BlockPos(x, y, z - 1)).getBlock() == this
                    || world.getBlockState(new BlockPos(x, y, z + 1)).getBlock() == this;
            if (xAligned && zAligned) {
                this.collapsePortal(world, pos);
            } else {
                boolean left = world.getBlockState(new BlockPos(x + var6, y, z + var7)).getBlock() == Blocks.OBSIDIAN
                        && world.getBlockState(new BlockPos(x - var6, y, z - var7)).getBlock() == this
                        || world.getBlockState(new BlockPos(x - var6, y, z - var7)).getBlock() == Blocks.OBSIDIAN
                                && world.getBlockState(new BlockPos(x + var6, y, z + var7)).getBlock() == this;
                if (left) {
                    this.updateType(world, pos);
                } else {
                    this.collapsePortal(world, pos);
                }
            }
        } else {
            this.collapsePortal(world, pos);
        }
    }

    // ------------------- entry face (R196 :557-574; D-15 dead spawner) -------------------

    @Override
    public void onEntityCollision(World world, BlockPos pos, IBlockState state, Entity entityIn) {
        if (entityIn.isRiding() || entityIn.isBeingRidden()) {
            return;
        }
        int metadata = state.getValue(DESTINATION);
        int destination = getDestinationDimensionIdForMetadata(metadata);
        entityIn.setPortal(pos); // vanilla inPortal arm (entity/Entity.java:2452-2474 face)
        registerPortalTarget(entityIn, destination);
        ETIMDimensions.dimLog("portal-enter entity=" + entityIn.getName() + " dest=" + destination);
    }

    // ------------------- collision/shape (R196 :84-95 face) -------------------

    @Override
    public AxisAlignedBB getCollisionBoundingBox(IBlockState state, IBlockAccess world, BlockPos pos) {
        // Axis layout from neighbours (metadata carries destination, not axis).
        boolean xAligned = world.getBlockState(pos.west()).getBlock() == this
                || world.getBlockState(pos.east()).getBlock() == this;
        boolean zAligned = world.getBlockState(pos.north()).getBlock() == this
                || world.getBlockState(pos.south()).getBlock() == this;
        double d = 0.125D; // R196 :84-95 thin shell
        double minX = pos.getX() + (xAligned ? 0.0D : d);
        double maxX = pos.getX() + 1.0D - (xAligned ? 0.0D : d);
        double minZ = pos.getZ() + (zAligned ? 0.0D : d);
        double maxZ = pos.getZ() + 1.0D - (zAligned ? 0.0D : d);
        return new AxisAlignedBB(minX, pos.getY(), minZ, maxX, pos.getY() + 1.0D, maxZ);
    }

    @Override
    public AxisAlignedBB getBoundingBox(IBlockState state, IBlockAccess world, BlockPos pos) {
        return this.getCollisionBoundingBox(state, world, pos);
    }

    @Override
    public boolean isFullCube(IBlockState state) {
        return false;
    }

    @Override
    public boolean isOpaqueCube(IBlockState state) {
        return false;
    }

    @Override
    public int quantityDropped(java.util.Random random) {
        return 0; // R196 :636-639 dropBlockAsEntityItem 0 face
    }
}
