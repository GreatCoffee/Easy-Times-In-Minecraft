package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMContainerRepairDuck;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.Slot;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * 批三修理面（砧修链）— the vanilla anvil output slot's take gate bypassed
 * for the ETIM takeover (终审 A-1 定谳, A 级·功能性): {@code canTakeStack}
 * hard-requires {@code maximumCost > 0} AND the XP-adequacy face — both
 * incompatible with T1① (0 级经验). The takeover's output (an ETIM-gear
 * repair result while {@code etimIsTakeover()}) takes unconditionally.
 *
 * <p>The container instance comes from {@code player.openContainer} — the
 * click path guarantees it IS this slot's container; the synthetic outer
 * {@code this$0} field would need a shadow (the 1.12 Slot carries no
 * container backlink at all) for zero marginal benefit.</p>
 */
@Mixin(targets = "net.minecraft.inventory.ContainerRepair$2")
public abstract class MixinAnvilOutputSlot {

    @Inject(method = "canTakeStack", at = @At("HEAD"), cancellable = true)
    private void etim$bypassCostGate(EntityPlayer player, CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.metalAnvilRepair || player == null || player.openContainer == null) {
            return;
        }
        if (!(player.openContainer instanceof ETIMContainerRepairDuck)) {
            return;
        }
        ETIMContainerRepairDuck duck = (ETIMContainerRepairDuck) player.openContainer;
        if (duck.etimIsTakeover() && !((Slot) (Object) this).getStack().isEmpty()) {
            cir.setReturnValue(true);
        }
    }
}
