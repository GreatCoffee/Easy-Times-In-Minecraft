package io.github.etim.etim.reach;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.item.EntityBoat;
import net.minecraft.entity.projectile.EntityFireball;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.item.ItemShears;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemTool;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;

/**
 * R196 reach model (task 2.1; values from {@code EntityPlayer.java:2170-2226},
 * bonus values from the decompiled Item/ItemTool/ItemShears clinit).
 *
 * <p>Contexts (R196 {@code EnumEntityReachContext}): block selection 2.75 plus
 * the held tool's bonus while the tool is effective against that block; melee
 * attack 1.5 plus the elevation advantage plus the held item's bonus; entity
 * interaction 2.5 plus the elevation advantage plus the held item's bonus;
 * creative mode extends everything to 5.0.</p>
 *
 * <p>Bonus table (R196): swords/pickaxes/axes/shovels 0.75 (ItemTool base,
 * ItemSword extends it), stick/bone 0.5, shears 0.5, everything else 0.
 * Block bonuses only apply to tools effective against the block — mirrored
 * here via vanilla {@code Item.canHarvestBlock}; task 2.2 replaces this with
 * the real MITE effectiveness chain.</p>
 *
 * <p>Not ported yet: the R196 note "sneaking = +0.5 down / −0.5 up"
 * (MC百科 1849) — no sneak hook exists anywhere in the R196 reach code chain
 * found so far; pending the bytecode verdict from the pre-verification
 * session.</p>
 */
public final class ETIMReach {

    /**
     * R196 elevation advantage (EntityPlayer:2189-2203). R196 measures feet as
     * {@code posY - yOffset}; 1.12.2's {@code posY} is already the feet value,
     * so the subtraction collapses to posY − posY.
     */
    public static float getHeightAdvantage(EntityPlayer player, Entity entity) {
        float elevationDifference = (float) (player.posY - entity.posY);
        if (elevationDifference < -0.5F) {
            return MathHelper.clamp((elevationDifference + 0.5F) * 0.5F, -1.0F, 0.0F);
        }
        if (elevationDifference > 0.5F) {
            return MathHelper.clamp((elevationDifference - 0.5F) * 0.5F, 0.0F, 1.0F);
        }
        return 0.0F;
    }

    /** Held item's melee/interaction bonus (R196 Item.getReachBonus, Item.java:1277-1279). */
    public static float getHeldReachBonus(ItemStack held) {
        return held == null ? 0.0F : getReachBonus(held.getItem());
    }

    /** Per-item melee bonus mapping for the vanilla set (R196 clinit values). */
    public static float getReachBonus(net.minecraft.item.Item item) {
        if (item instanceof ItemTool) { // sword/pickaxe/axe/shovel extend ItemTool in vanilla too
            return ETIMConfig.reachBonusTool;
        }
        if (item instanceof ItemShears || item == Items.STICK || item == Items.BONE) {
            return ETIMConfig.reachBonusSmall;
        }
        return 0.0F;
    }

    /** Block selection reach without block context (ray length for the client picker). */
    public static float getBlockReach(EntityPlayer player) {
        return player.capabilities.isCreativeMode ? ETIMConfig.creativeReach : ETIMConfig.blockReachBase;
    }

    /** R196 getReach(Block, metadata) — bonus only while the held tool is effective (EntityPlayer:2174-2182). */
    public static float getBlockReach(EntityPlayer player, Block block, int metadata) {
        if (player.capabilities.isCreativeMode) {
            return ETIMConfig.creativeReach;
        }
        float reach = ETIMConfig.blockReachBase;
        ItemStack held = player.getHeldItemMainhand();
        if (held != null && !held.isEmpty()) {
            IBlockState state = block.getStateFromMeta(MathHelper.clamp(metadata, 0, 15));
            if (held.getItem().canHarvestBlock(state)) {
                reach += getReachBonus(held.getItem());
            }
        }
        return reach;
    }

    /**
     * R196 getReach(FOR_MELEE_ATTACK) (EntityPlayer:2206-2208): 1.5 + elevation
     * advantage + item bonus, passed through the target's adjust hook — the only
     * R196 override on the melee path is EntityFireball (+2.0, EntityFireball.java:321-324).
     */
    public static float getMeleeReach(EntityPlayer player, Entity target) {
        if (player.capabilities.isCreativeMode) {
            return ETIMConfig.creativeReach;
        }
        float reach = ETIMConfig.meleeReachBase + getHeightAdvantage(player, target) + getHeldReachBonus(player.getHeldItemMainhand());
        if (target instanceof EntityFireball) {
            reach += 2.0F;
        }
        return reach;
    }

