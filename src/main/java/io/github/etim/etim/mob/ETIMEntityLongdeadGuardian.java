package io.github.etim.etim.mob;

import io.github.etim.etim.metal.ETIMGear;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.world.World;

/**
 * R196 {@code EntityLongdeadGuardian.java:1-82} port (M5-07). The longdead
 * officer face: while holding the bow, the dagger rides the {@code
 * stowed_item_stack} NBT (R196 :13-15/:21-35) and the hand swap runs the
 * judged distance gates — bow &lt; 5.0 → melee, else &gt; 6.0 → bow
 * (:71-77), checked on the {@code ticksExisted % 10 == 0} cadence (:64).
 *
 * <p>{@code canStowItem}/{@code canNeverPickUpItem} (:48-55) have no 1.12
 * per-item pick-up gate (B-11) — registered, not ported.</p>
 */
public class ETIMEntityLongdeadGuardian extends ETIMEntityLongdead {

    private ItemStack stowedItemStack;

    public ETIMEntityLongdeadGuardian(World world) {
        super(world);
    }

    /** R196 :10-16 — set during the equip dispatch (ETIMMobEquip.longdeadEquip). */
    public void setStowedItemStack(ItemStack stowedItemStack) {
        this.stowedItemStack = stowedItemStack;
    }

    public ItemStack getStowedItemStack() {
        return this.stowedItemStack;
    }

    /** R196 :42-46 — the one-for-one hand swap. */
    public void swapHeldItemStackWithStowed() {
        ItemStack stowed = this.stowedItemStack;
        this.stowedItemStack = this.getHeldItemMainhand();
        this.setItemStackToSlot(net.minecraft.inventory.EntityEquipmentSlot.MAINHAND, stowed);
    }

    /** R196 :57-59 — held bow face. */
    public boolean isHoldingRangedWeapon() {
        return this.getHeldItemMainhand().getItem() instanceof net.minecraft.item.ItemBow;
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (this.world.isRemote) {
            return;
        }
        // R196 :62-81 — the swap cadence. getTicksExistedWithOffset →
        // ticksExisted (C-6 precedent); canSeeTarget(true) → canEntityBeSeen.
        if (this.stowedItemStack != null
                && (this.getHeldItemMainhand().isEmpty() || this.ticksExisted % 10 == 0)) {
            if (this.getHeldItemMainhand().isEmpty()) {
                this.swapHeldItemStackWithStowed();
                ETIMMobEquip.mobLog("guardian swap to=stow-back entity=" + this.getName());
            } else {
                Entity target = this.getAttackTarget();
                if (target != null && this.canEntityBeSeen(target)) {
                    double distance = this.getDistance(target);
                    if (this.isHoldingRangedWeapon()) {
                        if (distance < 5.0) { // :72-74
                            this.swapHeldItemStackWithStowed();
                            ETIMMobEquip.mobLog("guardian swap to=dagger dist="
                                    + Math.round(distance * 100.0D) / 100.0D
                                    + " entity=" + this.getName());
                        }
                    } else if (distance > 6.0) { // :75-77
                        this.swapHeldItemStackWithStowed();
                        ETIMMobEquip.mobLog("guardian swap to=bow dist="
                                + Math.round(distance * 100.0D) / 100.0D
                                + " entity=" + this.getName());
                    }
                }
            }
        }
    }

    // R196 :19-35 — the stowed NBT face.
    @Override
    public void readEntityFromNBT(NBTTagCompound compound) {
        super.readEntityFromNBT(compound);
        if (compound.hasKey("stowed_item_stack")) {
            this.stowedItemStack = new ItemStack(compound.getCompoundTag("stowed_item_stack"));
        } else {
            this.stowedItemStack = null;
        }
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound compound) {
        super.writeEntityToNBT(compound);
        if (this.stowedItemStack != null) {
            NBTTagCompound tag = new NBTTagCompound();
            this.stowedItemStack.writeToNBT(tag);
            compound.setTag("stowed_item_stack", tag);
        }
    }
}
