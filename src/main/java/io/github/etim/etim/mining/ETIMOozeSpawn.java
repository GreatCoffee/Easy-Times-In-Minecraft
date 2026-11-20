package io.github.etim.etim.mining;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityOoze;

import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.init.Blocks;
import net.minecraft.init.SoundEvents;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * B-44 census A :90 — the R196 1% mining-ooze spawn
 * ({@code ItemInWorldManager.removeBlock :69-116}).
 *
 * <p>Judged chain: the broken block must be an opaque full cube whose
 * material requires a tool (R196 isAlwaysOpaqueStandardFormCube +
 * requiresTool), the 1% roll must win, one of the six neighbours must be
 * {@code Blocks.STONE}, and that stone must have exactly one non-stone
 * neighbour. The stone is then removed without drops and an ooze spawns at
 * its centre (size 1, R196 setLocationAndAngles offset 0.25).</p>
 */
public final class ETIMOozeSpawn {

    private ETIMOozeSpawn() {
    }

    /**
     * Called from {@link ETIMMiningEvents#postHarvest} at the head of the
     * post-harvest chain (R196 removeBlock runs before drops/tree felling).
     */
    public static void trySpawn(World world, BlockPos pos, IBlockState harvested, EntityPlayerMP player) {
        if (world == null || world.isRemote || harvested == null || !ETIMConfig.miningReform) {
            return;
        }
        if (!isOpaqueFullCube(harvested) || !requiresTool(harvested)) {
            return;
        }
        float chance = ETIMConfig.miningOozeChance;
        boolean win = world.rand.nextFloat() < chance;
        log("roll chance=" + chance + " win=" + win
                + " block=" + String.valueOf(harvested.getBlock().getRegistryName())
                + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
        if (!win) {
            return;
        }
        int ran = world.rand.nextInt(6);
        int dx = ran == 0 ? -1 : ran == 1 ? 1 : 0;
        int dy = ran == 2 ? -1 : ran == 3 ? 1 : 0;
        int dz = ran == 4 ? -1 : ran == 5 ? 1 : 0;
        BlockPos stonePos = pos.add(dx, dy, dz);
        if (world.getBlockState(stonePos).getBlock() != Blocks.STONE) {
            log("skip reason=neighbour block=" + String.valueOf(world.getBlockState(stonePos).getBlock().getRegistryName())
                    + " pos=" + stonePos.getX() + "," + stonePos.getY() + "," + stonePos.getZ());
            return;
        }
        int nonStone = 0;
        for (EnumFacing facing : EnumFacing.values()) {
            BlockPos around = stonePos.offset(facing);
            if (world.getBlockState(around).getBlock() != Blocks.STONE) {
                nonStone++;
            }
        }
        if (nonStone != 1) {
            log("skip reason=stone-neighbours nonStone=" + nonStone
                    + " pos=" + stonePos.getX() + "," + stonePos.getY() + "," + stonePos.getZ());
            return;
        }
        spawn(world, stonePos, "mining");
    }

    /** Test-only forced spawn for the W1 attribute window. */
    public static void forceSpawn(World world, BlockPos pos) {
        spawn(world, pos, "test");
    }

    private static void spawn(World world, BlockPos stonePos, String source) {
        world.setBlockToAir(stonePos);
        ETIMEntityOoze ooze = new ETIMEntityOoze(world);
        ooze.setOozeSize(1);
        ooze.setLocationAndAngles(stonePos.getX() + 0.5D, stonePos.getY() + 0.25D,
                stonePos.getZ() + 0.5D, world.rand.nextFloat() * 360.0F, 0.0F);
        world.spawnEntity(ooze);
        world.playSound(null, stonePos, SoundEvents.ENTITY_SMALL_SLIME_JUMP, SoundCategory.HOSTILE,
                0.2F, ((world.rand.nextFloat() - world.rand.nextFloat()) * 0.2F + 1.0F) * 0.8F);
        log("spawn source=" + source + " pos=" + stonePos.getX() + "," + stonePos.getY() + "," + stonePos.getZ()
                + " size=1 maxHealth=1 attack=3 xp=4");
    }

    private static boolean isOpaqueFullCube(IBlockState state) {
        return state.getMaterial().isOpaque() && state.isFullCube();
    }

    /** R196 Material.requiresTool :405-407 = requires_tool || min level > 0. */
    private static boolean requiresTool(IBlockState state) {
        return !state.getMaterial().isToolNotRequired()
                || state.getBlock().getHarvestLevel(state) > 0;
    }

    private static void log(String line) {
        if (ETIMConfig.miningDebugLog) {
            ETIM.LOGGER.info("[OozeLog] " + line + " [server]");
        }
    }
}
