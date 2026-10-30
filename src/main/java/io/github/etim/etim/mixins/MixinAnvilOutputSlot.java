package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMAnvilRepair;
import io.github.etim.etim.metal.ETIMContainerRepairDuck;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.Slot;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
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
 *
 * <p>工装便利批件 2 (anvilench, audit20 items 96-B-1/127/133): the judge
 * channel {@code [EnchantLog] anvil-combine}. 摸底 (a)/(b) 双腿否决 → (c):
 * the take face only. The vanilla take paths drain the output slot BEFORE
 * {@code onTake} receives its {@code stack} argument (1.12 Container.java
 * :313-321 PICKUP decr first; ContainerRepair :444-479 QUICK_MOVE merges the
 * drained stack away, ≥ :465-467 clear → :479 passes the empty reference),
 * so {@code etim$offered} snapshots the result slot at the first
 * {@code canTakeStack} call (终审核②: every onTake face consults
 * canTakeStack first — PICKUP :302 / QUICK_MOVE :259 / PICKUP_ALL :468 /
 * THROW :445; the不成交 SWAP residue dies on isItemValid≡false). The client
 * runs onTake locally before the packet (PlayerControllerMP :609-611,
 * javap func_187098_a) → the {@code world.isRemote} early-out is REQUIRED,
 * not a safety net. No row-level dedup by design (one take = one judged
 * transaction); rows: 注-2 order = face=ench rows then the face=tx row.</p>
 */
@Mixin(targets = "net.minecraft.inventory.ContainerRepair$2")
public abstract class MixinAnvilOutputSlot {

    /** The drained-output snapshot: what the slot offered when take was first consultable. */
    @Unique
    private ItemStack etim$offered;

    @Inject(method = "canTakeStack", at = @At("HEAD"), cancellable = true)
    private void etim$bypassCostGate(EntityPlayer player, CallbackInfoReturnable<Boolean> cir) {
        ItemStack offeredNow = ((Slot) (Object) this).getStack();
        if (offeredNow != null && !offeredNow.isEmpty()) {
            this.etim$offered = offeredNow.copy();
        }
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

    @Inject(method = "onTake", at = @At("HEAD"))
    private void etim$logTake(EntityPlayer player, ItemStack stack, CallbackInfoReturnable<ItemStack> cir) {
        if (player == null || player.world == null || player.world.isRemote) {
            return; // PlayerControllerMP:609-611 — the face that judges is the server's
        }
        if (!ETIMConfig.anvilDebugLog) {
            return;
        }
        ItemStack result = (stack == null || stack.isEmpty()) ? this.etim$offered : stack;
        if (result == null || result.isEmpty()) {
            return; // QUICK_MOVE non-absorbed no-transaction (:474-477 → EMPTY, no onTake)
        }
        ETIMAnvilRepair.logAnvilCombine(player, result);
    }
}
