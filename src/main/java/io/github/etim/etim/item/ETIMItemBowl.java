package io.github.etim.etim.item;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.farm.ETIMFarm;
import net.minecraft.block.Block;
import net.minecraft.block.BlockFarmland;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ActionResult;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

/**
 * B-65 · R196 {@code ItemBowl}（207 行）的 1.12 载体。
 *
 * <p>数值与内容物对位见 {@link ETIMBowlContents}（D-1 全量 15 项）。
 * 本类只承载「方块面」：空碗取水、水碗浇耕地、水碗熄方块火。
 * 实体面（挤奶 / 喂水 / 灭火）走 {@link ETIMItemVessel#etimTryEntityInteraction}。</p>
 *
 * <p>空碗 = 原版 {@code minecraft:bowl}（R196 bowlEmpty 同源）；原版碗的
 * 取水注入在 {@code mixins/MixinItem.java} 的 {@code etim$bowlFill}。</p>
 */
public class ETIMItemBowl extends ETIMItemVessel {

    public ETIMItemBowl(ETIMBowlContents contents) {
        super(contents, 1, 16, 4, true);
    }

    @Override
    public ActionResult<ItemStack> onItemRightClick(World world, EntityPlayer player, EnumHand hand) {
        ItemStack stack = player.getHeldItem(hand);
        if (!ETIMConfig.foodR196Extra || this.isEmpty()) {
            return super.onItemRightClick(world, player, hand);
        }

        // R196 ItemBowl.onItemRightClick :49-60 —— 含水碗对着火方块：熄火 + 换空碗
        if (this.canContentsDouseFire()) {
            RayTraceResult trace = this.rayTrace(world, player);
            if (trace != null && trace.typeOfHit == RayTraceResult.Type.BLOCK) {
                BlockPos hit = trace.getBlockPos();
                IBlockState state = world.getBlockState(hit);
                if (state.getBlock() == Blocks.FIRE) {
                    if (!world.isRemote) {
                        world.setBlockToAir(hit);
                        world.spawnParticle(EnumParticleTypes.SMOKE_LARGE,
                                hit.getX() + 0.5D, hit.getY() + 0.5D, hit.getZ() + 0.5D,
                                0.05D, 0.1D, 0.05D);
                        if (!player.capabilities.isCreativeMode) {
                            this.replaceHeld(player, hand, stack, new ItemStack(Items.BOWL));
                        }
                        ETIMVesselEvents.row("bowl fire douse at "
                                + hit.getX() + "," + hit.getY() + "," + hit.getZ() + " player=" + player.getName());
                    }
                    return new ActionResult<>(EnumActionResult.SUCCESS, player.getHeldItem(hand));
                }

                // R196 ItemBowl.onItemRightClick :62-88 —— 水碗浇耕地单点
                if (state.getBlock() == Blocks.FARMLAND && trace.sideHit == EnumFacing.UP) {
                    boolean wet = ETIMFarm.waterSpot(world, hit);
                    ETIMVesselEvents.row("bowl water farmland wet=" + wet + " at "
                            + hit.getX() + "," + hit.getY() + "," + hit.getZ());
                    if (!wet) {
                        return new ActionResult<>(EnumActionResult.FAIL, stack);
                    }
                    if (!world.isRemote && !player.capabilities.isCreativeMode) {
                        this.replaceHeld(player, hand, stack, new ItemStack(Items.BOWL));
                    }
                    return new ActionResult<>(EnumActionResult.SUCCESS, player.getHeldItem(hand));
                }
            }
        }
        return super.onItemRightClick(world, player, hand);
    }

    /**
     * R196 {@code ItemBowl.getCompostingValue}：奶碗 0，其余走营养默认
     * （`(satiation + nutrition) * 0.1`，见 {@code ETIMCompost.compostValue}）。
     */
    public float etimCompostingValue() {
        return this.contains(ETIMBowlContents.MILK) ? 0.0F
                : (this.getContents().satiation + this.getContents().nutrition) * 0.1F;
    }

    /** 1.12 空碗燃料值 200 tick（R196 {@code ItemBowl.getBurnTime}）。 */
    public static int emptyBowlBurnTime(ItemStack stack) {
        return stack.getItem() == Items.BOWL ? 200 : 0;
    }

    private void replaceHeld(EntityPlayer player, EnumHand hand, ItemStack stack, ItemStack replacement) {
        if (stack.getCount() <= 1) {
            player.setHeldItem(hand, replacement);
        } else {
            stack.shrink(1);
            if (!player.addItemStackToInventory(replacement)) {
                player.dropItem(replacement, false);
            }
        }
    }

    private RayTraceResult rayTrace(World world, EntityPlayer player) {
        float pitch = player.rotationPitch;
        float yaw = player.rotationYaw;
        Vec3d origin = new Vec3d(player.posX, player.posY + player.getEyeHeight(), player.posZ);
        float f2 = MathHelper.cos(-yaw * 0.017453292F - (float) Math.PI);
        float f3 = MathHelper.sin(-yaw * 0.017453292F - (float) Math.PI);
        float f4 = -MathHelper.cos(-pitch * 0.017453292F);
        float f5 = MathHelper.sin(-pitch * 0.017453292F);
        double reach = player.getEntityAttribute(EntityPlayer.REACH_DISTANCE).getAttributeValue();
        Vec3d end = origin.add(f3 * f4 * reach, f5 * reach, f2 * f4 * reach);
        return world.rayTraceBlocks(origin, end, false, true, false);
    }

    /** 水碗取水判定用：命中块或其上方一块是水（R196 命中块或邻块材质 water）。 */
    public static boolean isWaterAt(World world, BlockPos pos) {
        if (world.getBlockState(pos).getMaterial() == Material.WATER) {
            return true;
        }
        return world.getBlockState(pos.up()).getMaterial() == Material.WATER;
    }

    /** 水碗查询块是否可浇水（供 mixin 的空碗取水臂复用）。 */
    public static boolean isWaterSource(World world, BlockPos pos) {
        Block block = world.getBlockState(pos).getBlock();
        return block == Blocks.WATER || block == Blocks.FLOWING_WATER
                || world.getBlockState(pos.up()).getMaterial() == Material.WATER;
    }
}
