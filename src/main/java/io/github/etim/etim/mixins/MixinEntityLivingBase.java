package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMContainedItemsDuck;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import io.github.etim.etim.mob.ETIMMassiveFallDuck;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.entity.passive.EntityChicken;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.DamageSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.ArrayList;
import java.util.List;

/**
 * B-10 batch 2 (audit20 条 303) — F-3, the jump feather face (R196
 * {@code EntityChicken.jump :185-191}: after the super body, !child +
 * 1-in-40 + not-in-water → {@code tryDropFeather(true)}, the
 * retain-at-least-one arm whose meter needs 2+ to shed one). 1.12 declares
 * {@code jump()} on EntityLivingBase (:2006), so the injection lives here
 * behind an instanceof chicken gate — unrelated living entities pay a single
 * failed instanceof per jump; with {@code livestockProductionR196} off the
 * vanilla body stands untouched.
 */
@Mixin(EntityLivingBase.class)
public abstract class MixinEntityLivingBase implements ETIMMassiveFallDuck, ETIMContainedItemsDuck {

    @Inject(method = "jump", at = @At("TAIL"))
    private void etim$chickenJumpFeather(CallbackInfo ci) {
        if (ETIMConfig.livestockProductionR196 && (Object) this instanceof EntityChicken) {
            ETIMLivestockEvents.jumpFeather((EntityChicken) (Object) this);
        }
    }

    /**
     * B-38 drop-face pack — the R196 massive-fall flag (R196
     * {@code EntityLivingBase :74 public boolean has_taken_massive_fall_damage};
     * the setter :1130-1133 {@code damage >= maxHealth * 0.5} at the fall
     * face). The 1.12 carrier = {@code EntityLivingBase.fall(float,float)
     * :1451-1476}: the redirect sits on the
     * {@code attackEntityFrom(DamageSource.FALL, i)} call (:1464), where
     * {@code i} is the computed fall damage — the R196 5-damage clamp
     * (:1125-1127) is an R196 world-balance face and is not transposed
     * (摸底 §3-C3), so the criterion stays {@code i >= maxHealth * 0.5}.
     */
    @Unique
    private boolean etim$hasTakenMassiveFallDamageValue;

    @Override
    public boolean etim$hasTakenMassiveFallDamage() {
        return this.etim$hasTakenMassiveFallDamageValue;
    }

    @Override
    public void etim$setHasTakenMassiveFallDamage(boolean value) {
        this.etim$hasTakenMassiveFallDamageValue = value;
    }

    @Redirect(
            method = "fall(FF)V",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/EntityLivingBase;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z"))
    private boolean etim$massiveFallFlag(EntityLivingBase self, DamageSource source, float amount) {
        if (!self.world.isRemote && source == DamageSource.FALL
                && amount >= self.getMaxHealth() * 0.5F) {
            this.etim$hasTakenMassiveFallDamageValue = true;
        }
        return self.attackEntityFrom(source, amount);
    }

    /**
     * B-66 census F :85 — R196 fall formula
     * ({@code EntityLivingBase.java:1010-1109}): 2.5-block safe height,
     * doubled damage, then the resting block's cushioning. The vanilla body is
     * cancelled so only one damage packet is produced.
     */
    @Inject(method = "fall(FF)V", at = @At("HEAD"), cancellable = true)
    private void etim$r196Fall(float distance, float damageMultiplier, CallbackInfo ci) {
        if (!ETIMConfig.blockR196Face) {
            return;
        }
        EntityLivingBase self = (EntityLivingBase) (Object) this;
        if (self.world.isRemote) {
            return;
        }
        io.github.etim.etim.world.ETIMFall.apply(self, distance, damageMultiplier, this);
        ci.cancel();
    }

    // ---- B-53 census D :141 — R196 contained_items carrier ----

    @Unique
    private final List<Integer> etim$containedItemsValue = new ArrayList<Integer>();

    @Override
    public List<Integer> etim$getContainedItems() {
        return this.etim$containedItemsValue;
    }

    @Override
    public void etim$addContainedItem(int itemId) {
        this.etim$containedItemsValue.add(itemId);
    }

    @Override
    public void etim$dropContainedItems() {
        EntityLivingBase self = (EntityLivingBase) (Object) this;
        if (this.etim$containedItemsValue.isEmpty()) {
            return;
        }
        for (Integer id : new ArrayList<Integer>(this.etim$containedItemsValue)) {
            Item item = Item.getItemById(id);
            if (item != null) {
                self.entityDropItem(new ItemStack(item), 0.0F);
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[DropLog] contained item=" + String.valueOf(item.getRegistryName())
                            + " entity=" + self.getClass().getSimpleName() + "#" + self.getEntityId());
                }
            }
        }
        this.etim$containedItemsValue.clear();
    }

    @Inject(method = "writeEntityToNBT", at = @At("TAIL"))
    private void etim$writeContainedItems(NBTTagCompound compound, CallbackInfo ci) {
        if (this.etim$containedItemsValue.isEmpty()) {
            return;
        }
        StringBuilder builder = new StringBuilder(); // R196 :412 |id|id
        for (Integer id : this.etim$containedItemsValue) {
            builder.append('|').append(id);
        }
        compound.setString("ETIMContainedItems", builder.toString());
    }

    @Inject(method = "readEntityFromNBT", at = @At("TAIL"))
    private void etim$readContainedItems(NBTTagCompound compound, CallbackInfo ci) {
        this.etim$containedItemsValue.clear();
        String raw = compound.getString("ETIMContainedItems"); // R196 :455
        if (raw.isEmpty()) {
            return;
        }
        for (String part : raw.split("\\|")) {
            if (part.isEmpty()) {
                continue;
            }
            try {
                this.etim$containedItemsValue.add(Integer.parseInt(part));
            } catch (NumberFormatException ignored) {
                // malformed NBT entry: drop it, same as R196's parser tolerance
            }
        }
    }

    /**
     * R196 :914 drops one item per contained id inside onDeath, gated by
     * child/loot and the massive-fall 10% roll. The 1.12 onDeath TAIL runs
     * after dropLoot (few/equipment), so only the ordering differs (C).
     */
    @Inject(method = "onDeath", at = @At("TAIL"))
    private void etim$dropContainedItemsOnDeath(DamageSource cause, CallbackInfo ci) {
        EntityLivingBase self = (EntityLivingBase) (Object) this;
        if (self.world.isRemote || self.isChild()
                || !self.world.getGameRules().getBoolean("doMobLoot")) {
            return;
        }
        if (((ETIMMassiveFallDuck) self).etim$hasTakenMassiveFallDamage()
                && self.getRNG().nextFloat() >= 0.1F) {
            return;
        }
        this.etim$dropContainedItems();
    }
}