    /**
     * R196 getReach(FOR_INTERACTION) (EntityPlayer:2210-2214): 2.5 + elevation
     * advantage + item bonus; boats fix the interaction reach at 2.5 flat
     * (EntityBoat.java:482-484 overrides the adjust hook).
     */
    public static float getInteractionReach(EntityPlayer player, Entity target) {
        if (target instanceof EntityBoat) {
            return ETIMConfig.interactionReachBase;
        }
        if (player.capabilities.isCreativeMode) {
            return ETIMConfig.creativeReach;
        }
        return ETIMConfig.interactionReachBase + getHeightAdvantage(player, target) + getHeldReachBonus(player.getHeldItemMainhand());
    }

    /** Eye distance to the closest point of the target's unexpanded AABB. */
    public static double getEyeSurfaceDistance(EntityPlayer player, Entity entity) {
        return getNearestBoxDistance(player.getPositionEyes(1.0F), entity.getEntityBoundingBox());
    }

    /**
     * Eye distance to the closest point of the full cube [pos, pos+1]. Used by
     * server validation so it can never deny a legitimate selection: the
     * vanilla client ray measures eye → ray-surface, which is always ≥ the
     * box-nearest distance (this eliminated the "ghost block" denials of the
     * earlier center-based metric).
     */
    public static double getBlockSurfaceDistance(EntityPlayer player, BlockPos pos) {
        return getNearestBoxDistance(player.getPositionEyes(1.0F),
                new AxisAlignedBB(pos, pos.add(1, 1, 1)));
    }

    /** Euclidean eye distance to the closest point of a box (0 when inside). */
    public static double getNearestBoxDistance(Vec3d eye, AxisAlignedBB box) {
        double dx = eye.x - MathHelper.clamp(eye.x, box.minX, box.maxX);
        double dy = eye.y - MathHelper.clamp(eye.y, box.minY, box.maxY);
        double dz = eye.z - MathHelper.clamp(eye.z, box.minZ, box.maxZ);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /** R196 getBlockReachFromPoints origins (EntityPlayer:2220-2226): eye −0.25 and eye −0.625. */
    public static Vec3d[] getBodyPoints(EntityPlayer player) {
        Vec3d eye = player.getPositionEyes(1.0F);
        return new Vec3d[]{eye.add(0.0D, -0.25, 0.0D), eye.add(0.0D, -0.625, 0.0D)};
    }

    /**
     * Body point → block center, best of the two R196 origins — THE block
     * reach distance in both selection (Raycast.java:503-521) and server
     * validation, so HUD verdicts and server decisions use one metric.
     */
    public static double getBodyCenterDistance(EntityPlayer player, BlockPos pos) {
        Vec3d center = new Vec3d(pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D);
        double best = Double.MAX_VALUE;
        for (Vec3d point : getBodyPoints(player)) {
            best = Math.min(best, point.distanceTo(center));
        }
        return best;
    }

    /** Eye distance to a block's CENTER (R196 compares body points to block centers, Raycast.java:517-518). */
    public static double getEyeCenterDistance(EntityPlayer player, BlockPos pos) {
        Vec3d eye = player.getPositionEyes(1.0F);
        double dx = eye.x - (pos.getX() + 0.5D);
        double dy = eye.y - (pos.getY() + 0.5D);
        double dz = eye.z - (pos.getZ() + 0.5D);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Ray → box entry distance (slab method), used by the debug overlay's
     * display-only entity picker and reusable for later reach work. Returns
     * Double.MAX_VALUE when the ray misses or points backwards.
     */
    public static double getRayBoxEntryDistance(Vec3d origin, Vec3d direction, AxisAlignedBB box) {
        double entry = Double.NEGATIVE_INFINITY;
        double exit = Double.POSITIVE_INFINITY;
        if (Math.abs(direction.x) < 1.0E-8D) {
            if (origin.x < box.minX || origin.x > box.maxX) return Double.MAX_VALUE;
        } else {
            double t1 = (box.minX - origin.x) / direction.x;
            double t2 = (box.maxX - origin.x) / direction.x;
            entry = Math.max(entry, Math.min(t1, t2));
            exit = Math.min(exit, Math.max(t1, t2));
        }
        if (Math.abs(direction.y) < 1.0E-8D) {
            if (origin.y < box.minY || origin.y > box.maxY) return Double.MAX_VALUE;
        } else {
            double t1 = (box.minY - origin.y) / direction.y;
            double t2 = (box.maxY - origin.y) / direction.y;
            entry = Math.max(entry, Math.min(t1, t2));
            exit = Math.min(exit, Math.max(t1, t2));
        }
        if (Math.abs(direction.z) < 1.0E-8D) {
            if (origin.z < box.minZ || origin.z > box.maxZ) return Double.MAX_VALUE;
        } else {
            double t1 = (box.minZ - origin.z) / direction.z;
            double t2 = (box.maxZ - origin.z) / direction.z;
            entry = Math.max(entry, Math.min(t1, t2));
            exit = Math.min(exit, Math.max(t1, t2));
        }
        if (entry > exit || exit < 0.0D) {
            return Double.MAX_VALUE;
        }
        return entry >= 0.0D ? entry : 0.0D;
    }

    private ETIMReach() {
    }
}
