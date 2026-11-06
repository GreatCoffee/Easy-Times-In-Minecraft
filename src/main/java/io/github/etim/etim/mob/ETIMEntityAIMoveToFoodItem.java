package io.github.etim.etim.mob;

import java.util.ArrayList;
import java.util.List;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathNavigate;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;

/**
 * B-11 (条 306/307) — the ground-food walking arm, R196 {@code
 * EntityAIMoveToFoodItem} + {@code EntityAIMoveToItem} verbatim, seated by
 * the {@code EntityAnimal} ctor :9 {@code addTask(1, …, 1.0F, swim=true)}:
 * <ul>
 *   <li>{@code shouldExecute :24-36} gates: the shared
 *       {@code food_or_repair_item_pickup_cooldown} {@code > 0} → no (the
 *       cooldown field lives on the ETIMLivestock capability, R196 :30,
 *       non-persisted), then a 1-in-40 per-tick roll, then {@code canEat}
 *       ({@code EntityAnimal :257-260} + {@code EntityLiving :1330-1332} —
 *       the family gate is NOT part of this arm, it sits in {@code
 *       willPickUp} and the eat arm);</li>
 *   <li>{@code getNearbyItemEntitiesOfInterest :13-16} = the
 *       {@code World.getFoodItemEntitiesWithinAABBForLivingEntity :4535-4546}
 *       filter — EntityItems inside {@code expand(16, 4, 16)} passing
 *       {@code isFoodItem};</li>
 *   <li>{@code getMovementPath :30-45} walks the list: {@code willPickUp ≡
 *       willEat} (the family gate) per item, a {@code getPathToXYZ(…, 16)}
 *       per candidate, and keeps the SHORTEST path whose final point lands
 *       exactly on the item's block position;</li>
 *   <li>{@code continueExecuting :52-55 + :49} holds while the selected
 *       item lives and the path is unfinished (and the cooldown is still
 *       0);</li>
 *   <li>{@code setMutexBits(1)} — R196 {@code EntityAIMovementTask :21}.</li>
 * </ul>
 * The eating itself rides {@code ETIMLivestockEvents.groundEatTick} on the
 * needs-family per-tick seat (1.12 has no livestock food-pickup arm of its
 * own — EntityLiving's only ground pickup is the canPickUpLoot equipment
 * lane, EntityLiving:649). The start row is the carrier-side judge line
 * (工装发明判行). The start row is emitted once per executed path.
 */
public class ETIMEntityAIMoveToFoodItem extends net.minecraft.entity.ai.EntityAIBase {

    private final EntityLiving owner;
    private final float movementSpeed = 1.0F; // R196 EntityAnimal :9 — the ctor arg
    private final int maxPathLength = 16; // R196 EntityAIMoveToItem :11
    private final boolean swimIfNecessary = true; // R196 :9 — swim_if_necessary
    private List<EntityItem> candidates;
    private EntityItem target;

    public ETIMEntityAIMoveToFoodItem(EntityLiving owner) {
        this.owner = owner;
        this.setMutexBits(1); // R196 EntityAIMovementTask :21
    }

