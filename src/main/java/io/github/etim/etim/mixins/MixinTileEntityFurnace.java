package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.furnace.FurnaceHeat;
import io.github.etim.etim.metal.ETIMFurnaceGate;
import net.minecraft.block.material.Material;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.tileentity.TileEntityFurnace;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.NonNullList;
import net.minecraft.util.math.BlockPos;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.Objects;

/**
 * Stage 4 batch A: the R196 heat gate inside the vanilla furnace's smelt
 * decision (9B §2.2/§2.3 — {@code isBurning && canSmelt(getfield
 * heat_level)}; the denial clears the progress rather than pausing it,
 * vanilla {@code cookTime = 0} else-branch already handles that — same
 * semantics, audit PASS).
 *
 * <p>The vanilla furnace has no heat_level field of its own; batch A derives
 * the CURRENT heat from the fuel stack that the vanilla burner loop already
 * consumes (the R196 same-tick value: {@code getFuelHeatLevel(:1231-1238) ==
 * fuel.getHeatLevel()}), and the required heat from the audit's query layer
 * (§2.4). A burn of heat &lt; required keeps the furnace "not smeltable",
 * exactly R196's {@code getSmeltingResult联通 null} outcome (9B §3.3 — the
 * clay-oven case behaves the same way: a static null, NEVER a derating).</p>
 *
 * <p>Judgment channel: [FurnaceLog] line on every DENY signature change (per
 * input/fuel pair, not per tick — hopper/GUI loops stay quiet). AGENTS.md
 * rule 9: the log is the verdict; the empty output slot needs no user
 * eyeball.</p>
 */
@Mixin(TileEntityFurnace.class)
public abstract class MixinTileEntityFurnace {

    @Shadow
    public NonNullList<ItemStack> furnaceItemStacks;

    /**
     * Vanilla burn timer used only to tell "mid-burn" from "cold": during a
     * burn the fuel slot is EMPTY (vanilla consumes the item at ignition),
     * so the live-stack heat reads 0 and the smelting progress collapses —
     * the 11:2x D4 round's sand+coal / clay+coal / iron+coal failure. R196
     * instead keeps a dedicated heat_level field that is cast at ignition
     * and zeroed at burnout (audit 9B §三.2: TileEntityFurnace.java:159-192).
     * We mirror exactly that: this field is cast while cold (potential heat
     * of the waiting fuel stack) and is the decisive heat while burning.
     */
    @Shadow
    private int furnaceBurnTime;

    @Shadow
    private int cookTime;

    @Unique
    private int etim$heatLevel = 0;

    @Unique
    private String etim$lastDenySig = "";

    /**
     * Separate signature channel for the INPUT-slot admission denial: the
     * smelt-blocked deny (heatGate) and the input no-recipe deny HOP at
     * different cadences; sharing one sig field made them clobber each
     * other's signatures and re-log the storm (the run26 11:57 round's
     * alternating deny spam).
     */
    @Unique
    private String etim$lastInputDenySig = "";

    @Unique
    private String etim$lastAdmitSig = "";

    @Unique
    private String etim$lastSmeltSig = "";

    @Unique
    private static String etim$sig(ItemStack input, int heat) {
        return (input.isEmpty() ? "-" : input.getItem().getRegistryName().toString() + "#" + input.getCount())
                + "@" + heat;
    }

    /**
     * G1/G2 judgment channel: ONE [FurnaceLog] line per (item,burnScale)
     * signature recording the FINAL tick count vanilla hands the furnace
     * after our R196 override (run26 G round user asked this be log-judged,
     * not stopwatch-judged). The (r196)/(vanilla) tag names the source so
     * the G5 反测 (furnaceBurnTimeR196=false) reads straight off the log.
     * Signature storage is PER ITEM: while burn-hour faces consult
     * isItemFuel every tick for alternating stacks (log furnace + bucket
     * furnace side by side, 14:07 storm — 120+ rows/s), a single last-sig
     * slot gets clobbered by the alternation and logs every row.
     */
    @Unique
    private static final java.util.Map<String, String> etim$lastBurnSigs = new java.util.HashMap<>();

