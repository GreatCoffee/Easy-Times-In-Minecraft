package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityFireElemental;
import net.minecraft.block.Block;
import net.minecraft.block.BlockStaticLiquid;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.Random;

/**
 * B-62 D-1 — R196 {@code BlockStationary.updateTick} lava branch
 * (:33-70): the only natural fire-elemental source. A stationary lava block
 * rolls {@code rand(16 + y)} with sky light ({@code rand(16)} without), caps
 * at 2 fire elementals within 16³, and spawns in the block above when a
 * player is close enough (nether: 1/4 sub-roll, player within 64 or 16;
 * overworld: 1/16 sub-roll, full lava column above, air two above, player
 * within 16).
 */
@Mixin(BlockStaticLiquid.class)
public abstract class MixinBlockStaticLiquid {

    @Inject(method = "updateTick", at = @At("RETURN"))
    private void etim$lavaFireSpawn(World world, BlockPos pos, IBlockState state, Random rand,
            CallbackInfo ci) {
        if (!ETIMConfig.mobElementalR196 || world.isRemote) {
            return;
        }
        Block block = state.getBlock();
        if (block != Blocks.LAVA && block != Blocks.FLOWING_LAVA) {
            return;
        }
        int rarity = world.canSeeSky(pos) ? 16 + pos.getY() : 16;
        if (rand.nextInt(rarity) != 0) {
            return;
        }
        if (world.getEntitiesWithinAABB(ETIMEntityFireElemental.class,
                new AxisAlignedBB(pos).grow(8.0D)).size() >= 2) {
            return;
        }
        boolean nether = world.provider.getDimension() == -1;
        BlockPos up = pos.up();
        if (nether) {
            if (world.getBlockState(pos.down()).getMaterial() == Material.LAVA) {
                return;
            }
            if (world.getBlockState(up).getMaterial() != Material.AIR) {
                return;
            }
            if (rand.nextInt(4) != 0) {
                return;
            }
            if (!playerWithin(world, pos, rand.nextBoolean() ? 64.0D : 16.0D)) {
                return;
            }
        } else {
            if (rand.nextInt(16) != 0) {
                return;
            }
            if (world.getBlockState(up).getMaterial() != Material.LAVA) {
                return;
            }
            if (world.getBlockState(pos.up(2)).getMaterial() != Material.AIR
                    || world.getBlockState(pos.up(3)).getMaterial() != Material.AIR) {
                return;
            }
            if (!playerWithin(world, pos, 16.0D)) {
                return;
            }
        }
        ETIMEntityFireElemental fire = new ETIMEntityFireElemental(world);
        fire.setLocationAndAngles(pos.getX() + 0.5D, up.getY() + 0.1D, pos.getZ() + 0.5D, 0.0F, 0.0F);
        world.spawnEntity(fire);
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[ElementalLog] lavaspawn kind=fire nether={} at {} entity={} [server]",
                    nether, pos, fire.getEntityId());
        }
    }

    private static boolean playerWithin(World world, BlockPos pos, double range) {
        double sq = range * range;
        for (EntityPlayer player : world.playerEntities) {
            if (player.getDistanceSq(pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D) <= sq) {
                return true;
            }
        }
        return false;
    }
}
