package io.github.etim.etim.mixins;

import io.github.etim.etim.farm.ETIMFarm;
import net.minecraft.block.BlockFarmland;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.ItemPotion;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ActionResult;
import net.minecraft.util.EnumHand;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.*;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Farmland-moisture batch (条 283, D-5 甲): the R196 water-BOTTLE face —
 * right-click ON farmland top = hydrate the SINGLE spot to 7 and hand back
 * the glass bottle (R196 BlockFarmland.fertilize bottle arm :266-292; the
 * item-side vessel return sits at ItemPotion per A-1, and the A-2 full-wet
 * face = no consume). Vanilla 1.12 water bottles are drinkable and never
 * block-interactive — this HEAD-cancel gives them the R196 watering
 * gesture on the farmland-top ray without touching the drink path.
 */
@Mixin(ItemPotion.class)
public abstract class MixinItemPotionUse {

    private RayTraceResult etim$rayTrace(World world, EntityPlayer player, boolean useLiquids) {
        float pitch = player.rotationPitch;
        float yaw = player.rotationYaw;
        Vec3d origin = new Vec3d(player.posX, player.posY + player.getEyeHeight(), player.posZ);
        float f2 = MathHelper.cos(-yaw * 0.017453292F - (float) Math.PI);
        float f3 = MathHelper.sin(-yaw * 0.017453292F - (float) Math.PI);
        float f4 = -MathHelper.cos(-pitch * 0.017453292F);
        float f5 = MathHelper.sin(-pitch * 0.017453292F);
        float f6 = f3 * f4;
        float f7 = f2 * f4;
        double reach = player.getEntityAttribute(EntityPlayer.REACH_DISTANCE).getAttributeValue();
        Vec3d end = origin.add(f6 * reach, f5 * reach, f7 * reach);
        return world.rayTraceBlocks(origin, end, useLiquids, !useLiquids, false);
    }

    @Inject(method = "onItemRightClick", at = @At("HEAD"), cancellable = true)
    private void etim$r196WaterBottle(World world, EntityPlayer player, EnumHand hand,
                                      CallbackInfoReturnable<ActionResult<ItemStack>> cir) {
        if (world.isRemote) {
            return;
        }
        ItemStack stack = player.getHeldItem(hand);
        if (stack.getMetadata() != 0) {
            return; // water bottle only (meta 0) — the drinkable potion path stays vanilla
        }
        RayTraceResult trace = this.etim$rayTrace(world, player, false);
        if (trace == null || trace.typeOfHit != RayTraceResult.Type.BLOCK) {
            return;
        }
        BlockPos hit = trace.getBlockPos();
        if (world.getBlockState(hit).getBlock() != Blocks.FARMLAND || trace.sideHit != EnumFacing.UP) {
            return;
        }
        boolean wet = ETIMFarm.waterSpot(world, hit);
        if (world.provider.isNether()) {
            // R196 :268-273 — evaporate, still return the bottle
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.SUCCESS,
                    new ItemStack(Items.GLASS_BOTTLE)));
            ETIMFarm.row("fertilize src=bottle cells=0 hell=1"); // FX face skipped (C-19 注记)
            return;
        }
        if (!wet) {
            // A-2 — already full: no consume, no drinking (R196 arm returns false)
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.FAIL, stack));
            return;
        }
        ETIMFarm.row("fertilize src=bottle cells=1 pos=" + hit.getX() + "," + hit.getY() + "," + hit.getZ());
        if (!player.capabilities.isCreativeMode) {
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.SUCCESS,
                    new ItemStack(Items.GLASS_BOTTLE))); // A-1: the vessel return face
            return;
        }
        cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.SUCCESS, stack));
    }
}