    @Unique
    private static void etim$logBurn(ItemStack stack, int finalBurn, boolean r196) {
        if (!ETIMConfig.furnaceDebugLog) {
            return;
        }
        String item = stack.getItem().getRegistryName().toString();
        boolean server = Thread.currentThread().getName().contains("Server");
        // Slot key MUST include the END (server/client): both ends consult the
        // same item every tick while lit (14:15:44 round, 14 ticks per side)
        // and their ALTERNATING dots would clobber a single-slot-per-item
        // map, defeating the dedup a second time. One line per (item×end).
        String sig = finalBurn + "/" + (r196 ? "r196" : "vanilla");
        String key = item + "@" + (server ? "s" : "c");
        if (sig.equals(etim$lastBurnSigs.get(key))) {
            return;
        }
        etim$lastBurnSigs.put(key, sig);
        ETIM.LOGGER.info("[FurnaceLog] fuel burn=" + finalBurn + " item=" + item
                + (r196 ? " (r196)" : " (vanilla)")
                + (server ? " [server]" : " [client]"));
    }

    /**
     * Batch-B prelude: the R196 fuel burn durations (audit 9 §2.2) replace
     * the vanilla values where they differ — the heats are the same ladder,
     * only calories change (logs 1600 vs vanilla 300, lava bucket 3200 vs
     * 20000, coal block 16000 vs 80000, torch 800 vs 400, planks 400 vs
     * 300). Returns null → leave the vanilla value untouched. config
     * {@code furnaceBurnTimeR196} gates it.
     */
    @Inject(
            method = "getItemBurnTime",
            at = @At("RETURN"),
            cancellable = true,
            remap = true
    )
    private static void etim$r196BurnTime(ItemStack stack, CallbackInfoReturnable<Integer> cir) {
        if (stack.isEmpty()) {
            return;
        }
        Integer r196 = null;
        if (ETIMConfig.furnaceBurnTimeR196 && FurnaceHeat.isEnabled()) {
            r196 = FurnaceHeat.getR196BurnTime(stack);
            if (r196 != null) {
                cir.setReturnValue(r196);
            }
        }
        etim$logBurn(stack, cir.getReturnValueI(), r196 != null);
    }

    /**
     * The R196 unified live heat (audit 9B §三.2 — 巡的两路语义）：
     * cold furnace (burnTime == 0) reads the waiting fuel stack's potential
     * heat (并把它铸成下一次点燃的 heat_level)；mid-burn reads the recorded
     * heat_level so the empty fuel slot cannot collapse it to 0.
     */
    @Unique
    private int etim$currentHeat() {
        ItemStack fuel = this.furnaceItemStacks.get(1);
        int potential = FurnaceHeat.getHeatOf(fuel);
        if (this.furnaceBurnTime > 0) {
            return this.etim$heatLevel;
        }
        if (potential > 0) {
            this.etim$heatLevel = potential;
        }
        return potential;
    }

