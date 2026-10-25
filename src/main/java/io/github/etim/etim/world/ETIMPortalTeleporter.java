package io.github.etim.etim.world;

import com.google.common.collect.Lists;

import net.minecraft.entity.Entity;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.ChunkPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.WorldServer;
import net.minecraftforge.common.util.ITeleporter;

import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.metal.ETIMBlocks;

/**
 * underworld 二阶段 T4 — the R196 {@code Teleporter.java} full transcription
 * (394 lines) onto the 1.12 {@link ITeleporter} face (A2-1 mount: the vanilla
 * Entity {@code changeDimension(int)} route hard-codes -1↔0 targets and uses
 * the vanilla block/id portal actually which does not know ETIM doors).
 *
 * <p>Value faces verbatim from R196:</p>
 * <ul>
 *   <li>{@code placeInPortal :19-48} — arriving in anything other than the
 *       End: metadata = destination bit OF THE DIMENSION TRAVELED FROM (the
 *       door you land at must be one that leads back); End arrival keeps the
 *       obsidian platform build.</li>
 *   <li>{@code placeInExistingPortal :50-195} — ±128 scan for ETIM portal
 *       blocks whose destination bit equals the arrival metadata, runegate
 *       faces excluded (inert, D-17), portal columns walked to the bottom,
 *       stacked-distance pick, exit-side layout the same, motion/yaw
 *       remapped through the R196 Direction tables (arrays transcribed).</li>
 *   <li>{@code makePortal :197-377} — two rounds of ±16 scan (full 4-tall
 *       shell first, fallback plain), local ceiling-bedrock/portable-material
 *       gates, y ceiling-of-height minus 10 clamp, 4×5 frame with 2×3 cavity
 *       all in the same arrival metadata, neighbor notify pass.</li>
 *   <li>{@code removeStalePortalLocations :379-393} — 100-tick sweep, 600-tick
 *       staleness.</li>
 * </ul>
 *
 * <p>Dimension ratio (D-18): none of the overworld↔underworld travel applies
 * any scale (the 1.12 movementFactor default 1.0 both sides, R196 identical;
 * the ×8/÷8 branches stay off exactly as R196 runs them only for nether).</p>
 */
public final class ETIMPortalTeleporter implements ITeleporter {

    // R196 Direction.java arrays — verbatim.
    private static final int[] OFFSET_X = {0, -1, 0, 1};
    private static final int[] OFFSET_Z = {1, 0, -1, 0};
    private static final int[] ROTATE_OPPOSITE = {2, 3, 0, 1};
    private static final int[] ROTATE_RIGHT = {1, 2, 3, 0};
    private static final int[] ROTATE_LEFT = {3, 0, 1, 2};

    private static final Map<Integer, ETIMPortalTeleporter> BY_DIM = new HashMap<>();

    private final WorldServer worldServerInstance;
    private final Random random;
    private final Map<Long, PortalPosition> destinationCoordinateCache = new HashMap<>();
    private final List<Long> destinationCoordinateKeys = Lists.newArrayList();

    private ETIMPortalTeleporter(WorldServer world) {
        this.worldServerInstance = world;
        this.random = new Random(world.getSeed());
    }

    /** one teleporter per dimension (R196 WorldServer default-teleporter face). */
    public static ETIMPortalTeleporter forWorld(WorldServer world) {
        return BY_DIM.computeIfAbsent(world.provider.getDimension(), d -> new ETIMPortalTeleporter(world));
    }

    /** unused-mount probe for the tick sweep. */
    public static void sweepAll(long worldTime) {
        for (ETIMPortalTeleporter tp : BY_DIM.values()) {
            tp.removeStalePortalLocations(worldTime);
        }
    }

    /** A-2 source-dim carrier: pushed in MixinEntity.etim$portalTarget at the
     * last point where entity.dimension is still the ORIGIN (Forge flips it at
     * Entity.java:2963 before placeEntity :3002), consumed by placeEntity on
     * the same call chain. */
    private static final ThreadLocal<Integer> SOURCE_DIMENSION = new ThreadLocal<>();

