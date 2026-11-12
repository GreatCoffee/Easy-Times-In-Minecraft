package io.github.etim.etim.mob;

import java.util.ArrayList;
import java.util.List;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathNavigate;
import net.minecraft.pathfinding.PathNavigateGround;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.MathHelper;

/**
 * B-35 — the skeleton/snowman repair-seeking arm, R196 {@code
 * EntityAIMoveToRepairItem :1-38} + its base {@code EntityAIMoveToItem
 * :1-60} + {@code EntityAIMovementTask} verbatim, seated by {@code
 * EntitySkeleton :23} {@code addTask(4, …, 1.0F, swim=true)} / {@code
 * EntitySnowman :15} {@code addTask(2, …, 1.0F, swim=true)}:
 * <ul>
 *   <li>{@code shouldExecute :24-32} gates: the shared {@code
 *       food_or_repair_item_pickup_cooldown > 0 → no (R196 :30, the
 *       field rides the {@link ETIMRepairCooldownDuck} on {@code
 *       MixinEntityLiving})}, then a 1-in-40 per-tick roll, then {@code
 *       getHealthFraction() < 1.0F} ({@code R196 EntityLiving :1344},
 *       the willUseForRepair gate — a full-health mob never seeks),</li>
 *   <li>{@code getNearbyItemEntitiesOfInterest :11-16} = EntityItems
 *       inside {@code expand(16, 4, 16)} passing {@code isRepairItem}
 *       (bone for skeletons — R196 {@code EntitySkeleton :352-355},
 *       snowball for snowmen — R196 {@code EntitySnowman :116-119});</li>
 *   <li>{@code getMovementPath :25-47} walks the list keeping the
 *       SHORTEST path whose final point lands exactly on the item's
 *       block ({@code item_y = floor(posY + 0.5)} per the B-23
 *       foodseek precedent — the ground item sits at the block's
 *       bottom, the +0.5 keeps the walk target in the same cell, C-note
 *       in the B-35 摸底 §3-③);</li>
 *   <li>{@code continueExecuting :35-37 + MoveToItem :52-55} holds
 *       while the selected item lives, the cooldown is still 0 and the
 *       path is unfinished;</li>
 *   <li>{@code updateTask} carries the pickup itself (R196 does it in
 *       the {@code EntityLiving :651-685} ground-pickup block, which
 *       1.12 lacks — the C-note in 摸底 §3-②): the selected item inside
 *       {@code grow(1.0, 0.25, 1.0)} (R196 {@code
 *       EntityLiving :441-444} getBoundingBoxForItemPickup) is picked
 *       up with a 50% max-health heal ({@code :1348-1350
 *       healByPercentage(0.5)}) and a 400-tick cooldown {@code (:662)}
 *       — the ETIM-side carrier of the eat/repair lanes;</li>
 *   <li>{@code setMutexBits(1)} — R196 {@code EntityAIMovementTask :21}.</li>
 * </ul>
 * The start/pickup rows are the carrier-side judge lines (工装发明判行),
 * unconditional on the mobDebugLog gate like the B-33 tree arm.
 */
public class ETIMEntityAIMoveToRepairItem extends net.minecraft.entity.ai.EntityAIBase {

    private final EntityLiving owner;
    private final float movementSpeed = 1.0F; // R196 EntitySkeleton :23 / EntitySnowman :15 — the ctor arg
    private final int maxPathLength = 16; // R196 EntityAIMoveToItem :11
    private final boolean swimIfNecessary = true; // R196 :8 — swim_if_necessary
    private List<EntityItem> candidates;
    private EntityItem target;

    public ETIMEntityAIMoveToRepairItem(EntityLiving owner) {
        this.owner = owner;
        this.setMutexBits(1); // R196 EntityAIMovementTask :21
    }

    @Override
    public boolean shouldExecute() {
        if (!ETIMConfig.livestockNeedsR196) { // the family flag — the fourteenth reuse
            return false;
        }
        if (!(isRepairFamily(this.owner))) {
            return false; // R196 seats only skeleton/snowman
        }
        if (cooldown() > 0) {
            return false; // R196 :25-27
        }
        if (this.owner.getRNG().nextInt(40) > 0) {
            return false; // R196 :29-31 — the 1/40 scan roll
        }
        if (this.owner.getHealth() >= this.owner.getMaxHealth()) {
            return false; // R196 :33-35 — getHealthFraction() >= 1.0F
        }
        AxisAlignedBB box = this.owner.getEntityBoundingBox().grow(
                maxPathLength, maxPathLength / 4.0D, maxPathLength); // :11-14 expand(16,4,16)
        this.candidates = new ArrayList<EntityItem>();
        for (EntityItem item_entity : this.owner.world.getEntitiesWithinAABB(EntityItem.class, box)) {
            if (!item_entity.isDead && !item_entity.getItem().isEmpty()
                    && isRepairItem(item_entity.getItem())) {
                this.candidates.add(item_entity); // World :4548-4559 — the isRepairItem filter
            }
        }
        return !this.candidates.isEmpty();
    }

