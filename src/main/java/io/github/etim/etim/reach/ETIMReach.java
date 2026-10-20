package io.github.etim.etim.reach;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMMining;
import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityHanging;
import net.minecraft.entity.item.EntityBoat;
import net.minecraft.entity.passive.EntityHorse;
import net.minecraft.entity.projectile.EntityFireball;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.item.ItemShears;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemSword;
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
 * <p>Sneaking (final verdict, R196实体触及几何裁决.md + R196潜行触及裁决.md): the
 * reach formula has zero sneak branches — sneaking only lowers the ray origin
 * through {@code getEyePosY} ({@code posY − 0.2385}, EntityPlayer.java:1071).
 * Vanilla 1.12 already moves the eye when sneaking via {@code getPositionEyes},
 * so no extra hook exists here.</p>
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
        if (item instanceof ItemShears || item == Items.STICK || item == Items.BONE) {
            return ETIMConfig.reachBonusSmall;
        }
        // R196 ItemSword extends ItemTool (clinit 0.75) — vanilla 1.12's
        // ItemSword does NOT extend ItemTool, so it needs its own branch.
        if (item instanceof ItemSword || item instanceof ItemTool) {
            return ETIMConfig.reachBonusTool;
        }
        return 0.0F;
    }

    /**
     * ❗F-6-18（audit20-06 R1）two-stage restore: 16.0 survival = R196 ray
     * length only (Raycast(observer, partial, 16.0), EntityPlayer:2239 —
     * A 级直引常量不配键); creative flat 5.0 (= hasExtendedReach,
     * EntityPlayer:2171/:2175). The block trim = MixinEntityRenderer TAIL.
     */
    public static float getBlockReach(EntityPlayer player) {
        return player.capabilities.isCreativeMode ? ETIMConfig.creativeReach : 16.0F;
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
            // A5 定谳（2026-10-20，主会话）：R196 谓词 = Item.getReachBonus(Block,int)
            // （Item.java:1281-1283，final）＝ isEffectiveAgainstBlock —— EntityPlayer:2181
            // 调用的正是带 Block 的版本。旧 1.12 等价物 getDestroySpeed > 1.0F 在
            // getHarvestTool=null 的方块（玻璃等）上背离 R196 表（destroySpeed=1.0 ⇒ 无加成，
            // R196 表 = 有效）——实测 HUD「有效工具✓」而 reach 2.75 的口径断裂即此。
            // 判据面统一走 ETIM 表谓词（与 HUD/挖掘同一判定源）。
            if (ETIMMining.isEffectiveAgainstBlock(held, state)) {
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
     * advantage; boats fix the interaction reach at 2.5 flat
     * (EntityBoat.java:482-484 overrides the adjust hook).
     * R-02=A（audit20 回裁）：R196 一手 Item.getReachBonus（Item.java:1285-1287）
     * 恒 0 且全树无覆写 ⇒ 交互上下文永无物品加成——不转置该项。
     */
    public static float getInteractionReach(EntityPlayer player, Entity target) {
        if (target instanceof EntityBoat) {
            return ETIMConfig.interactionReachBase;
        }
        if (player.capabilities.isCreativeMode) {
            return ETIMConfig.creativeReach;
        }
        return ETIMConfig.interactionReachBase + getHeightAdvantage(player, target);
    }

    /**
     * R196 effective hit-test box: {@code boundingBox.expand(cbs)} on all three
     * axes (Raycast.java:313-314), plus the two rider hooks
     * (Entity.java:3059-3063 box −0.5 Y / EntityHorse.java:261-262 box ×0.5
     * when the viewer rides the target). cbs = {@link #getCollisionBorderSize}.
     */
    public static AxisAlignedBB getEffectiveHitbox(EntityPlayer viewer, Entity entity) {
        AxisAlignedBB box = entity.getEntityBoundingBox().grow(getCollisionBorderSize(entity));
        if (viewer.getRidingEntity() == entity) {
            if (entity instanceof EntityHorse) {
                double cx = (box.minX + box.maxX) * 0.5D;
                double cy = (box.minY + box.maxY) * 0.5D;
                double cz = (box.minZ + box.maxZ) * 0.5D;
                box = new AxisAlignedBB(
                        cx + (box.minX - cx) * 0.5D, cy + (box.minY - cy) * 0.5D, cz + (box.minZ - cz) * 0.5D,
                        cx + (box.maxX - cx) * 0.5D, cy + (box.maxY - cy) * 0.5D, cz + (box.maxZ - cz) * 0.5D);
            } else {
                box = box.offset(0.0D, -0.5D, 0.0D);
            }
        }
        return box;
    }

    /**
     * R196 cbs table (Entity.java:2151-2157 + overrides). As the target of a
     * player ray the projectile-viewer 0.3F branch never applies (the viewer
     * is a player, not a projectile): fireballs were hit at 1.0F
     * (EntityFireball.java:255-262), hanging objects at exactly 0.0F, regular
     * entities at the configurable default (R196 0.1F).
     */
    public static float getCollisionBorderSize(Entity entity) {
        if (entity instanceof EntityFireball) {
            return 1.0F;
        }
        if (entity instanceof EntityHanging) {
            return 0.0F;
        }
        return ETIMConfig.entityHitboxExpansion;
    }

    /**
     * THE entity reach distance — server validation and HUD verdict use the
     * same function. R196 metric: eye → entry point of the effective hitbox
     * along the look ray (slab method, Raycast.java:320-322); 0 when the eye
     * is already inside the hitbox (Raycast.java:317-318).
     */
    public static double getEntityRayDistance(EntityPlayer player, Entity entity) {
        Vec3d origin = player.getPositionEyes(1.0F);
        AxisAlignedBB box = getEffectiveHitbox(player, entity);
        if (box.contains(origin)) {
            return 0.0D;
        }
        return getRayBoxEntryDistance(origin, player.getLook(1.0F), box);
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