    @Override
    public boolean shouldExecute() {
        if (!ETIMConfig.livestockNeedsR196) { // D-1 — the needs-family seat
            return false;
        }
        if (!(this.owner instanceof net.minecraft.entity.passive.EntityAnimal)) {
            return false; // the R196 livestock family is the capability carrier
        }
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s == null) {
            return false;
        }
        if (s.getPickupCooldown() > 0) {
            return false; // R196 :25-27
        }
        if (this.owner.getRNG().nextInt(40) > 0) {
            return false; // R196 :29-31 — the 1/40 scan roll
        }
        if (!canEat()) {
            return false; // R196 :33-35
        }
        AxisAlignedBB box = this.owner.getEntityBoundingBox().grow(
                maxPathLength, maxPathLength / 4.0D, maxPathLength); // :13-14 expand(16,4,16)
        this.candidates = new ArrayList<EntityItem>();
        for (EntityItem item_entity : this.owner.world.getEntitiesWithinAABB(EntityItem.class, box)) {
            if (!item_entity.isDead && !item_entity.getItem().isEmpty()
                    && isFoodItem(item_entity.getItem())) {
                this.candidates.add(item_entity); // World :4535-4546 — the isFoodItem filter
            }
        }
        return !this.candidates.isEmpty();
    }

    @Override
    public void startExecuting() {
        // 1.12 carrier note: the R196 navigator exposeWater pair
        // (getAvoidsWater/setAvoidsWater, 1.6.4 lineage) maps to
        // PathNavigateGround getCanSwim/setCanSwim (:332/:337 — the avoid
        // water flag of the ground navigator, false for animals by default).
        PathNavigate nav = this.owner.getNavigator();
        boolean canSwim = nav instanceof net.minecraft.pathfinding.PathNavigateGround
                ? ((net.minecraft.pathfinding.PathNavigateGround) nav).getCanSwim()
                : false;
        Path path = validPath(choosePath());
        if (path == null && this.swimIfNecessary && !canSwim
                && nav instanceof net.minecraft.pathfinding.PathNavigateGround) {
            ((net.minecraft.pathfinding.PathNavigateGround) nav).setCanSwim(true);
            path = validPath(choosePath());
        }
        if (path != null) {
            nav.setPath(path, this.movementSpeed); // :72 — setPath(path, speed)
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] foodseek src=" + ETIMLivestockEvents.kind(this.owner)
                        + " start item=" + this.target.getItem().getItem().getRegistryName()
                        + " dist=" + String.format("%.2f", Math.sqrt(this.owner.getDistanceSq(this.target)))
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
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
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        if (s != null && s.getPickupCooldown() > 0) {
            return false; // R196 MoveToFoodItem :49
        }
        // R196 EntityAIMoveToItem :52-55 + EntityAIMovementTask :82-83
        return this.target != null && !this.target.isDead
                && !this.owner.getNavigator().noPath();
    }

    @Override
    public void updateTask() {
        this.owner.getNavigator().setSpeed(this.movementSpeed); // EntityAIMovementTask :77
    }

    @Override
    public void resetTask() {
        if (ETIMConfig.mobDebugLog && this.target != null) {
            net.minecraft.pathfinding.Path path = this.owner.getNavigator().getPath();
            ETIM.LOGGER.info("[AILog] foodseek src=" + ETIMLivestockEvents.kind(this.owner)
                    + " reset path=" + (path == null ? "cleared" : ("len=" + path.getCurrentPathLength()
                            + " idx=" + path.getCurrentPathIndex() + " fin=" + path.isFinished()))
                    + " targetLiving=" + !this.target.isDead
                    + " cooldown=" + s0()
                    + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
        this.owner.getNavigator().clearPath(); // EntityAIMovementTask :88
        if (this.owner.getNavigator() instanceof net.minecraft.pathfinding.PathNavigateGround) {
            // EntityAIMovementTask :89 restore — 1.12 carrier = the canSwim flag
            ((net.minecraft.pathfinding.PathNavigateGround) this.owner.getNavigator()).setCanSwim(false);
        }
        this.target = null;
        this.candidates = null;
    }

    private String s0() {
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        return s == null ? "null" : String.valueOf(s.getPickupCooldown());
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
            if (!willEatOk(item_entity.getItem())) {
                continue; // R196 :30 — willPickUp ≡ willEat (the family gate)
            }
            int item_x = MathHelper.floor(item_entity.posX);
            int item_y = MathHelper.floor(item_entity.posY + 0.5D);
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

    /** R196 canEat — EntityAnimal :257-260 + EntityLiving :1330-1332 (no family gate here). */
    private boolean canEat() {
        boolean inLove = this.owner instanceof net.minecraft.entity.passive.EntityAnimal
                && ((net.minecraft.entity.passive.EntityAnimal) this.owner).isInLove();
        net.minecraft.entity.EntityAgeable ageable = (net.minecraft.entity.EntityAgeable) this.owner;
        return !inLove && ageable.getGrowingAge() == 0
                && !ageable.isChild() && !this.owner.isDead && this.owner.getHealth() > 0.0F;
    }

    /** the R196 livestock isFoodItem tables — one call into the events layer. */
    private boolean isFoodItem(net.minecraft.item.ItemStack stack) {
        return ETIMLivestockEvents.isFoodItemPublic(this.owner, stack);
    }

    /** the family willEat gate — see ETIMLivestockEvents.willEatCause. */
    private boolean willEatOk(net.minecraft.item.ItemStack stack) {
        ETIMLivestock.IState s = ETIMLivestock.get(this.owner);
        return s != null && ETIMLivestockEvents.willEatCause(this.owner, s, stack) == null;
    }
}