    public static void pushSourceDimension(int dimension) {
        SOURCE_DIMENSION.set(dimension);
    }

    /** Consume the A-2 capture; the fallback (= current entity.dimension, the
     * TARGET) is only reachable if placeEntity is ever mounted outside the
     * redirect chain — not wired today. */
    private static int consumeSourceDimension(Entity entity) {
        Integer captured = SOURCE_DIMENSION.get();
        SOURCE_DIMENSION.remove();
        return captured != null ? captured : entity.dimension;
    }

    @Override
    public void placeEntity(net.minecraft.world.World world, Entity entity, float yaw) {
        // R196 Teleporter.java:19 placeInPortal — dimension_id_from = the
        // dimension the entity is leaving (captured A-2: Forge already flipped
        // entity.dimension to the TARGET by the time this runs).
        int dimension_id_from = consumeSourceDimension(entity);
        placeInPortal(entity, dimension_id_from, yaw, (WorldServer) world);
    }

    /** R196 Teleporter.java:19-48. */
    public void placeInPortal(Entity par1Entity, int dimension_id_from, float par8, WorldServer arriving) {
        if (arriving.provider.getDimension() != 1) {
            int metadata = ETIMBlockPortal.getDestinationBitForDimensionId(dimension_id_from);
            if (!this.placeInExistingPortal(par1Entity, metadata, par8, dimension_id_from)) {
                this.makePortal(par1Entity, metadata, par8);
                this.placeInExistingPortal(par1Entity, metadata, par8, dimension_id_from);
            }
        } else {
            // the End platform build (R196 :26-47); kept for fidelity — this
            // teleporter is mounted for dim 0 / -2 only.
            int var9 = MathHelper.floor(par1Entity.posX);
            int var10 = MathHelper.floor(par1Entity.posY) - 1;
            int var11 = MathHelper.floor(par1Entity.posZ);
            byte var12 = 1;
            byte var13 = 0;
            for (int var14 = -2; var14 <= 2; var14++) {
                for (int var15 = -2; var15 <= 2; var15++) {
                    for (int var16 = -1; var16 < 3; var16++) {
                        int var17 = var9 + var15 * var12 + var14 * var13;
                        int var18 = var10 + var16;
                        int var19 = var11 + var15 * var13 - var14 * var12;
                        boolean var20 = var16 < 0;
                        this.worldServerInstance.setBlockState(new BlockPos(var17, var18, var19),
                                (var20 ? Blocks.OBSIDIAN : net.minecraft.init.Blocks.AIR).getDefaultState(), 2);
                    }
                }
            }
            par1Entity.setLocationAndAngles(var9, var10, var11, par1Entity.rotationYaw, 0.0F);
            par1Entity.motionX = par1Entity.motionY = par1Entity.motionZ = 0.0D;
        }
    }

