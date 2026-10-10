package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.ingest.ETIMIngestibles;
import io.github.etim.etim.nutrition.NutritionSystem;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemEgg;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ActionResult;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumHand;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Task 2.4: the egg 88 fork (R196 audit §1.2 — {@code ItemEgg} semantics are
 * vanilla-INVERTED: {@code hasIngestionPriority = !ctrl} means the default
 * right-click EATS the egg (1 satiation / 3 nutrition / protein,
 * {@code MITEConstant.egg_has_essential_fats = false}) and ctrl+right-click
 * throws it).
 *
 * <p>Segment map (R196 {@code EntityPlayer.onPlayerRightClick:2562-2579}):
 * ctrl held → the throw branch is not touched, vanilla's own throw (sound,
 * {@code EntityEgg}, stack shrink outside creative — same cost as R196's
 * {@code convertOneOfHeldItem(null)}) runs as segment 2; otherwise the eating
 * segment 1 intercepts with the same start branch as vanilla ItemFood
 * (gate → {@code setActiveHand} + SUCCESS, silent FAIL elsewhere) and the eat
 * completion runs through the shared 32-tick family (shrink in
 * {@code MixinItem}Finish, values in the [FoodLog] finish hook).</p>
 */
@Mixin(ItemEgg.class)
public abstract class MixinItemEgg {

    @Inject(
            method = "onItemRightClick(Lnet/minecraft/world/World;Lnet/minecraft/entity/player/EntityPlayer;Lnet/minecraft/util/EnumHand;)Lnet/minecraft/util/ActionResult;",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$eatOrThrowFork(World world, EntityPlayer player, EnumHand hand,
                                     CallbackInfoReturnable<ActionResult<ItemStack>> cir) {
        if (!ETIMConfig.foodModel) {
            return;
        }
        ItemStack stack = player.getHeldItem(hand);
        String item = ETIMIngestibles.itemKey(stack);
        if (ETIMIngestibles.isCtrlHeld(player)) {
            // R196 segment 2: vanilla's throw keeps the whole branch
            ETIMIngestibles.logIngest(player, item + " ctrl held → throw (vanilla path)");
            return;
        }
        if (ETIMIngestibles.tryStartEating(player, hand, stack, item)) {
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.SUCCESS, stack));
        } else {
            cir.setReturnValue(new ActionResult<ItemStack>(EnumActionResult.FAIL, stack));
        }
    }
}
