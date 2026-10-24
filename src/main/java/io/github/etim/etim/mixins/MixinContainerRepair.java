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
        ETIMAnvilRepair.Plan plan = ETIMAnvilRepair.plan(
                player, first, input.getStackInSlot(1));
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
                            ? "needsHarderAnvil (material durability > iron 8.0)"
                            : "insufficientSkill (quality over budget)")
                    + " tool=" + first.getItem().getRegistryName() + " [server]");
        }

        acc.etim$getOutputSlot().setInventorySlotContents(0, plan.output);
        self.maximumCost = 0; // T1① + the fail-refusal face in one (R196 has no XP face)
        self.materialCost = plan.nuggetsUsed;
    }
}
