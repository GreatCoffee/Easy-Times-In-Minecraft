package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMAnvilRepair;
import io.github.etim.etim.metal.ETIMContainerRepairDuck;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.ContainerRepair;
import net.minecraft.inventory.IInventory;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * 批三修理面（砧修链）— the R196 repair takeover over the vanilla 1.12
 * anvil container (终审 B-1 定谳: HEAD @Inject(cancellable) + the state gate —
 * the takeover runs ONLY when slot 0 is ETIM gear AND an R196 repair context
 * exists; every other flow (vanilla tools, book enchanting, renaming,
 * disenchanting) falls through to the vanilla method, whose combination
 * branch (:221-228 +12% bonus) would otherwise eat ETIM-gear combos).
 *
 * <p>Takeover faces (批文 §一, R196 行位见 {@link ETIMAnvilRepair}):</p>
 * <ul>
 *   <li>fail 1/2 → empty output + maximumCost 0 (the vanilla canTakeStack
 *       gate then refuses the take) + a [CraftingLog] judgment row on the
 *       state transition (C-SK-9 dedup face);</li>
 *   <li>consumable/combination → the computed output + maximumCost 0
 *       (T1①: onTake's addExperienceLevel(-0) is a no-op — no XP anywhere)
 *       + materialCost = the nugget count (the vanilla onTake :92-105
 *       shrink face consumes them verbatim; the combination path leaves 0
 *       and the vanilla :106-109 else clears slot 2 — the R196 INNER2
 *       :70-72 face).</li>
 * </ul>
 *
 * <p>The rename overlay (终审补-2, R196 :257-263) is intentionally NOT
 * ported: a rename typed alongside a repair falls through to the vanilla
 * rename face because the ETIM plan treats name+repair as TWO separate
 * recomputes — the vanilla method keeps the repair+rename conjunction for
 * vanilla semantics; ETIM gear renames stay vanilla-costed. 登记不阻塞.</p>
 */
@Mixin(ContainerRepair.class)
public abstract class MixinContainerRepair implements ETIMContainerRepairDuck {

    @Unique
    private boolean etim$takeover;

    @Unique
    private int etim$failState;

    @Unique
    private int etim$lastKind;

    @Unique
    private int etim$loggedFail;

    @Unique
    @Override
    public boolean etimIsTakeover() {
        return this.etim$takeover;
    }

    @Unique
    @Override
    public int etimFailState() {
        return this.etim$failState;
    }

    @Unique
    @Override
    public int etimLastKind() {
        return this.etim$lastKind;
    }

    /**
     * 金属砧块批 — the keep-open face. Vanilla 1.12's canInteractWith is
     * {@code getBlockState(pos).getBlock() != Blocks.ANVIL → false} — an ETIM
     * anvil INSTANCE fails that test and the container is force-closed one
     * tick after opening (the probe: OPEN-WINDOW → CLOSE-WINDOW within 1 ms,
     * every click then dies on the dead windowId). Any BlockAnvil instance
     * keeps the container; the 64.0² distance face is re-run verbatim
     * (vanilla vanilla-anvil behavior untouched: cir true → no-op).
     */
    @Inject(method = "canInteractWith", at = @At("RETURN"), cancellable = true)
    private void etim$keepAnvilContainerOpen(EntityPlayer player, CallbackInfoReturnable<Boolean> cir) {
        if (cir.getReturnValueZ()) {
            return; // vanilla pass (the vanilla iron anvil) — untouched
        }
        ContainerRepairAccessor acc = (ContainerRepairAccessor) (Object) this;
        net.minecraft.block.state.IBlockState state = acc.etim$getWorld().getBlockState(acc.etimGetPos());
        if (state.getBlock() instanceof net.minecraft.block.BlockAnvil) {
            net.minecraft.util.math.BlockPos pos = acc.etimGetPos();
            cir.setReturnValue(player.getDistanceSq(
                    pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D) <= 64.0D);
        }
    }

    @Inject(method = "updateRepairOutput", at = @At("HEAD"), cancellable = true)
    private void etim$anvilRepairTakeover(CallbackInfo ci) {
        if (!ETIMConfig.metalAnvilRepair) {
            return;
        }
        ContainerRepair self = (ContainerRepair) (Object) this;
        ContainerRepairAccessor acc = (ContainerRepairAccessor) this;
        this.etim$takeover = false;
        this.etim$failState = 0;
        this.etim$lastKind = 0;

        IInventory input = acc.etim$getInputSlots();
        ItemStack first = input.getStackInSlot(0);
        EntityPlayer player = acc.etim$getPlayer();
        float anvilDurability = ETIMAnvilRepair.anvilMetalDurability(acc.etim$getWorld(), acc.etimGetPos());
        ETIMAnvilRepair.Plan plan = ETIMAnvilRepair.plan(
                player, first, input.getStackInSlot(1), anvilDurability);
        if (plan.kind == ETIMAnvilRepair.Kind.NONE) {
            return; // not a repair context — the vanilla flow untouched (T4①)
        }
        ci.cancel();

        this.etim$takeover = true;
        this.etim$failState = plan.fail;
        this.etim$lastKind = plan.kind.ordinal();
        if (plan.kind == ETIMAnvilRepair.Kind.FAIL && !acc.etim$getWorld().isRemote
                && plan.fail != this.etim$loggedFail) {
            this.etim$loggedFail = plan.fail;
            ETIM.LOGGER.info("[CraftingLog] " + player.getName() + " (" + player.getEntityId()
                    + ") repair fail: reason=" + (plan.fail == 2
                            ? String.format("needsHarderAnvil (material=%.1f > anvil=%.1f)",
                                    plan.failMaterial, plan.failAnvil)
                            : "insufficientSkill (quality over budget)")
                    + " tool=" + first.getItem().getRegistryName() + " [server]");
        }

        acc.etim$getOutputSlot().setInventorySlotContents(0, plan.output);
        self.maximumCost = 0; // T1① + the fail-refusal face in one (R196 has no XP face)
        self.materialCost = plan.nuggetsUsed;
    }
}
