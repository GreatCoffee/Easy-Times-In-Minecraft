package io.github.etim.etim.mixins;

import io.github.etim.etim.farm.ETIMItemManure;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Manure-source batch (B-7 face M1-4): R196 {@code EntityItem} zeroes the
 * ground-scatter motion when the stack IS manure ({@code EntityItem.java:27-29
 * motionX = motionY = motionZ = 0.0}) — dropped dung lands exactly where the
 * animal stood. The 1.12 stack ctor delegates to the three-pos ctor which
 * applies the random kick first, so TAIL is the same point in the R196 order.
 */
@Mixin(EntityItem.class)
public abstract class MixinEntityItem {

    @Inject(
            method = "<init>(Lnet/minecraft/world/World;DDDLnet/minecraft/item/ItemStack;)V",
            at = @At("TAIL")
    )
    private void etim$manureNoScatter(World world, double x, double y, double z,
                                      net.minecraft.item.ItemStack stack, CallbackInfo ci) {
        if (!stack.isEmpty() && stack.getItem() == ETIMItemManure.item()) {
            net.minecraft.entity.Entity self = (net.minecraft.entity.Entity) (Object) this;
            self.motionX = 0.0D;
            self.motionY = 0.0D;
            self.motionZ = 0.0D;
        }
    }

    /**
     * B-64 census F :149 — R196 {@code EntityItem.java:119-133} rolls the
     * snow/ice melt chance every server tick on the dropped stack. TAIL is
     * after 1.12's own age/despawn handling for this tick.
     */
    @Inject(method = "onUpdate", at = @At("TAIL"))
    private void etim$meltTick(CallbackInfo ci) {
        io.github.etim.etim.item.ETIMItemMelt.tickDropped((EntityItem) (Object) this);
        io.github.etim.etim.item.ETIMItemMaterialEvents.tickDropped((EntityItem) (Object) this);
    }

    /**
     * B-65 census F :151/:154 — the R196 dropped-item destruction faces
     * ({@code ItemFood.getItemProducedWhenDestroyed} and
     * {@code ItemVessel.getItemProducedWhenDestroyed}).
     *
     * <p>Fire damage on a cookable raw food swaps the dropped stack for its
     * furnace result (R196 {@code cooked_item}); a wooden vessel is consumed
     * by fire (R196 returns null for harmed materials), while any other
     * destroy source leaves the EMPTY vessel behind. The face runs at
     * {@code attackEntityFrom} HEAD and cancels, so the vanilla "poof" never
     * fires when the R196 replacement is produced.</p>
     */
    @Inject(method = "attackEntityFrom", at = @At("HEAD"), cancellable = true)
    private void etim$destroyedRemainder(net.minecraft.util.DamageSource source, float amount,
                                         org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable<Boolean> cir) {
        if (!io.github.etim.etim.ETIMConfig.foodR196Extra) {
            return;
        }
        EntityItem self = (EntityItem) (Object) this;
        net.minecraft.item.ItemStack stack = self.getItem();
        if (stack.isEmpty()) {
            return;
        }
        if (source.isFireDamage()) {
            net.minecraft.item.ItemStack cooked = net.minecraft.item.crafting.FurnaceRecipes.instance()
                    .getSmeltingResult(stack);
            if (!cooked.isEmpty() && cooked.getItem() != stack.getItem()) {
                net.minecraft.item.ItemStack out = cooked.copy();
                out.setCount(stack.getCount());
                self.setItem(out);
                io.github.etim.etim.item.ETIMVesselEvents.row("firecook raw="
                        + stack.getItem().getRegistryName() + " cooked="
                        + cooked.getItem().getRegistryName() + " count=" + stack.getCount());
                cir.setReturnValue(false);
            }
            return;
        }
        if (stack.getItem() instanceof io.github.etim.etim.item.ETIMItemVessel) {
            io.github.etim.etim.item.ETIMItemVessel vessel =
                    (io.github.etim.etim.item.ETIMItemVessel) stack.getItem();
            net.minecraft.item.Item empty = vessel.getEmptyVessel();
            if (empty != null) {
                self.setItem(new net.minecraft.item.ItemStack(empty, stack.getCount()));
                io.github.etim.etim.item.ETIMVesselEvents.row("vesselremain item="
                        + stack.getItem().getRegistryName() + " left=" + empty.getRegistryName());
                cir.setReturnValue(false);
            }
        }
    }
}
