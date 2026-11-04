package io.github.etim.etim.mixins;

import io.github.etim.etim.farm.ETIMFarm;
import net.minecraft.block.Block;
import net.minecraft.block.BlockFarmland;
import net.minecraft.block.material.Material;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.ItemBucket;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ActionResult;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Farmland-moisture batch (条 283, D-5 甲): the R196 water-bucket face —
 * right-click ON farmland top = hydrate the 3×3 same-layer ring to 7, place
 * NO water, hand back the empty bucket (R196 ItemBucket → BlockFarmland.fertilize
 * bucket arm :282-315; the A-1/A-2 faces: the caller's own vessel return +
 * zero consumption when the whole ring is already full). The hell face
 * evaporates (R196 :271-277) and still pays the empty bucket.
 *
 * <p>The ray face is the vanilla {@code Item.rayTrace} core replicated
 * verbatim ({@code useLiquids = false} — the water bucket passes THROUGH
 * other water like vanilla); blocking mod-hop ahead of
 * {@code ForgeEventFactory.onBucketUse} only when the R196 face hit (the
 * pool-off/none landing stays vanilla).</p>
 */
@Mixin(ItemBucket.class)
public abstract class MixinItemBucketUse {

    @org.spongepowered.asm.mixin.Shadow
    @org.spongepowered.asm.mixin.Final
    private Block containedBlock;

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
    private void etim$r196WaterBucket(World world, EntityPlayer player, EnumHand hand,
                                      CallbackInfoReturnable<ActionResult<ItemStack>> cir) {
        if (world.isRemote || this.containedBlock != Blocks.FLOWING_WATER) {
            return; // non-water bucket / client side / empty-bucket fill face — vanilla
        }
        ItemStack stack = player.getHeldItem(hand);
        RayTraceResult trace = this.etim$rayTrace(world, player, false);
        if (trace == null || trace.typeOfHit != RayTraceResult.Type.BLOCK) {
            return;
        }
        BlockPos hit = trace.getBlockPos();
        if (world.getBlockState(hit).getBlock() != Blocks.FARMLAND || trace.sideHit != EnumFacing.UP) {
            return; // R196 face only lands on farmland top; the rest stays vanilla
        }
        boolean hell = world.provider.isNether();
        if (hell) {
            // R196 :271-277 — evaporate, still hand the empty bucket
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.SUCCESS,
                    new ItemStack(Items.BUCKET)));
            ETIMFarm.row("fertilize src=bucket cells=0 hell=1"); // FX face skipped (C-19 注记)
            return;
        }
        int used = 0;
        StringBuilder cells = new StringBuilder();
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                BlockPos p = hit.add(dx, 0, dz);
                if (ETIMFarm.waterSpot(world, p)) {
                    used++;
                    cells.append(p.getX()).append(',').append(p.getY()).append(',').append(p.getZ()).append(';');
                }
            }
        }
        if (used > 0) {
            ETIMFarm.row("fertilize src=bucket cells=" + used
                    + (cells.length() > 0 ? " wet=" + cells : ""));
            if (!player.capabilities.isCreativeMode) {
                cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.SUCCESS,
                        new ItemStack(Items.BUCKET))); // A-1: the vessel return face
                return;
            }
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.SUCCESS, stack));
            return;
        }
        // A-2: nothing hydrated (all-ring already full) — R196 returns false ⇒ no
        // consume; the vanilla body (place water) would fire — bridge: FAIL keeps
        // the hands-of-the-player clean (no water placed, no fee) — C 注记 in the ledger.
        cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.FAIL, stack));
    }
}