    /** R196 Teleporter.java:50-195. */
    public boolean placeInExistingPortal(Entity par1Entity, int metadata, float par8, int fromDimension) {
        short var9 = 128;
        double var10 = -1.0D;
        int var12 = 0;
        int var13 = 0;
        int var14 = 0;
        int var15 = MathHelper.floor(par1Entity.posX);
        int var16 = MathHelper.floor(par1Entity.posZ);
        long var17 = ChunkPos.asLong(var15, var16);
        boolean var19 = true;
        PortalPosition cached = this.destinationCoordinateCache.get(var17);
        if (cached != null) {
            var10 = 0.0D;
            var12 = cached.posX;
            var13 = cached.posY;
            var14 = cached.posZ;
            cached.lastUpdateTime = this.worldServerInstance.getTotalWorldTime();
            var19 = false;
        } else {
            for (int var48 = var15 - var9; var48 <= var15 + var9; var48++) {
                double var21 = var48 + 0.5D - par1Entity.posX;
                for (int var23 = var16 - var9; var23 <= var16 + var9; var23++) {
                    double var24 = var23 + 0.5D - par1Entity.posZ;
                    for (int var26 = this.worldServerInstance.getActualHeight() - 1; var26 >= 0; var26--) {
                        BlockPos pos = new BlockPos(var48, var26, var23);
                        if (this.worldServerInstance.getBlockState(pos).getBlock() == ETIMBlocks.PORTAL
                                // runegate face never set (D-17) — metadata match covers bit8
                                && ETIMBlockPortal.getDestinationBit(
                                        this.worldServerInstance.getBlockState(pos).getBlock().getMetaFromState(
                                                this.worldServerInstance.getBlockState(pos))) == metadata) {
                            while (this.worldServerInstance.getBlockState(new BlockPos(var48, var26 - 1, var23)).getBlock() == ETIMBlocks.PORTAL) {
                                var26--;
                            }
                            double var27 = var26 + 0.5D - par1Entity.posY;
                            double var29 = var21 * var21 + var27 * var27 + var24 * var24;
                            if (var10 < 0.0D || var29 < var10) {
                                var10 = var29;
                                var12 = var48;
                                var13 = var26;
                                var14 = var23;
                            }
                        }
                    }
                }
            }
        }
        if (var10 >= 0.0D) {
            if (var19) {
                PortalPosition p = new PortalPosition(var12, var13, var14, this.worldServerInstance.getTotalWorldTime());
                this.destinationCoordinateCache.put(var17, p);
                this.destinationCoordinateKeys.add(var17);
            }
            double var49 = var12 + 0.5D;
            double var25 = var13 + 0.5D;
            double var27 = var14 + 0.5D;
            int var50 = -1;
            if (this.worldServerInstance.getBlockState(new BlockPos(var12 - 1, var13, var14)).getBlock() == ETIMBlocks.PORTAL) {
                var50 = 2;
            }
            if (this.worldServerInstance.getBlockState(new BlockPos(var12 + 1, var13, var14)).getBlock() == ETIMBlocks.PORTAL) {
                var50 = 0;
            }
            if (this.worldServerInstance.getBlockState(new BlockPos(var12, var13, var14 - 1)).getBlock() == ETIMBlocks.PORTAL) {
                var50 = 3;
            }
            if (this.worldServerInstance.getBlockState(new BlockPos(var12, var13, var14 + 1)).getBlock() == ETIMBlocks.PORTAL) {
                var50 = 1;
            }
            // 1.12-getTeleportDirection face (entity/Entity.java:3078): R196 keeps an
            // int-indexed Direction — EnumFacing.getHorizontalIndex is the S-W-N-E 0..3 same order.
            int var30 = par1Entity.getTeleportDirection().getHorizontalIndex();
            if (var50 > -1) {
                int var31 = ROTATE_LEFT[var50];
                int var32 = OFFSET_X[var50];
                int var33 = OFFSET_Z[var50];
                int var34 = OFFSET_X[var31];
                int var35 = OFFSET_Z[var31];
                boolean var36 = !this.worldServerInstance.isAirBlock(new BlockPos(var12 + var32 + var34, var13, var14 + var33 + var35))
                        || !this.worldServerInstance.isAirBlock(new BlockPos(var12 + var32 + var34, var13 + 1, var14 + var33 + var35));
                boolean var37 = !this.worldServerInstance.isAirBlock(new BlockPos(var12 + var32, var13, var14 + var33))
                        || !this.worldServerInstance.isAirBlock(new BlockPos(var12 + var32, var13 + 1, var14 + var33));
                if (var36 && var37) {
                    var50 = ROTATE_OPPOSITE[var50];
                    var31 = ROTATE_OPPOSITE[var31];
                    var32 = OFFSET_X[var50];
                    var33 = OFFSET_Z[var50];
                    var34 = OFFSET_X[var31];
                    var35 = OFFSET_Z[var31];
                    int var48 = var12 - var34;
                    var49 -= var34;
                    int var22 = var14 - var35;
                    var27 -= var35;
                    var36 = !this.worldServerInstance.isAirBlock(new BlockPos(var48 + var32 + var34, var13, var22 + var33 + var35))
                            || !this.worldServerInstance.isAirBlock(new BlockPos(var48 + var32 + var34, var13 + 1, var22 + var33 + var35));
                    var37 = !this.worldServerInstance.isAirBlock(new BlockPos(var48 + var32, var13, var22 + var33))
                            || !this.worldServerInstance.isAirBlock(new BlockPos(var48 + var32, var13 + 1, var22 + var33));
                }
                float var38 = 0.5F;
                float var39 = 0.5F;
                if (!var36 && var37) {
                    var38 = 1.0F;
                } else if (var36 && !var37) {
                    var38 = 0.0F;
                } else if (var36 && var37) {
                    var39 = 0.0F;
                }
                var49 += var34 * var38 + var39 * var32;
                var27 += var35 * var38 + var39 * var33;
                float var40 = 0.0F;
                float var41 = 0.0F;
                float var42 = 0.0F;
                float var43 = 0.0F;
                if (var50 == var30) {
                    var40 = 1.0F;
                    var41 = 1.0F;
                } else if (var50 == ROTATE_OPPOSITE[var30]) {
                    var40 = -1.0F;
                    var41 = -1.0F;
                } else if (var50 == ROTATE_RIGHT[var30]) {
                    var42 = 1.0F;
                    var43 = -1.0F;
                } else {
                    var42 = -1.0F;
                    var43 = 1.0F;
                }
                double var44 = par1Entity.motionX;
                double var46 = par1Entity.motionZ;
                par1Entity.motionX = var44 * var40 + var46 * var43;
                par1Entity.motionZ = var44 * var42 + var46 * var41;
                par1Entity.rotationYaw = par8 - var30 * 90 + var50 * 90; // R196 :185 (par8 = pre-travel yaw)
            } else {
                par1Entity.motionX = par1Entity.motionY = par1Entity.motionZ = 0.0D;
            }
            par1Entity.setLocationAndAngles(var49, var25, var27, par1Entity.rotationYaw, par1Entity.rotationPitch);
            // WP3/WP4 判行（B-2/B-4 补行）：到维落地 —— 服务端判维单源，mineflayer
            // game.dimension=undefined 的假阴性面由本行兜底。from_dim = 来源维
            // （A-2 捕获面，B-6 补 token）。
            ETIM.LOGGER.info("[DimLog] portal-place dim=" + this.worldServerInstance.provider.getDimension()
                    + " from_dim=" + fromDimension + " from_metadata=" + metadata
                    + " x=" + MathHelper.floor(par1Entity.posX)
                    + " y=" + MathHelper.floor(par1Entity.posY) + " z=" + MathHelper.floor(par1Entity.posZ)
                    + " [server]");
            return true;
        } else {
            return false;
        }
    }

