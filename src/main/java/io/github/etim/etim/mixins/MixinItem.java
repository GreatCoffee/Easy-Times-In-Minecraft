package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.ingest.ETIMIngestibles;
import io.github.etim.etim.nutrition.NutritionSystem;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.EnumAction;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.stats.StatList;
import net.minecraft.util.ActionResult;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumHand;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Task 2.4: base-{@link Item} plumbing for the R196 block-挂值 foods (sugar,
 * brown/red mushrooms, and the egg's eating half). Vanilla 1.12 leaves these
 * items un-eatable; R196 carries their values in the shared {@code setFoodValue}
 * domain (ingestion audit §2, Block.java:3399-3400) and everything runs the
 * standard 32-tick eat family of values.
 *
 * <p>All four branches quit unless {@code foodModel} is on — then the items
 * revert to plain vanilla identity. The wiring:</p>
 * <ul>
 *   <li>{@code getItemUseAction} / {@code getMaxItemUseDuration} — same as
 *       vanilla {@code ItemFood} (EAT / 32 ticks), so the hold, the eat
 *       sound loop and the finish callback behave identically;</li>
 *   <li>{@code onItemRightClick} — mirrors vanilla
 *       {@code ItemFood.onItemRightClick:99-106}: the five-arg gate
 *       ({@code ETIMFoodStats.canIngest}) decides between {@code setActiveHand}
 *       + SUCCESS and a silent FAIL;</li>
 *   <li>{@code onItemUseFinish} — vanilla {@code ItemFood.onItemUseFinish:67}
 *       {@code stack.shrink(1)}, mirrored (creative mode is restored by
 *       {@code PlayerInteractionManager.processRightClick}); the value
 *       application itself runs in the task-1.5 finish hook ([FoodLog]).</li>
 * </ul>
 *
 * <p>The egg reaches the finish/action/duration injections through this
 * whitelist but not the right-click one — vanilla
 * {@code ItemEgg.onItemRightClick} overrides the base method and the eat/throw
 * fork lives in {@code MixinItemEgg}.</p>
 */
@Mixin(Item.class)
public abstract class MixinItem {

    @Inject(
            method = "getItemUseAction(Lnet/minecraft/item/ItemStack;)Lnet/minecraft/item/EnumAction;",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$useAction(ItemStack stack, CallbackInfoReturnable<EnumAction> cir) {
        if (ETIMConfig.foodModel && ETIMIngestibles.isIngestible(stack)) {
            cir.setReturnValue(EnumAction.EAT);
        }
    }

    @Inject(
            method = "getMaxItemUseDuration(Lnet/minecraft/item/ItemStack;)I",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$useDuration(ItemStack stack, CallbackInfoReturnable<Integer> cir) {
        if (ETIMConfig.foodModel && ETIMIngestibles.isIngestible(stack)) {
            cir.setReturnValue(ETIMConfig.ingestUseDurationTicks);
        }
    }

    @Inject(
            method = "onItemRightClick(Lnet/minecraft/world/World;Lnet/minecraft/entity/player/EntityPlayer;Lnet/minecraft/util/EnumHand;)Lnet/minecraft/util/ActionResult;",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$startEating(World world, EntityPlayer player, EnumHand hand,
                                  CallbackInfoReturnable<ActionResult<ItemStack>> cir) {
        ItemStack stack = player.getHeldItem(hand);
        if (!ETIMConfig.foodModel || !ETIMIngestibles.isIngestible(stack)) {
            return;
        }
        String item = ETIMIngestibles.itemKey(stack);
        if (ETIMIngestibles.tryStartEating(player, hand, stack, item)) {
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.SUCCESS, stack));
        } else {
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.FAIL, stack));
        }
    }

    @Inject(
            method = "onItemUseFinish(Lnet/minecraft/item/ItemStack;Lnet/minecraft/world/World;Lnet/minecraft/entity/EntityLivingBase;)Lnet/minecraft/item/ItemStack;",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$finishShrink(ItemStack stack, World world, EntityLivingBase entityLiving,
                                   CallbackInfoReturnable<ItemStack> cir) {
        if (!ETIMConfig.foodModel || !ETIMIngestibles.isIngestible(stack)
                || !(entityLiving instanceof EntityPlayer)) {
            return;
        }
        // Vanilla ItemFood: shrink at finish (PlayerInteractionManager restores the
        // count in creative); R196 additionally tracks the object-use stat.
        stack.shrink(1);
        ((EntityPlayer) entityLiving).addStat(StatList.getObjectUseStats(stack.getItem()));
        cir.setReturnValue(stack);
    }
    // The batch-3 quality durability write-through lives in
    // {@link MixinItemStack#getMaxDamage} — the forge-patch overload
    // Item.getMaxDamage(ItemStack) has no MCP-stable obf mapping, so the
    // ItemStack gate is the port spot (see that class's javadoc).
}
