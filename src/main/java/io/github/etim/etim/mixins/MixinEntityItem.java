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
}
