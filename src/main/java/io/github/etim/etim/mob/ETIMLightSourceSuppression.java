package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.ItemStack;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * B-59 — R196 {@code EntityLiving.java:1377-1443} light-source suppression,
 * the Shadow's habitat engineering.
 *
 * <p>{@code isNearLitTorch} scans the box {@code dx,dz in [-1,1]} and
 * {@code dy in [-1, 1 + height]} around own block for torch / active
 * redstone torch / pumpkin lantern. {@code tryDisableNearbyLightSource}
 * only fires when {@code !isRemote && recentlyHit == 0} and the nearest
 * player is farther than 4.0: torches are set to air with their item
 * entity and a 0.05-volume "pop"; pumpkin lanterns become plain pumpkins
 * and drop one torch with {@code delayBeforeCanPickup = 10}.</p>
 */
public final class ETIMLightSourceSuppression {

    private ETIMLightSourceSuppression() {
    }

    public static boolean isLitSource(IBlockState state) {
        Block block = state.getBlock();
        return block == Blocks.TORCH
                || block == Blocks.REDSTONE_TORCH
                || block == Blocks.LIT_PUMPKIN;
    }

    public static boolean isNearLitTorch(EntityLivingBase entity) {
        return isNearLitTorch(entity.world, new BlockPos(entity), (int) Math.ceil(entity.height));
    }

    public static boolean isNearLitTorch(World world, BlockPos base, int height) {
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                for (int dy = -1; dy <= 1 + height; dy++) {
                    if (isLitSource(world.getBlockState(base.add(dx, dy, dz)))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public static boolean tryDisableNearbyLightSource(EntityLivingBase entity) {
        return tryDisableNearbyLightSource(entity, "shadow");
    }

    /** B-60: same R196 routine, tagging the row for the calling species. */
    public static boolean tryDisableNearbyLightSource(EntityLivingBase entity, String label) {
        World world = entity.world;
        if (world.isRemote || ((io.github.etim.etim.mixins.EntityLivingBaseAccessor) entity).etim$getRecentlyHit() != 0) {
            return false;
        }
        EntityPlayer nearest = world.getClosestPlayerToEntity(entity, -1.0D);
        if (nearest != null && entity.getDistanceSq(nearest) <= 16.0D) {
            return false; // R196: distanceToNearestPlayer() > 4.0
        }
        BlockPos base = new BlockPos(entity);
        int height = (int) Math.ceil(entity.height);
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                for (int dy = -1; dy <= 1 + height; dy++) {
                    BlockPos pos = base.add(dx, dy, dz);
                    IBlockState state = world.getBlockState(pos);
                    if (state.getBlock() == Blocks.TORCH || state.getBlock() == Blocks.REDSTONE_TORCH) {
                        world.setBlockToAir(pos);
                        dropItem(world, pos, new ItemStack(state.getBlock()));
                        popSound(world, entity);
                        if (ETIMConfig.mobDebugLog) {
                            ETIM.LOGGER.info("[UndeadLog] {} snuff pos={} kind={} entity={}",
                                    label, pos, state.getBlock().getRegistryName(), entity);
                        }
                        return true;
                    }
                    if (state.getBlock() == Blocks.LIT_PUMPKIN) {
                        world.setBlockState(pos, Blocks.PUMPKIN.getDefaultState(), 3);
                        EntityItem torch = new EntityItem(world, pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D,
                                new ItemStack(Blocks.TORCH));
                        torch.setDefaultPickupDelay();
                        torch.setPickupDelay(10);
                        world.spawnEntity(torch);
                        popSound(world, entity);
                        if (ETIMConfig.mobDebugLog) {
                            ETIM.LOGGER.info("[UndeadLog] {} snuff pos={} kind=lit_pumpkin entity={}", label, pos, entity);
                        }
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private static void dropItem(World world, BlockPos pos, ItemStack stack) {
        EntityItem item = new EntityItem(world, pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D, stack);
        item.setDefaultPickupDelay();
        world.spawnEntity(item);
    }

    private static void popSound(World world, EntityLivingBase entity) {
        float pitch = (entity.getRNG().nextFloat() - entity.getRNG().nextFloat()) * 0.7F + 1.0F;
        world.playSound(null, entity.posX, entity.posY, entity.posZ,
                SoundEvents.ENTITY_ITEM_PICKUP, SoundCategory.HOSTILE, 0.05F, pitch * 2.0F);
    }

    /** Unused guard kept for the goal's box maths. */
    static AxisAlignedBB torchScanBox(EntityLivingBase entity) {
        return entity.getEntityBoundingBox().grow(1.0D, entity.height, 1.0D);
    }
}
