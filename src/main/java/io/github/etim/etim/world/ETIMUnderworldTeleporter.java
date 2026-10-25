package io.github.etim.etim.world;

import net.minecraft.entity.Entity;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;
import net.minecraftforge.common.util.ITeleporter;

/**
 * The dimension-change placement face for the {@code /etim dim} command entry
 * (M2 组). The R196 portal scan ({@code BlockPortal.java:442-448} +
 * {@code :501-537}) transposed verbatim (report §2.3):
 *
 * <ul>
 *   <li>{@code goodSpot}: the two target cells passable (liquids count as
 *       passable — R196 :5648 face), the below cell solid-or-liquid (passable
 *       = false), below not lava, below not ceiling-bedrock (y-1 &gt; 31).</li>
 *   <li>{@code placeEntity}: top-down scan 254→0 for the first good spot;
 *       none → carve 2 air at y=64 and place there (R196 :529-537).</li>
 * </ul>
 *
 * <p>M2 传送门整类后置 — this teleporter is the minimal command entry only.</p>
 */
public final class ETIMUnderworldTeleporter implements ITeleporter {

    public static final ETIMUnderworldTeleporter INSTANCE = new ETIMUnderworldTeleporter();

    private ETIMUnderworldTeleporter() {
    }

    @Override
    public void placeEntity(World world, Entity entity, float yaw) {
        int x = MathHelper.floor(entity.posX);
        int z = MathHelper.floor(entity.posZ);
        for (int y = 254; y > 0; y--) {
            if (goodSpot(world, x, y, z)) {
                put(entity, x, y, z, yaw);
                ETIMDimensions.dimLog("landing player=" + entity.getName()
                        + " dim=" + world.provider.getDimension() + " y=" + y);
                return;
            }
        }
        // R196 :529-537 — no spot: carve and drop at y=64.
        world.setBlockToAir(new BlockPos(x, 64, z));
        world.setBlockToAir(new BlockPos(x, 65, z));
        put(entity, x, 64, z, yaw);
        ETIMDimensions.dimLog("landing player=" + entity.getName()
                + " dim=" + world.provider.getDimension() + " y=64 carved");
    }

    /** R196 BlockPortal.java:442-448. */
    static boolean goodSpot(World w, int x, int y, int z) {
        IBlockState below = w.getBlockState(new BlockPos(x, y - 1, z));
        return passable(w, x, y, z)
                && passable(w, x, y + 1, z)
                && !passable(w, x, y - 1, z)  // liquids count as standable ground (:5648)
                && below.getMaterial() != Material.LAVA
                && !(y - 1 > 31 && below.getBlock() == Blocks.BEDROCK); // World.java:6867-6869 isCeilingBedrock
    }

    private static boolean passable(World w, int x, int y, int z) {
        BlockPos pos = new BlockPos(x, y, z);
        IBlockState state = w.getBlockState(pos);
        if (state.getBlock().isAir(state, w, pos)) {
            return true;
        }
        if (state.getMaterial().isLiquid()) {
            return false;
        }
        return !state.getMaterial().blocksMovement();
    }

    private static void put(Entity e, int x, int y, int z, float yaw) {
        e.setLocationAndAngles(x + 0.5D, y, z + 0.5D, yaw, 0.0F);
        e.motionX = 0.0D;
        e.motionY = 0.0D;
        e.motionZ = 0.0D;
        e.fallDistance = 0.0F;
    }
}
