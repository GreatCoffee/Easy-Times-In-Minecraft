package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMFoodStats;
import io.github.etim.etim.nutrition.NutritionSystem;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemFood;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ActionResult;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumHand;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Task 1.5: the R196 five-arg {@code canIngest} gate replaces vanilla's
 * {@code foodLevel < 20} eat check (R196 paths
 * {@code EntityPlayer.canIngest(item, subtype)} at EntityPlayer.java:1940-1952
 * feeding the five-arg gate :1954-1994; the {@code ItemFood.onItemRightClick}
 * use branch is the 1.12 anchor of the same decision — ITEM:99 {@code
 * playerIn.canEat(this.alwaysEdible)}).
 *
 * <p>The HEAD injection covers the ItemFood family (ItemSoup included) on
 * both sides: the returned FAIL prevents the use animation, not just the
 * apply. Always-edible items (milk bucket stays outside ItemFood in 1.12;
 * enchanted golden apples are vanilla always-edible, same as R196's
 * {@code setAlwaysEdible}) skip the five-arg gate exactly like R196 — the
 * curse sublayer it would normally feed does not exist in ETIM.</p>
 *
 * <p>Items outside the 1.4 registry contribute nothing, so the five-arg rule
 * (a) treats them as freely ingested — vanilla behavior, no gate.</p>
 */
@Mixin(ItemFood.class)
public abstract class MixinItemFood {

    @Shadow
    private boolean alwaysEdible;

    @Inject(
            method = "onItemRightClick(Lnet/minecraft/world/World;Lnet/minecraft/entity/player/EntityPlayer;Lnet/minecraft/util/EnumHand;)Lnet/minecraft/util/ActionResult;",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$ingestGate(World world, EntityPlayer player, EnumHand hand,
                                 CallbackInfoReturnable<ActionResult<ItemStack>> cir) {
        if (!ETIMConfig.foodModel || this.alwaysEdible) {
            return;
        }
        ItemStack stack = player.getHeldItem(hand);
        if (!ETIMFoodStats.canIngest(player, NutritionSystem.getFoodValue(stack))) {
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.FAIL, stack));
        }
    }
}