    @Override
    public void startExecuting() {
        // 1.12 carrier note: the R196 swim_if_necessary arm maps to the
        // PathNavigateGround canSwim flag (the B-11 foodseek precedent).
        PathNavigate nav = this.owner.getNavigator();
        boolean canSwim = nav instanceof PathNavigateGround
                ? ((PathNavigateGround) nav).getCanSwim()
                : false;
        Path path = validPath(choosePath());
        // R196 parity arm — the EntityLiving :651-685 ground-pickup loop runs
        // every tick without the AI; the AI port rides updateTask (摸底 §3-②
        // C-note), so the standing-on-the-item edge must still start and pick
        // up at once. 同格时 A* 对 target==source 返 null，而 choosePath()
        // 只在 path!=null 时选举 target（:249-257）→ this.target 恒 null，
        // v1（b35-build3）检查 this.target!=null 是死分支（W-B35 r2 圈栏
        // 60s 零 start 定谳）。改从 candidates 按盒交直接选举：
        if (path == null && this.candidates != null) {
            for (EntityItem item_entity : this.candidates) {
                if (!isRepairItem(item_entity.getItem())
                        || !this.owner.getEntityBoundingBox().intersects(
                                item_entity.getEntityBoundingBox().grow(1.0D, 0.25D, 1.0D))) {
                    continue;
                }
                this.target = item_entity; // manual election — pickupIfInBox rides this.target
                nav.setPath(null, this.movementSpeed);
                // judge line (工装发明判行) — same shape as the walk start row
                ETIM.LOGGER.info("[AILog] repairseek src=" + src()
                        + " start item=" + item_entity.getItem().getItem().getRegistryName()
                        + " hp=" + String.format("%.2f", this.owner.getHealth())
                        + "/" + String.format("%.2f", this.owner.getMaxHealth())
                        + " dist=" + String.format("%.2f", Math.sqrt(this.owner.getDistanceSq(item_entity)))
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
                pickupIfInBox(); // the box already intersects → heal now
                return;
            }
        }
        if (path == null && this.swimIfNecessary && !canSwim
                && nav instanceof PathNavigateGround) {
            ((PathNavigateGround) nav).setCanSwim(true);
            path = validPath(choosePath());
        }
        if (path != null) {
            nav.setPath(path, this.movementSpeed); // MovementTask :72 — setPath(path, speed)
            // judge line (工装发明判行) — unconditional on the mobDebugLog gate
            ETIM.LOGGER.info("[AILog] repairseek src=" + src()
                    + " start item=" + this.target.getItem().getItem().getRegistryName()
                    + " hp=" + String.format("%.2f", this.owner.getHealth())
                    + "/" + String.format("%.2f", this.owner.getMaxHealth())
                    + " dist=" + String.format("%.2f", Math.sqrt(this.owner.getDistanceSq(this.target)))
                    + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
    }

    /** R196 EntityAIMovementTask :55-65 — the path-validity arm (see startExecuting). */
    private Path validPath(Path path) {
        if (path == null || path.isFinished()) {
            return null;
        }
        PathPoint final_point = path.getFinalPathPoint();
        double dx = this.owner.posX - final_point.x; // R196 :57-59 — the deltas to the final point
        double dy = this.owner.posY - final_point.y;
        double dz = this.owner.posZ - final_point.z;
        return (dx * dx + dy * dy + dz * dz) < 1.0 ? null : path; // :60-62 — already there = invalid
    }

    @Override
    public boolean shouldContinueExecuting() {
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        if (cooldown() > 0) {
            return false; // R196 MoveToRepairItem :35-37
        }
        // R196 EntityAIMoveToItem :52-55 + EntityAIMovementTask :82-83
        return this.target != null && !this.target.isDead
                && !this.owner.getNavigator().noPath();
    }

    @Override
    public void updateTask() {
        this.owner.getNavigator().setSpeed(this.movementSpeed); // EntityAIMovementTask :77
        pickupIfInBox();
    }

    /**
     * the pickup arm — R196 EntityLiving :651-685 (1.12 lacks the
     * block; see the C-note in 摸底 §3-②). The selected item inside
     * the pickup box → heal 50% max + the 400-tick cooldown + the
     * stack shrink. The willUseForRepair hp gate was already
     * checked in shouldExecute; re-checking here guards the
     * incidental top-up while walking (and the standing-on-the-item
     * edge from startExecuting — idempotent under the same guards).
     */
    private void pickupIfInBox() {
        if (this.target == null || this.target.isDead || cooldown() > 0
                || this.owner.getHealth() >= this.owner.getMaxHealth()) {
            return;
        }
        AxisAlignedBB pickup_box = this.target.getEntityBoundingBox()
                .grow(1.0D, 0.25D, 1.0D); // R196 EntityLiving :441-444
        if (!this.owner.getEntityBoundingBox().intersects(pickup_box)) {
            return;
        }
        float heal_amount = this.owner.getMaxHealth() * 0.5F; // R196 :1348-1350
        this.owner.heal(heal_amount); // 1.12 EntityLivingBase :936
        this.setCooldown(400); // R196 :662
        ItemStack stack = this.target.getItem();
        net.minecraft.item.Item picked_item = stack.getItem(); // 判面取 shrink 前的 item（shrink 后空栈读 air）
        stack.shrink(1); // R196 :666 — stackSize--
        if (stack.isEmpty()) {
            this.target.setDead(); // R196 :667 — empty stack = the item entity dies
        }
        playPickupSound(); // R196 :668 random.pop — flavor only, never a judge line
        // judge line (工装发明判行) — src= 与 start 行同形（驱动 bySrc 过滤依赖）
        ETIM.LOGGER.info("[RepairLog] pickup src=" + src()
                + " heal=" + String.format("%.2f", heal_amount)
                + " hp=" + String.format("%.2f", this.owner.getHealth())
                + " cooldown=400 item=" + picked_item.getRegistryName()
                + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
    }

    @Override
    public void resetTask() {
        if (this.target != null) {
            ETIM.LOGGER.info("[AILog] repairseek src=" + src()
                    + " reset cooldown=" + cooldown()
                    + " targetDead=" + this.target.isDead
                    + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
        this.owner.getNavigator().clearPath(); // EntityAIMovementTask :88
        if (this.owner.getNavigator() instanceof PathNavigateGround) {
            // EntityAIMovementTask :89 restore — 1.12 carrier = the canSwim flag
            ((PathNavigateGround) this.owner.getNavigator()).setCanSwim(false);
        }
        this.target = null;
        this.candidates = null;
    }

    /** R196 EntityAIMoveToItem :30-45 — the shortest, exact-target path choice. */
    private Path choosePath() {
        PathNavigate nav = this.owner.getNavigator();
        Path best = null;
        int bestLength = Integer.MAX_VALUE;
        this.target = null;
        if (this.candidates == null) {
            return null;
        }
        for (EntityItem item_entity : this.candidates) {
            if (!isRepairItem(item_entity.getItem())) {
                continue; // R196 :30 — willPickUp
            }
            int item_x = MathHelper.floor(item_entity.posX);
            int item_y = MathHelper.floor(item_entity.posY + 0.5D); // the B-23 foodseek precedent (C-note)
            int item_z = MathHelper.floor(item_entity.posZ);
            Path path = nav.getPathToXYZ(item_x, item_y, item_z);
            if (path != null) {
                PathPoint final_point = path.getFinalPathPoint();
                if (final_point.x == item_x && final_point.y == item_y && final_point.z == item_z
                        && path.getCurrentPathLength() < bestLength) {
                    bestLength = path.getCurrentPathLength(); // :44 — the shortest path wins
                    this.target = item_entity;
                    best = path;
                }
            }
        }
        return best;
    }

    private boolean isRepairFamily(EntityLiving living) {
        return living instanceof net.minecraft.entity.monster.EntitySkeleton
                || living instanceof net.minecraft.entity.monster.EntitySnowman;
    }

    /** R196 EntitySkeleton :352-355 / EntitySnowman :116-119 — the repair tables. */
    private boolean isRepairItem(ItemStack stack) {
        if (this.owner instanceof net.minecraft.entity.monster.EntitySkeleton) {
            return stack.getItem() == Items.BONE;
        }
        if (this.owner instanceof net.minecraft.entity.monster.EntitySnowman) {
            return stack.getItem() == Items.SNOWBALL;
        }
        return false;
    }

    /** the judge-line src tag — hard-coded per mob (the B-31/B-33 lesson: no kind()). */
    private String src() {
        return this.owner instanceof net.minecraft.entity.monster.EntitySkeleton ? "skeleton" : "snowman";
    }

    /** the cooldown read — the duck on MixinEntityLiving (摸底 §3-①). */
    private int cooldown() {
        return this.owner instanceof ETIMRepairCooldownDuck
                ? ((ETIMRepairCooldownDuck) this.owner).etim$getRepairPickupCooldown()
                : 0;
    }

    private void setCooldown(int value) {
        if (this.owner instanceof ETIMRepairCooldownDuck) {
            ((ETIMRepairCooldownDuck) this.owner).etim$setRepairPickupCooldown(value);
        }
    }

    /** R196 :668 random.pop — the pickup blip, flavor only. */
    private void playPickupSound() {
        SoundEvent sound = net.minecraft.init.SoundEvents.ENTITY_ITEM_PICKUP;
        this.owner.world.playSound(null, this.owner.posX, this.owner.posY, this.owner.posZ,
                sound, SoundCategory.NEUTRAL, 0.2F,
                (this.owner.getRNG().nextFloat() - this.owner.getRNG().nextFloat()) * 0.2F + 1.0F);
    }
}