    /** R196 Teleporter.java:197-377. */
    public boolean makePortal(Entity par1Entity, int metadata, float par8) {
        int dimension_id_from = ETIMBlockPortal.getDestinationDimensionIdForMetadata(metadata);
        int direction_of_travel = -1;
        if (dimension_id_from == -1) {
            direction_of_travel = 1;
        } else if (dimension_id_from == ETIMDimensions.UNDERWORLD && par1Entity.dimension == 0) {
            direction_of_travel = 1;
        }
        ETIM.LOGGER.info("[DimLog] portal-build direction_of_travel=" + direction_of_travel + " [server]");
        par1Entity.posY = direction_of_travel == -1 ? this.worldServerInstance.getActualHeight() - 1 : 1.0D;
        byte var2 = 16;
        double var3 = -1.0D;
        int var5 = MathHelper.floor(par1Entity.posX);
        int var6 = MathHelper.floor(par1Entity.posY);
        int var7 = MathHelper.floor(par1Entity.posZ);
        int var8 = var5;
        int var9 = var6;
        int var10 = var7;
        int var11 = 0;
        int var12 = this.random.nextInt(4);

        // round 1 — full 4-tall shell scan (R196 :219-268)
        for (int var13 = var5 - var2; var13 <= var5 + var2; var13++) {
            double var14 = var13 + 0.5D - par1Entity.posX;
            for (int var16 = var7 - var2; var16 <= var7 + var2; var16++) {
                double var17 = var16 + 0.5D - par1Entity.posZ;
                label323:
                for (int var19 = this.worldServerInstance.getActualHeight() - 1; var19 >= 0; var19--) {
                    if (this.worldServerInstance.isAirBlock(new BlockPos(var13, var19, var16))) {
                        int scan = var19;
                        while (scan > 0 && this.worldServerInstance.isAirBlock(new BlockPos(var13, scan - 1, var16))) {
                            scan--;
                        }
                        var19 = scan;
                        for (int var20 = var12; var20 < var12 + 4; var20++) {
                            int var21 = var20 % 2;
                            int var22 = 1 - var21;
                            if (var20 % 4 >= 2) {
                                var21 = -var21;
                                var22 = -var22;
                            }
                            for (int var23 = 0; var23 < 3; var23++) {
                                for (int var24 = 0; var24 < 4; var24++) {
                                    for (int var25 = -1; var25 < 4; var25++) {
                                        int var26 = var13 + (var24 - 1) * var21 + var23 * var22;
                                        int var27 = var19 + var25;
                                        int var28 = var16 + (var24 - 1) * var22 - var23 * var21;
                                        if (var25 < 0 && this.isCeilingBedrock(var26, var27, var28)
                                                || var25 < 0 && !this.worldServerInstance.getBlockState(new BlockPos(var26, var27, var28)).getMaterial().isSolid()
                                                || var25 >= 0 && !this.worldServerInstance.isAirBlock(new BlockPos(var26, var27, var28))) {
                                            continue label323;
                                        }
                                    }
                                }
                            }
                            double var32 = var19 + 0.5D - par1Entity.posY;
                            double var31 = var14 * var14 + var32 * var32 + var17 * var17;
                            if (var3 < 0.0D || var31 < var3) {
                                var3 = var31;
                                var8 = var13;
                                var9 = var19;
                                var10 = var16;
                                var11 = var20 % 4;
                            }
                        }
                    }
                }
            }
        }

        // round 2 — fallback plain scan (R196 :270-315)
        if (var3 < 0.0D) {
            for (int var40 = var5 - var2; var40 <= var5 + var2; var40++) {
                double var14 = var40 + 0.5D - par1Entity.posX;
                for (int var16 = var7 - var2; var16 <= var7 + var2; var16++) {
                    double var17 = var16 + 0.5D - par1Entity.posZ;
                    label257:
                    for (int var19 = this.worldServerInstance.getActualHeight() - 1; var19 >= 0; var19--) {
                        if (this.worldServerInstance.isAirBlock(new BlockPos(var40, var19, var16))) {
                            int scan = var19;
                            while (scan > 0 && this.worldServerInstance.isAirBlock(new BlockPos(var40, scan - 1, var16))) {
                                scan--;
                            }
                            var19 = scan;
                            for (int var20 = var12; var20 < var12 + 2; var20++) {
                                int var21 = var20 % 2;
                                int var22 = 1 - var21;
                                for (int var23 = 0; var23 < 4; var23++) {
                                    for (int var24 = -1; var24 < 4; var24++) {
                                        int var25 = var40 + (var23 - 1) * var21;
                                        int var26 = var19 + var24;
                                        int var27 = var16 + (var23 - 1) * var22;
                                        if (var24 < 0 && this.isCeilingBedrock(var25, var26, var27)
                                                || var24 < 0 && !this.worldServerInstance.getBlockState(new BlockPos(var25, var26, var27)).getMaterial().isSolid()
                                                || var24 >= 0 && !this.worldServerInstance.isAirBlock(new BlockPos(var25, var26, var27))) {
                                            continue label257;
                                        }
                                    }
                                }
                                double var32 = var19 + 0.5D - par1Entity.posY;
                                double var31 = var14 * var14 + var32 * var32 + var17 * var17;
                                if (var3 < 0.0D || var31 < var3) {
                                    var3 = var31;
                                    var8 = var40;
                                    var9 = var19;
                                    var10 = var16;
                                    var11 = var20 % 2;
                                }
                            }
                        }
                    }
                }
            }
        }

        int var29 = var8;
        int var15 = var9;
        int var16 = var10;
        int var30 = var11 % 2;
        int var18 = 1 - var30;
        if (var11 % 4 >= 2) {
            var30 = -var30;
            var18 = -var18;
        }

        // fallback floor build (R196 :327-349)
        if (var3 < 0.0D) {
            if (var15 < 70) {
                var15 = 70;
            }
            if (var15 > this.worldServerInstance.getActualHeight() - 10) {
                var15 = this.worldServerInstance.getActualHeight() - 10;
            }
            var9 = var15;
            for (int var19 = -1; var19 <= 1; var19++) {
                for (int var20 = 1; var20 < 3; var20++) {
                    for (int var21 = -1; var21 < 3; var21++) {
                        int var22 = var29 + (var20 - 1) * var30 + var19 * var18;
                        int var23 = var15 + var21;
                        int var24 = var16 + (var20 - 1) * var18 - var19 * var30;
                        boolean var33 = var21 < 0;
                        this.worldServerInstance.setBlockState(new BlockPos(var22, var23, var24),
                                (var33 ? Blocks.OBSIDIAN : Blocks.AIR).getDefaultState(), 2);
                    }
                }
            }
        }

        // frame build — 4×5 frame, 2×3 cavity, all the same metadata (R196 :351-374)
        for (int var19 = 0; var19 < 4; var19++) {
            for (int var20 = 0; var20 < 4; var20++) {
                for (int var21 = -1; var21 < 4; var21++) {
                    int var22 = var29 + (var20 - 1) * var30;
                    int var23 = var15 + var21;
                    int var24 = var16 + (var20 - 1) * var18;
                    boolean var33 = var20 == 0 || var20 == 3 || var21 == -1 || var21 == 3;
                    if (var33) {
                        this.worldServerInstance.setBlockState(new BlockPos(var22, var23, var24),
                                Blocks.OBSIDIAN.getDefaultState(), 2);
                    } else {
                        this.worldServerInstance.setBlockState(new BlockPos(var22, var23, var24),
                                ETIMBlocks.PORTAL.getDefaultState().withProperty(ETIMBlockPortal.DESTINATION, metadata), 2);
                    }
                }
            }
            for (int var55 = 0; var55 < 4; var55++) {
                for (int var21 = -1; var21 < 4; var21++) {
                    int var22 = var29 + (var55 - 1) * var30;
                    int var23 = var15 + var21;
                    int var24 = var16 + (var55 - 1) * var18;
                    this.worldServerInstance.notifyNeighborsRespectDebug(new BlockPos(var22, var23, var24),
                            this.worldServerInstance.getBlockState(new BlockPos(var22, var23, var24)).getBlock(), false);
                }
            }
        }
        return true;
    }

    /** R196 World.java:6867-6869. */
    private boolean isCeilingBedrock(int x, int y, int z) {
        return y > 31 && this.worldServerInstance.getBlockState(new BlockPos(x, y, z)).getBlock() == Blocks.BEDROCK;
    }

    /** R196 Teleporter.java:379-393. */
    public void removeStalePortalLocations(long par1) {
        if (par1 % 100L == 0L) {
            Iterator<Long> var3 = this.destinationCoordinateKeys.iterator();
            long var4 = par1 - 600L;
            while (var3.hasNext()) {
                Long var6 = var3.next();
                PortalPosition var7 = this.destinationCoordinateCache.get(var6);
                if (var7 == null || var7.lastUpdateTime < var4) {
                    var3.remove();
                    this.destinationCoordinateCache.remove(var6);
                }
            }
        }
    }

    /** R196 Teleporter.PortalPosition. */
    private static class PortalPosition {
        public final int posX;
        public final int posY;
        public final int posZ;
        public long lastUpdateTime;

        PortalPosition(int posX, int posY, int posZ, long lastUpdateTime) {
            this.posX = posX;
            this.posY = posY;
            this.posZ = posZ;
            this.lastUpdateTime = lastUpdateTime;
        }
    }
}
