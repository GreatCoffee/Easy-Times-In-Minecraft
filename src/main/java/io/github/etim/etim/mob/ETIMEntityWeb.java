package io.github.etim.etim.mob;

import net.minecraft.block.Block;
import net.minecraft.block.BlockSnow;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.projectile.EntityThrowable;
import net.minecraft.init.Blocks;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.world.World;

/**
 * R196 {@code EntityWeb} port (:3-135, verdict G-S2 = A full carry). The
 * impact face places vanilla cobweb: entity hit → predicted-4-tick position,
 * then the feet, then the AABB cell-by-cell; block hit → the replaceable cell
 * beside the hit face. The burning web (Demon/burning thrower) ignites a
 * random free neighbour and the occupants. Render rides the user-approved
 * RenderSnowball equivalence (thrownWeb has no 1.12 carrier — registered in
 * client/ETIMSpiderRender).
 */
public class ETIMEntityWeb extends EntityThrowable {

    public ETIMEntityWeb(World world) {
        super(world);
    }

    public ETIMEntityWeb(World world, EntityLivingBase thrower) {
        super(world, thrower);
    }

    public ETIMEntityWeb(World world, double x, double y, double z) {
        super(world, x, y, z);
    }

    /**
     * R196 :16-54 — the shared entity-hit face (static, also reachable by
     * other throwers in R196): predicted-4-tick cell first, then feet, then
     * the whole AABB, first success wins.
     */
    public static boolean onImpact(EntityLivingBase hit, boolean burning) {
        if (burning) {
            hit.setFire(5);
        }
        World world = hit.world;
        int x = MathHelper.floor(hit.posX);
        int y = MathHelper.floor(hit.getEntityBoundingBox().minY);
        int z = MathHelper.floor(hit.posZ);
        int predictedX = MathHelper.floor(hit.posX + hit.motionX * 4.0D); // R196 lead=4
        int predictedZ = MathHelper.floor(hit.posZ + hit.motionZ * 4.0D);
        if ((predictedX != x || predictedZ != z) && setBlockToWebIfEmpty(world, predictedX, y, predictedZ, burning)) {
            return true;
        }
        if (setBlockToWebIfEmpty(world, x, y, z, burning)) {
            return true;
        }
        AxisAlignedBB bb = hit.getEntityBoundingBox();
        int minX = MathHelper.floor(bb.minX);
        int minY = MathHelper.floor(bb.minY);
        int minZ = MathHelper.floor(bb.minZ);
        int maxX = MathHelper.floor(bb.maxX);
        int maxY = MathHelper.floor(bb.maxY);
        int maxZ = MathHelper.floor(bb.maxZ);
        for (int yy = minY; yy <= maxY; yy++) {
            for (int xx = minX; xx <= maxX; xx++) {
                for (int zz = minZ; zz <= maxZ; zz++) {
                    if (setBlockToWebIfEmpty(world, xx, yy, zz, burning)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * R196 :56-96 — the impact dispatch: entity → the static face; block →
     * fire/lava adjacency burns the projectile, water splashes, everything
     * else places a web beside the hit face (then one cell above). All arms
     * end dead.
     */
    @Override
    protected void onImpact(RayTraceResult result) {
        if (result.typeOfHit == RayTraceResult.Type.ENTITY) {
            if (result.entityHit instanceof EntityLivingBase && !this.world.isRemote
                    && onImpact((EntityLivingBase) result.entityHit, this.isBurning())) {
                this.setDead();
            } else if (this.world.isRemote) {
                return; // client side leaves the static face to the server arm
            } else {
                this.setDead();
            }
            return;
        }
        if (result.typeOfHit != RayTraceResult.Type.BLOCK) {
            return;
        }
        BlockPos hitPos = result.getBlockPos();
        IBlockState hitState = this.world.getBlockState(hitPos);
        BlockPos neighborPos = hitPos.offset(result.sideHit);
        IBlockState neighborState = this.world.getBlockState(neighborPos);
        boolean fireAdjacent = hitState.getBlock() == Blocks.FIRE || neighborState.getBlock() == Blocks.FIRE;
        boolean lavaAdjacent = hitState.getMaterial() == Material.LAVA
                || neighborState.getMaterial() == Material.LAVA;
        if (fireAdjacent || lavaAdjacent) {
            // R196 :96-99 burned_up_in_lava face (particle equivalence per G-S6)
            if (!this.world.isRemote) {
                this.world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL, this.posX, this.posY,
                        this.posZ, 0.0D, 0.0D, 0.0D);
            }
            this.setDead();
            return;
        }
        boolean waterAdjacent = hitState.getMaterial() == Material.WATER
                || neighborState.getMaterial() == Material.WATER;
        if (waterAdjacent) {
            // R196 :87-92 splash face
            if (!this.world.isRemote) {
                this.world.spawnParticle(EnumParticleTypes.WATER_SPLASH, this.posX, this.posY,
                        this.posZ, 0.0D, 0.0D, 0.0D);
            }
            this.setDead();
            return;
        }
        if (!this.world.isRemote) {
            BlockPos place = canReplaceBlockAt(this.world, hitPos) ? hitPos : neighborPos;
            if (!setBlockToWebIfEmpty(this.world, place.getX(), place.getY(), place.getZ(), this.isBurning())) {
                setBlockToWebIfEmpty(this.world, place.getX(), place.getY() + 1, place.getZ(), this.isBurning());
            }
        }
        this.setDead();
    }

    /**
     * R196 :122-129 — only air or a single snow layer is replaceable.
     */
    private static boolean canReplaceBlockAt(World world, BlockPos pos) {
        IBlockState state = world.getBlockState(pos);
        // single snow layer = Blocks.SNOW_LAYER with LAYERS==1 → metadata 0
        return state.getBlock() == Blocks.AIR
                || (state.getBlock() == Blocks.SNOW_LAYER
                        && state.getBlock().getMetaFromState(state) == 0);
    }

    /**
     * R196 :131-160 — place the cobweb; a burning web ignites one random free
     * neighbour and sets every living occupant of the cell on fire.
     */
    private static boolean setBlockToWebIfEmpty(World world, int x, int y, int z, boolean burning) {
        BlockPos pos = new BlockPos(x, y, z);
        if (!canReplaceBlockAt(world, pos) || !world.setBlockState(pos, Blocks.WEB.getDefaultState())) {
            return false;
        }
        if (burning) {
            BlockPos[] neighbors = new BlockPos[] { pos.up(), pos.down(), pos.south(), pos.north(),
                    pos.east(), pos.west() };
            BlockPos[] free = new BlockPos[6];
            int count = 0;
            for (BlockPos n : neighbors) {
                if (world.getBlockState(n).getBlock() == Blocks.AIR) {
                    free[count++] = n;
                }
            }
            if (count > 0) {
                BlockPos fireAt = free[world.rand.nextInt(count)];
                world.setBlockState(fireAt, Blocks.FIRE.getDefaultState());
                for (EntityLivingBase elb : world.getEntitiesWithinAABB(EntityLivingBase.class,
                        new AxisAlignedBB(x, y, z, x + 1.0D, y + 1.0D, z + 1.0D))) {
                    elb.setFire(5);
                }
            }
        }
        return true;
    }
}