    /**
     * The R196 furnace can never exceed its tier cap: fuel admission refuses
     * hotter items (9B §三.1/§三.2, SlotFuel heat &lt;= maxHeatLevel). The
     * run26 11:5x rounds proved a bypassed hopper writer DOES land such fuel
     * (lava bucket heat=3 inside a cap-2 cobble furnace, smelt admit logged
     * heat=3 — a tier unlock the run26 test book forbids). While the writer
     * itself is still being hunted, the BEHAVIOR layer clamps the decisive
     * heat to the fleet cap so a misplaced fuel can never demote/upset the
     * furnace's tier — exactly what R196's admission layer would net out.
     * Batch B1: the cap reads PER FURNACE (ETIM tier block → tier cap,
     * vanilla furnace → the config cobble cap).
     */
    @Unique
    private int etim$decisiveHeat(int heat) {
        return Math.min(heat, FurnaceHeat.getCapFor((TileEntityFurnace) (Object) this));
    }
    @Inject(
            method = "canSmelt",
            at = @At("HEAD"),
            cancellable = true,
            remap = true
    )
    private void etim$heatGate(CallbackInfoReturnable<Boolean> cir) {        if (!ETIMConfig.furnaceHeatSystem || !FurnaceHeat.isEnabled()) {
            return;
        }
        // TileEntityFurnace.furnaceItemStacks index order (vanilla container
        // layout): 0=input, 1=fuel, 2=output.
        ItemStack input = this.furnaceItemStacks.get(0);
        // 批文项4 — the canSmelt layer of the large-item triple gate: the clay
        // tier refuses a large-item INPUT regardless of heat (the R196
        // canSmelt :273 face; slot/isItemValidForSlot are the other two).
        if (!input.isEmpty()
                && !FurnaceHeat.acceptsLargeItems((TileEntityFurnace) (Object) this)
                && ETIMFurnaceGate.isLargeItem(input)) {
            String sig = etim$sig(input, -1);
            if (!Objects.equals(sig, this.etim$lastDenySig) && ETIMConfig.furnaceDebugLog) {
                this.etim$lastDenySig = sig;
                ETIM.LOGGER.info("[FurnaceLog] smelt blocked large-item furnace="
                        + FurnaceHeat.getNameFor((TileEntityFurnace) (Object) this)
                        + " input=" + input.getItem().getRegistryName().toString()
                        + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
            }
            cir.setReturnValue(false);
            return;
        }
        int heat = etim$decisiveHeat(etim$currentHeat());
        int required = FurnaceHeat.getRequiredHeat(input);
        ItemStack result = FurnaceHeat.getSmeltingResult(input, heat);
        // ❗F-8-14（audit20-08 R1）：产物槽对位——glass 面按 heat 切产物（sandstone/glass
        // 结果不同）时 output 槽不兼容 ⇒ 卡住不熔（R196 canSmelt 尾部同构），4 沙错配不再被销毁。
        ItemStack out = this.furnaceItemStacks.get(2);
        boolean outOk = out.isEmpty()
                || (out.getItem() == result.getItem() && out.getMetadata() == result.getMetadata()
                        && out.getCount() + result.getCount() <= Math.min(64, out.getMaxStackSize())); // TileEntityFurnace.getInventoryStackLimit = 64（protected，mixin 不可见——1.12 恒 64）
        if (heat >= required
                && !result.isEmpty()
                && outOk) {
            // PASS probe (signature-gated): D3-round's iron+coal showed NO
            // blocked row yet still made no progress — an admit line for
            // every (input,fuel) pair makes the cook loop's gate state
            // provable from the log (AGENTS rule 9).
            String admitSig = etim$sig(input, heat);
            if (!Objects.equals(admitSig, this.etim$lastSmeltSig)
                    && ETIMConfig.furnaceDebugLog) {
                this.etim$lastSmeltSig = admitSig;
                ETIM.LOGGER.info("[FurnaceLog] smelt admit heat=" + heat
                        + " required=" + required
                        + " input=" + input.getItem().getRegistryName().toString()
                        + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
            }
            return;
        }
        // Signature-gated log: one [FurnaceLog] line per (input,heat) hole.
        // The empty-input rot rows (11:11:00 round's heat=1 required=0
        // input=empty noise) are skipped — vanilla canSmelt is already false
        // with no input, the line carried no judgment value.
        if (!input.isEmpty()) {
            String sig = etim$sig(input, heat);
            if (!Objects.equals(sig, this.etim$lastDenySig) && ETIMConfig.furnaceDebugLog) {
                this.etim$lastDenySig = sig;
                ETIM.LOGGER.info("[FurnaceLog] smelt blocked heat=" + heat + " required=" + required
                        + " input=" + input.getItem().getRegistryName().toString()
                        + " furnace=" + FurnaceHeat.getNameFor((TileEntityFurnace) (Object) this)
                        + " result=" + (heat >= required ? (result.isEmpty() ? "null (sand<4 or unknown)" : "output-slot-blocked") : "heat-gated")
                        + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
            }
        }
        cir.setReturnValue(false);
    }

    /**
     * R196 smeltItem(int heat) / decompile TileEntityFurnace:296-331 — the
     * smelt act as a whole replaces the vanilla body (vanilla is a plain
     * 1-out-1-consume; R196 adds the 4-sand consumption, the heat-based
     * sandstone/glass choice and the clay→brick bonus conversion). The live
     * heat comes from the fuel slot (R196 getFuelHeatLevel == fuel heat,
     * same tick as canSmelt's gate).
     */
    @Unique
    private static void etim$smeltR196(MixinTileEntityFurnace self, ItemStack input, ItemStack output, int heat) {
        ItemStack result = FurnaceHeat.getSmeltingResult(input, heat);
        if (result.isEmpty()) {
            return; // canSmelt should have caught it; paranoid guard
        }
        if (output.isEmpty()) {
            self.furnaceItemStacks.set(2, result.copy());
        } else if (output.getItem() == result.getItem()
                && output.getMetadata() == result.getMetadata()) {
            output.grow(result.getCount());
        }
        int consumption;
        boolean isSand = input.getItem() == Item.getItemFromBlock(Blocks.SAND);
        ItemStack smeltedResult = self.furnaceItemStacks.get(2);
        if (isSand && smeltedResult.getItem() == Item.getItemFromBlock(Blocks.SANDSTONE)) {
            consumption = 4;
        } else if (isSand && smeltedResult.getItem() == Item.getItemFromBlock(Blocks.GLASS)) {
            consumption = 4;
        } else {
            consumption = 1;
        }
        input.shrink(consumption);
        if (input.getItem() == Items.CLAY_BALL && smeltedResult.getItem() == Items.BRICK) {
            int extra = Math.min(smeltedResult.getMaxStackSize() - smeltedResult.getCount(), input.getCount());
            if (extra > 3) {
                extra = 3;
            }
            smeltedResult.grow(extra);
            input.shrink(extra);
        }
        if (self.furnaceItemStacks.get(0).isEmpty()) {
            self.furnaceItemStacks.set(0, ItemStack.EMPTY);
        }
    }

    @Inject(
            method = "smeltItem",
            at = @At("HEAD"),
            cancellable = true,
            remap = true
    )
    private void etim$smeltRewrite(CallbackInfo cir) {
        if (!ETIMConfig.furnaceHeatSystem || !FurnaceHeat.isEnabled()) {
            return;
        }
        cir.cancel();
        ItemStack input = this.furnaceItemStacks.get(0);
        ItemStack output = this.furnaceItemStacks.get(2);
        int heat = etim$decisiveHeat(etim$currentHeat());
        etim$smeltR196(this, input, output, heat);
    }

    /**
     * Roof gate (run26 pause-round bug): the earlier race-window report —
     * "ignite fuel, then within a hair's breadth drop a no-recipe item fast
     * into the input slot and it LANDS" — is the vanilla QUICK_CRAFT drag
     * path: slotClick veto (MixinContainer) covers PICKUP/SWAP only, the
     * merge consult (MixinSlot) fires only where vanilla consults
     * isItemValid (mergeItemStack's empty-slot branch), but the drag end
     * writes slots via a bare {@code slot.putStack(...)} without ANY
     * consult. Patching each click type one by one invites whack-a-mole, so
     * the deny moves to the floor every writer must pass through:
     * setInventorySlotContents(0, noRecipeItem) is rejected BOTH sides
     * (client prediction and server truth), so no ghost and no rollback
     * window. The STACK fingerprint in the log names whatever future path
     * even tries (AGENTS rule 9). Dumping nothing into slot 0 (taking an
     * item OUT) is of course still allowed.
     */
    @Unique
    private static String etim$lastTileDenySig = "";

    @Inject(
            method = "setInventorySlotContents",
            at = @At("HEAD"),
            cancellable = true,
            remap = true
    )
    private void etim$inputRecipeFloorGate(int index, ItemStack stack, CallbackInfo cir) {
        if (index != 0 || stack.isEmpty()
                || !ETIMConfig.furnaceHeatSystem
                || !ETIMConfig.furnaceInputRecipeGate
                || !FurnaceHeat.isEnabled()
                || !net.minecraft.item.crafting.FurnaceRecipes.instance()
                        .getSmeltingResult(stack).isEmpty()) {
            return;
        }
        cir.cancel();
        String item = stack.getItem().getRegistryName().toString();
        // Fingerprint: caller frame #2 (1 = this mixin's hook, 2 = the writer
        // that tried to land the item) — dedup on it so a looping writer
        // (drag storm) stays one line per path instead of per tick.
        StackTraceElement[] frames = new Throwable().getStackTrace();
        String caller = frames.length > 2 ? frames[2].toString() : "unknown";
        String sig = item + "@" + caller;
        if (ETIMConfig.furnaceDebugLog && !sig.equals(etim$lastTileDenySig)) {
            etim$lastTileDenySig = sig;
            StringBuilder sb = new StringBuilder(
                    "[FurnaceLog] tile deny slot=0 item=" + item + " STACK:");
            for (int i = 2; i < Math.min(frames.length, 12); i++) {
                sb.append("\n                    at ").append(frames[i]);
            }
            ETIM.LOGGER.info(sb.append(
                    Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]").toString());
        }
    }

    /**
     * D6-round write probe: log EVERY actual write into a furnace slot.
     * The run26 11:3x round had both admission gates denying on the log
     * (side hopper slot-1, top hopper input slot-0) yet a lava bucket was
     * reported inside the furnace; the save showed no bucket in any
     * furnace/hopper at close. This probe is the AGENTS-rule-9 instrument:
     * any path that writes a slot (vanilla insert, hopper, container
     * code, mod sorters) shows here with its thread — a write without a
     * preceding admit line is a bypassed gate and must be chased to its
     * caller.
     */
    @Inject(
            method = "setInventorySlotContents",
            at = @At("TAIL"),
            remap = true
    )
    private void etim$writeProbe(int index, ItemStack stack, CallbackInfo cir) {
        if (!ETIMConfig.furnaceDebugLog) {
            return;
        }
        String item = stack.isEmpty() ? "empty" : stack.getItem().getRegistryName().toString();
        // Chase the bypass: only the OUTLAW writes get a call-stack dump.
        // Legal writes (smeltables into slot 0, legal fuel into slot 1, output
        // pays) stay one-line; a slot write whose content is exactly what the
        // admission gates refuse is the bypassed-path fingerprint.
        boolean outlaw = false;
        // STACK dump only when the corresponding gate is actually ON — with
        // furnaceHeatSystem=false (config 反测 rounds) vanilla-legal writes like
        // dirt/lava are NOT bypasses and must stay one-line.
        if (index == 0 && !stack.isEmpty()
                && ETIMConfig.furnaceHeatSystem && ETIMConfig.furnaceInputRecipeGate) {
            outlaw = net.minecraft.item.crafting.FurnaceRecipes.instance()
                    .getSmeltingResult(stack).isEmpty();
        } else if (index == 1 && !stack.isEmpty() && ETIMConfig.furnaceHeatSystem) {
            int heat = FurnaceHeat.getHeatOf(stack);
            outlaw = heat < 0 || heat > FurnaceHeat.getCapFor((TileEntityFurnace) (Object) this);
        }
        StringBuilder sb = new StringBuilder("[FurnaceLog] write slot=" + index + " item=" + item);
        if (outlaw) {
            StackTraceElement[] frames = new Throwable().getStackTrace();
            sb.append(" STACK:");
            for (int i = 1; i < Math.min(frames.length, 20); i++) {
                sb.append("\n                    at ").append(frames[i]);
            }
        }
        ETIM.LOGGER.info(sb.append(
                Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]").toString());
    }

    /**
     * Hopper-style fuel admission (9B §2.5 — R196 {@code canInsertItem}直通
     * {@code isItemValidForSlot}, so the hopper path hits the SAME heat gate;
     * the GUI click path runs through {@link MixinSlotFurnaceFuel}). The
     * vanilla slot-1 branch ({@code isItemFuel || bucket}) passes first —
     * this post-hook then applies {@code heat > 0 && heat <= cap}.
     */
    @Inject(
            method = "isItemValidForSlot",
            at = @At("RETURN"),
            cancellable = true,
            remap = true
    )
    private void etim$hopperFuelGate(int index, ItemStack stack, CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.furnaceHeatSystem || !FurnaceHeat.isEnabled()) {
            return;
        }
        // 批文项4 — the isItemValidForSlot layer of the large-item triple gate
        // (R196 :363 face): the clay tier refuses large items on BOTH the
        // input and fuel slots (hopper path).
        if (!FurnaceHeat.acceptsLargeItems((TileEntityFurnace) (Object) this)
                && ETIMFurnaceGate.isLargeItem(stack)) {
            String sig = stack.getItem().getRegistryName().toString() + "#large";
            if (Objects.equals(sig, etim$lastAdmitSig)) {
                return;
            }
            etim$lastAdmitSig = sig;
            if (ETIMConfig.furnaceDebugLog) {
                ETIM.LOGGER.info("[FurnaceLog] item denied large-item furnace="
                        + FurnaceHeat.getNameFor((TileEntityFurnace) (Object) this)
                        + " slot=" + index + " item=" + stack.getItem().getRegistryName().toString()
                        + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
            }
            cir.setReturnValue(false);
            return;
        }
        if (index == 0) {
            // R196 §3.1 (TileEntityFurnace.java:360-368): the INPUT slot only
            // admits items with an existing smelting recipe — GUI drag and
            // hopper automation hit the SAME gate. The run26 11:2x round let
            // a hopper push a lava bucket in through this open branch.
            if (!ETIMConfig.furnaceInputRecipeGate || cir.getReturnValueZ()
                    && !net.minecraft.item.crafting.FurnaceRecipes.instance()
                            .getSmeltingResult(stack).isEmpty()) {
                return;
            }
            String sig = stack.getItem().getRegistryName().toString() + "#input";
            if (Objects.equals(sig, this.etim$lastInputDenySig)) {
                return;
            }
            this.etim$lastInputDenySig = sig;
            if (ETIMConfig.furnaceDebugLog) {
                ETIM.LOGGER.info("[FurnaceLog] input denied no-recipe item="
                        + stack.getItem().getRegistryName().toString()
                        + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
            }
            cir.setReturnValue(false);
            return;
        }
        if (index != 1 || !cir.getReturnValueZ()) {
            return;
        }
        int heat = FurnaceHeat.getHeatOf(stack);
        int cap = FurnaceHeat.getCapFor((TileEntityFurnace) (Object) this);
        if (heat > 0 && heat <= cap) {
            etim$lastAdmitSig = "";
            return;
        }
        // Signature dedup: the GUI hover loop calls this slot check EVERY
        // FRAME while a denied stack hovers over the fuel slot — without the
        // dedup the [FurnaceLog] line storms (2192 rows in the run26 D-round).
        String sig = stack.getItem().getRegistryName().toString() + "#" + heat;
        if (Objects.equals(sig, etim$lastAdmitSig)) {
            return;
        }
        etim$lastAdmitSig = sig;
        if (ETIMConfig.furnaceDebugLog) {
            ETIM.LOGGER.info("[FurnaceLog] fuel admit denied heat=" + heat
                    + " cap=" + cap
                    + " furnace=" + FurnaceHeat.getNameFor((TileEntityFurnace) (Object) this)
                    + " item=" + stack.getItem().getRegistryName().toString()
                    + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
        }
        cir.setReturnValue(false);
    }

    // ---------------------------------------------------------------- batch B1: F-8-16 + F-8-20

    /**
     * ❗F-8-16（batch B1 并修）：heat_level NBT persistence — the R196
     * furnace keeps a dedicated heat_level field (decisive heat while
     * burning); the batch-A derivation vanishes across a save/reload mid-burn
     * (the empty fuel slot collapses the derived heat to 0). The byte rides
     * the vanilla readFromNBT/writeToNBT bodies.
     */
    @Inject(
            method = "readFromNBT",
            at = @At("TAIL"),
            remap = true
    )
    private void etim$readHeatLevel(NBTTagCompound compound, CallbackInfo ci) {
        this.etim$heatLevel = compound.getByte("heat_level");
        if (ETIMConfig.furnaceDebugLog && this.etim$heatLevel > 0 && this.furnaceBurnTime > 0) {
            ETIM.LOGGER.info("[FurnaceLog] heat load level=" + this.etim$heatLevel
                    + " burn=" + this.furnaceBurnTime
                    + " furnace=" + FurnaceHeat.getNameFor((TileEntityFurnace) (Object) this)
                    + " [server]");
        }
    }

    @Inject(
            method = "writeToNBT",
            at = @At("RETURN"),
            remap = true
    )
    private void etim$writeHeatLevel(NBTTagCompound compound, CallbackInfoReturnable<NBTTagCompound> cir) {
        cir.getReturnValue().setByte("heat_level", (byte) this.etim$heatLevel);
    }

    /**
     * ❗F-8-20（batch B1 并修）：the R196 extinguish face
     * (TileEntityFurnace.updateEntity :160/:205-216) — a furnace whose FRONT
     * neighbor floods (Material.water) or smothers (a solid face toward the
     * furnace) skips the whole tick: steam FX when flooded, the idle twin
     * swap, burnTime AND cookTime zeroed. The last burn tick is exempt
     * ({@code furnaceBurnTime == 1} takes the normal branch and burns out
     * naturally, R196 :160).
     */
    @Inject(
            method = "update",
            at = @At("HEAD"),
            cancellable = true,
            remap = true
    )
    private void etim$extinguish(CallbackInfo ci) {
        if (!ETIMConfig.furnaceHeatSystem || !FurnaceHeat.isEnabled()) {
            return;
        }
        TileEntityFurnace self = (TileEntityFurnace) (Object) this;
        if (self.getWorld() == null || self.getWorld().isRemote) {
            return;
        }
        if (this.furnaceBurnTime == 1) {
            return;
        }
        boolean flooded = etim$isFlooded(self);
        if (!flooded && !etim$isSmothered(self)) {
            return;
        }
        if (this.furnaceBurnTime > 0) {
            if (flooded) {
                // R196 blockFX steam :207-208 — the 1.12 broadcast face: smoke
                // particles (playEvent 2000) + the extinguish fizz.
                self.getWorld().playEvent(2000, self.getPos(), 0);
                self.getWorld().playSound(null, self.getPos(), SoundEvents.BLOCK_FIRE_EXTINGUISH,
                        SoundCategory.BLOCKS, 1.0F, 1.0F);
            }
            if (ETIMConfig.furnaceDebugLog) {
                ETIM.LOGGER.info("[FurnaceLog] extinguished " + (flooded ? "flooded" : "smothered")
                        + " furnace=" + FurnaceHeat.getNameFor(self)
                        + " burn=" + this.furnaceBurnTime + " cook=" + this.cookTime
                        + " [server]");
            }
            // Idle twin (vanilla or ETIM — MixinBlockFurnace routes the ETIM
            // pair), the R196 :211 face.
            net.minecraft.block.BlockFurnace.setState(false, self.getWorld(), self.getPos());
        }
        this.furnaceBurnTime = 0;
        this.cookTime = 0;
        this.etim$heatLevel = 0;
        ci.cancel();
    }

    /** R196 isFlooded :136-146 — the front-neighbor material is water. */
    @Unique
    private static boolean etim$isFlooded(TileEntityFurnace furnace) {
        EnumFacing facing = etim$frontFacing(furnace);
        if (facing == null) {
            return false;
        }
        BlockPos front = furnace.getPos().offset(facing);
        return furnace.getWorld().getBlockState(front).getMaterial() == Material.WATER;
    }

    /** R196 isSmotheredBySolidBlock :148-156 — the front neighbor presents a solid face toward the furnace. */
    @Unique
    private static boolean etim$isSmothered(TileEntityFurnace furnace) {
        EnumFacing facing = etim$frontFacing(furnace);
        if (facing == null) {
            return false;
        }
        BlockPos front = furnace.getPos().offset(facing);
        return furnace.getWorld().getBlockState(front).isSideSolid(furnace.getWorld(), front, facing.getOpposite());
    }

    /** The furnace's FACING front (the vanilla and the ETIM blocks share BlockHorizontal.FACING). */
    @Unique
    private static EnumFacing etim$frontFacing(TileEntityFurnace furnace) {
        net.minecraft.block.state.IBlockState state = furnace.getWorld().getBlockState(furnace.getPos());
        if (state.getPropertyKeys().contains(net.minecraft.block.BlockHorizontal.FACING)) {
            return state.getValue(net.minecraft.block.BlockHorizontal.FACING);
        }
        return null;
    }
}
