package io.github.etim.etim.metal;

import io.github.etim.etim.mob.ETIMArrowLog;
import io.github.etim.etim.mob.ETIMEntityArrow;
import net.minecraft.block.BlockDispenser;
import net.minecraft.dispenser.BehaviorProjectileDispense;
import net.minecraft.dispenser.IPosition;
import net.minecraft.entity.IProjectile;
import net.minecraft.entity.projectile.EntityArrow;
import net.minecraft.item.ItemStack;
import net.minecraft.world.World;

/**
 * The per-gear dispenser behavior for the ETIM arrows (NE-09 / D-21 + D-26①).
 * R196's DispenserBehaviorArrow spawns the arrow, sets {@code canBePickedUp = 1}
 * (:13) and {@code shot_by_dispenser = true} (:14); its base class runs
 * {@code setThrowableHeading(…, 1.1F, 6.0F)} and then scales the arrow's
 * velocity ×2 (:10-14) — the 1.12 base dispenseStack (dispenser/
 * BehaviorProjectileDispense.java:15-25) shoots directly with
 * {@code getProjectileVelocity()} (default 1.1F, :45-48) and never scales.
 *
 * <p>Both generations inject the heading the same way (normalize → per-axis
 * gaussian ×0.0075×inaccuracy → multiply by velocity), so
 * {@code shoot(1.1) × motion*2} and {@code shoot(2.2)} are equal in
 * distribution — the report §6.3 equivalence face (B-9). Only this one number
 * flips; vanilla logic is not copied (final decision D-26①).</p>
 */
public final class ETIMArrowDispense extends BehaviorProjectileDispense {

    private final ETIMItemArrow item;

    public ETIMArrowDispense(ETIMItemArrow item) {
        this.item = item;
    }

    /** R196 DispenserBehaviorArrow.java:12-14 — identity + the two flags + judgment row. */
    @Override
    protected IProjectile getProjectileEntity(World world, IPosition position, ItemStack stack) {
        ETIMEntityArrow arrow = new ETIMEntityArrow(world,
                position.getX(), position.getY(), position.getZ(),
                this.item, /* launcherEnchanted: the dispenser holds the arrow, not a bow */ false);
        arrow.pickupStatus = EntityArrow.PickupStatus.ALLOWED;
        arrow.setShotByDispenser(true);
        io.github.etim.etim.mob.ETIMArrowLog.row("arrow dispense item=" + this.item.getRegistryName()
                + " dispenser=true pickup=ALLOWED");
        return arrow;
    }

    /** R196 :32-34 1.1F × :13 scaleVelocity(2.0F) — reads 2.2F (§6.3, B-9). */
    @Override
    protected float getProjectileVelocity() {
        return 1.1F * 2.0F;
    }

    /** Registers all six gear arrows (rusted included — ETIMGear.java:83). Must run
     *  after ETIMGear.register(): the gear() lookup fail-fasts on unregistered
     *  items (ETIMGear.java:161-167). */
    public static void register() {
        for (ETIMMetals metal : ETIMMetals.values()) {
            ETIMItemArrow arrowItem = (ETIMItemArrow) ETIMGear.gear("arrow_" + metal.name);
            BlockDispenser.DISPENSE_BEHAVIOR_REGISTRY.putObject(arrowItem, new ETIMArrowDispense(arrowItem));
        }
    }
}
