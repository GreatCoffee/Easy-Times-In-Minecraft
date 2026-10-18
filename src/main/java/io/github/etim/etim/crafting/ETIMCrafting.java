package io.github.etim.etim.crafting;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMHunger;
import io.github.etim.etim.Tags;
import io.github.etim.etim.quality.EnumQuality;
import io.github.etim.etim.quality.ETIMQuality;
import net.minecraft.block.material.Material;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.init.SoundEvents;
import net.minecraft.inventory.Container;
import net.minecraft.inventory.ContainerWorkbench;
import net.minecraft.inventory.InventoryCrafting;
import net.minecraft.inventory.Slot;
import net.minecraft.inventory.SlotCrafting;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.text.TextComponentTranslation;
import net.minecraft.world.World;
import net.minecraftforge.event.entity.living.LivingDamageEvent;
import net.minecraftforge.event.entity.player.PlayerContainerEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Stage 3 (batch 1+2): the R196 crafting timer, server-authoritative.
 *
 * <p>Structure ports the R196 original three-layer shape (1.6.4):</p>
 * <ul>
 *   <li><b>Untouchable result slot</b> — R196 {@code SlotCrafting.canTakeStack}
 *       returns false unconditionally (:146-148) → {@code MixinSlot}; every
 *       vanilla click path no-ops BEFORE mutating anything.</li>
 *   <li><b>Click-to-start signal</b> — R196 slotClick:304 {@code onSlotClicked}
 *       runs before the canTakeStack check; the left click arms
 *       {@code crafting_proceed} (:194-203) → {@code MixinContainer.slotClick}
 *       at HEAD, server-authoritative (the client neither arms nor mutates).</li>
 *   <li><b>Timer driver</b> — this class, server-side per-player; completion
 *       auto-grants through the vanilla onTake consumption loop (R196
 *       onUpdate onPickupFromSlot:106-110 grant semantics).</li>
 * </ul>
 *
 * <p>Advancement semantics ported from R196 {@code MITEContainerCrafting.onUpdate}
 * (audit task 7 §1.5):</p>
 * <ul>
 *   <li><b>Advance</b> — {@code ++crafting_ticks} while proceed AND hasFoodEnergy
 *       (:96); the hunger gate freezes, it does not clear.</li>
 *   <li><b>Reset</b> — non-equivalent result stack → full clear (R196
 *       {@code onCraftMatrixChanged:24-32} compares every tick); a GUI close
 *       clears everything (R196 {@code clearCrafting}).</li>
 *   <li><b>Hit penalty</b> — damage×10 packet ×5 ticks (R196
 *       {@code ServerPlayer:1007-1011 + NetClientHandler:1454}) = 50 ticks per
 *       damage point, subtracted without interruption.</li>
 *   <li><b>Period</b> — audit 7 §1.2/§1.3: difficulty=d {{@literal <}}25 → 25,
 *       {{@literal >}}100 → round((d−100)^0.8)+100 else round(d), then
 *       ÷(1 + 0.02·level + bench), floor 25.
 *       Batch 3: the difficulty feeds through the quality ladder first —
 *       qAdj = d × 2^(rung−average) (audit 10 §3.2; below average is not
 *       discounted).</li>
 * </ul>
 *
 * <p>Batch-3 additions (this file, R196-first-hand):</p>
 * <ul>
 *   <li><b>Quality picker</b> — a RIGHT click on the result slot cycles
 *       {@code crafting_result_index} across {@code [min..max]} (R196
 *       tryIncrementCraftingResultIndex); the rung recomputes the period,
 *       resets progress and keeps proceed; the charge
 *       (round(qAdj/5) &gt; 0) stops the loop one unit, exactly audit
 *       §2.3 (:312-315).</li>
 *   <li><b>Spider-web gate</b> — upper body inside Material.WEB clears the
 *       craft every tick (R196 SlotCrafting:155-157), config
 *       {@code craftingWebDeny}.</li>
 *   <li><b>Damaged-ingredient gate</b> — any damaged matrix stack clears the
 *       craft every tick (R196 MITEContainerCrafting:178-181), config
 *       {@code craftingDamagedDeny}.</li>
 *   <li><b>Completion FX</b> — level-up sound + witch sparkles behind
 *       {@code craftingFx} (default off: the R196 5-tick random 1/5 packet
 *       shape is user-named-in-hop, batch-3 design §四).</li>
 * </ul>
 *
 * <p>Difficulty sources are the R196 §四 component survey,
 * mapped onto vanilla items in {@link CraftingDifficulty}.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class ETIMCrafting {

    private static final class Timer {
        int ticks;
        int period;
        float difficulty;
        ItemStack lastOutput = ItemStack.EMPTY;
        boolean proceed;
        /**
         * Batch-3 quality picker state (R196 {@code crafting_result_index}):
         * the currently selected ladder ordinal, wound back to the picker
         * floor on every result change (R196 clearCrafting-on-recompute).
         */
        int qualityIndex = EnumQuality.AVERAGE.ordinal();
    }

    /** Server-side per-player timer; keyed by UUID, cleared on GUI close. */
    private static final Map<UUID, Timer> TIMERS = new HashMap<>();

    private ETIMCrafting() {
    }

    // ---------------------------------------------------------------- mixin

    /**
     * Start signal, called from the {@code Container.slotClick} mixin at HEAD.
     * The click itself is a no-op (the result slot is untouchable via the
     * canTakeStack lock, see MixinSlot); this is the R196
     * {@code SlotCrafting.onSlotClicked:194-203} equivalent: the first take
     * attempt arms {@code crafting_proceed}; a RIGHT click (button 1) on the
     * result slot is the quality picker step instead (R196
     * tryIncrementCraftingResultIndex, batch-3 design §一).
     */
    public static void onCraftingResultClicked(EntityPlayer player, int slotId, int button) {
        if (player == null
                || player.world.isRemote // server-authoritative; the client relies on the canTakeStack no-op prediction
                || !ETIMConfig.craftingTimer
                || (ETIMConfig.craftingSkipCreative && player.capabilities.isCreativeMode)) {
            return;
        }
        Container container = player.openContainer;
        if (slotId != 0 || !(container.getSlot(0) instanceof SlotCrafting)) {
            return;
        }
        ItemStack output = container.getSlot(0).getStack();
        if (output.isEmpty()) {
            return;
        }
        // Click-parameter probe (run26 151-round: the B1/B2 right-click
        // expectation versus the observed "start" rows — AGENTS rule 9 makes
        // the log the verdict; this row records EXACTLY what button the
        // server saw, before any arm/cycle branch can reroute it).
        log(player, "result click btn=" + button);
        Timer timer = TIMERS.get(player.getUniqueID());
        if (timer == null || !ItemStack.areItemStacksEqual(timer.lastOutput, output)) {
            recomputePeriod(player, output, timer);
            timer = TIMERS.get(player.getUniqueID());
        }
        if (button == 1) {
            // Quality picker: the click cycles the selected ladder rung; it
            // never arms, mutates or consumes anything (batch-3 design §一).
            cycleQuality(player, timer);
            return;
        }
        if (timer.ticks >= timer.period) {
            return; // finished craft: the driver auto-granted it already
        }
        if (!timer.proceed) {
            timer.proceed = true;
            log(player, "start crafting difficulty=" + trim(timer.difficulty)
                    + " quality=" + EnumQuality.values()[timer.qualityIndex].name()
                    + " period=" + timer.period);
            if (ETIMConfig.craftingStartFeedback) {
                player.sendMessage(new TextComponentTranslation("etim.crafting.started", periodSeconds(timer.period)));
            }
            CraftingProgressNetwork.push((EntityPlayerMP) player, timer.ticks, timer.period, true);
        }
    }

    /**
     * R196 right-click quality step: wrap forward across
     * {@code [min .. max]}, recompute the period for the new
     * quality-adjusted difficulty (audit 7 §1.2 via §3.2), reset the progress
     * but NOT the proceed flag (batch-3 design §一 "quality change →
     * resetCraftingProgress，不撤销 proceed").
     */
    private static void cycleQuality(EntityPlayer player, Timer timer) {
        if (!ETIMConfig.qualitySystem) {
            return;
        }
        int min = ETIMQuality.getMinOrdinal(player);
        int max = ETIMQuality.getMaxOrdinal(player, timer.difficulty, timer.lastOutput);
        if (max <= min) {
            return; // single rung: cycling is a no-op
        }
        int next = timer.qualityIndex >= max ? min : timer.qualityIndex + 1;
        timer.qualityIndex = next;
        float qDifficulty = ETIMQuality.qualityAdjustedDifficulty(timer.difficulty, next);
        timer.period = getPeriod(player, qDifficulty, getBenchModifier(player.openContainer));
        timer.ticks = 0;
        int cost = ETIMQuality.getExperienceCost(qDifficulty);
        log(player, "quality cycle index=" + next + " (" + EnumQuality.values()[next].name()
                + ") range=[" + min + ".." + max + "] qDifficulty=" + trim(qDifficulty)
                + " cost=" + cost + " period=" + timer.period);
        if (ETIMConfig.craftingQualityFeedback) {
            player.sendMessage(new TextComponentTranslation("etim.crafting.quality",
                    new TextComponentTranslation(EnumQuality.values()[next].getTranslationKey()), cost));
        }
        CraftingProgressNetwork.push((EntityPlayerMP) player, 0, timer.period, timer.proceed);
    }

    // ---------------------------------------------------------------- driver

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || event.player.world == null || event.player.world.isRemote) {
            return;
        }
        EntityPlayer player = event.player;
        Timer timer = TIMERS.get(player.getUniqueID());
        if (!isTimerTarget(player)) {
            // Not in a crafting GUI — close semantics clear everything (R196 clearCrafting).
            TIMERS.remove(player.getUniqueID());
            return;
        }
        ItemStack output = getCraftingResult(player);
        if (output.isEmpty()) {
            if (timer != null && (!timer.lastOutput.isEmpty() || timer.proceed)) {
                log(player, "result gone → reset");
                timer.proceed = false;
                timer.ticks = 0;
                timer.lastOutput = ItemStack.EMPTY;
                // Cancel the client interpolation NOW: the last COMPLETE push
                // armed {ticks=0, active=true} and the client walks the bar on
                // its own 50 ms clock — a finished single craft would ghost-run
                // to 100% (user run26 150-round report #2).
                if (player instanceof EntityPlayerMP) {
                    CraftingProgressNetwork.pushIdle((EntityPlayerMP) player, timer.period);
                }
            }
            return;
        }
        if (timer == null || !ItemStack.areItemStacksEqual(timer.lastOutput, output)) {
            // Non-equivalent result: R196 onCraftMatrixChanged → clearCrafting
            // (five fields all reset, timer re-armed for the new output only by a take click).
            log(player, "result CHANGED sig=" + outputSignature(output)
                    + " prev=" + (timer == null ? "none" : outputSignature(timer.lastOutput))
                    + " → recompute difficulty/period");
            recomputePeriod(player, output, timer);
            timer = TIMERS.get(player.getUniqueID());
        } else {
            timer.lastOutput = output.copy();
        }
        if (!timer.proceed) {
            return;
        }
        // Spider-web gate: R196 SlotCrafting:155-157 — the upper body inside a
        // web fails canPlayerCraftItem every tick; the driver clears rather
        // than freezes (batch-3 design §二, audit 7 §1.5 :74-80 semantics).
        if (ETIMConfig.craftingWebDeny && isUpperBodyInWeb(player)) {
            clearCraftingByGate(player, timer, "web deny → crafting cleared");
            return;
        }
        // Damaged-ingredient gate: ❗F-7-24（audit20-07 R1a）— any damaged
        // stack in the matrix fails canPlayerCraftItem every tick, EXCEPT
        // the same-item repair pairing (R196 SlotCrafting:178-183 isRepair 豁免).
        if (ETIMConfig.craftingDamagedDeny && matrixHasDamagedItem(player.openContainer)) {
            clearCraftingByGate(player, timer, "damaged ingredient → crafting cleared");
            return;
        }
        // Hunger gate: R196 :84/:96 conjunction — freeze, do NOT clear.
        if (ETIMConfig.hungerCraftDeny && !ETIMHunger.hasFoodEnergy(player)) {
            return;
        }
        timer.ticks++;
        if (timer.ticks >= timer.period) {
            completeCraft(player, output, timer);
        } else if (timer.ticks % 4 == 0) {
            CraftingProgressNetwork.push((EntityPlayerMP) player, timer.ticks, timer.period, true);
        }
    }

    @SubscribeEvent
    public static void onContainerClose(PlayerContainerEvent.Close event) {
        EntityPlayer player = event.getEntityPlayer();
        if (player instanceof EntityPlayerMP) {
            CraftingProgressNetwork.pushAbsent((EntityPlayerMP) player, event.getContainer().windowId);
        }
        TIMERS.remove(player.getUniqueID());
    }

    @SubscribeEvent
    public static void onLivingDamage(LivingDamageEvent event) {
        if (event.getEntityLiving().world.isRemote
                || !(event.getEntityLiving() instanceof EntityPlayer)) {
            return;
        }
        EntityPlayer player = (EntityPlayer) event.getEntityLiving();
        Timer timer = TIMERS.get(player.getUniqueID());
        if (timer == null || !isTimerTarget(player)) {
            return;
        }
        // R196 protocol: packet stores round(amount×10), the client subtracts
        // that ×5 ticks = 50 per damage point; the config scales the ×5 factor
        // and must be a multiple of 10.
        int factor = ETIMConfig.craftingDamagePenaltyPerDamagePoint / 10;
        int penalty = Math.round(event.getAmount() * 10) * factor;
        int before = timer.ticks;
        timer.ticks = Math.max(timer.ticks - penalty, 0);
        if (player instanceof EntityPlayerMP) {
            CraftingProgressNetwork.push((EntityPlayerMP) player, timer.ticks, timer.period, timer.proceed);
        }
        log(player, "damage penalty −" + (before - timer.ticks)
                + " ticks (damage=" + event.getAmount() + " raw−" + penalty + ")");
    }

    // ---------------------------------------------------------------- period

    /**
     * R196 ClientPlayer.calcUnmodifiedCraftingPeriod (:499-507): d&lt;25 → 25;
     * d&gt;100 → round((d−100)^0.8)+100; else round(d).
     */
    private static int calcUnmodifiedPeriod(float difficulty) {
        if (difficulty < 25.0F) {
            return 25;
        }
        if (difficulty > 100.0F) {
            return Math.round((float) Math.pow(difficulty - 100.0F, ETIMConfig.craftingCurveExponent)) + 100;
        }
        return Math.round(difficulty);
    }

    /** R196 ClientPlayer.getCraftingPeriod (:555-563): ÷(1 + level% + bench), floor 25. */
    private static int getPeriod(EntityPlayer player, float difficulty, float bench) {
        int unmodified = calcUnmodifiedPeriod(difficulty);
        float denominator = 1.0F + ETIMConfig.craftingSpeedPerLevel * player.experienceLevel + bench;
        return (int) Math.max(unmodified / denominator, ETIMConfig.craftingPeriodFloor);
    }

    /** R196 getBenchAndToolsModifier (--:509-553): bench tier; only ContainerWorkbench counts. */
    private static float getBenchModifier(Container container) {
        return isVanillaWorkbench(container) ? ETIMConfig.craftingBenchModifier : 0.0F;
    }

    // ---------------------------------------------------------------- internals

    private static boolean isTimerTarget(EntityPlayer player) {
        return ETIMConfig.craftingTimer
                && !(ETIMConfig.craftingSkipCreative && player.capabilities.isCreativeMode)
                && player.openContainer.getSlot(0) instanceof SlotCrafting;
    }

    private static ItemStack getCraftingResult(EntityPlayer player) {
        return player.openContainer.getSlot(0).getStack();
    }

    private static InventoryCrafting findCraftingMatrix(Container container) {
        for (Slot slot : container.inventorySlots) {
            if (slot.inventory instanceof InventoryCrafting) {
                return (InventoryCrafting) slot.inventory;
            }
        }
        return null;
    }

    private static void recomputePeriod(EntityPlayer player, ItemStack output, Timer existing) {
        Timer timer = existing != null ? existing : new Timer();
        timer.difficulty = sumComponentDifficulty(player.openContainer);
        timer.period = getPeriod(player, timer.difficulty, getBenchModifier(player.openContainer));
        timer.ticks = 0;
        timer.proceed = false;
        timer.lastOutput = output.copy();
        // The picker floor (audit 10 §2.2): a result change rewinds the
        // selected rung to min — the quality choice never survives a recipe
        // change (R196 clearCrafting-on-recompute).
        timer.qualityIndex = ETIMQuality.getMinOrdinal(player);
        TIMERS.put(player.getUniqueID(), timer);
        if (player instanceof EntityPlayerMP) {
            CraftingProgressNetwork.pushIdle((EntityPlayerMP) player, timer.period);
        }
        log(player, "period SET difficulty=" + trim(timer.difficulty)
                + " quality=" + EnumQuality.values()[timer.qualityIndex].name()
                + " period=" + timer.period);
    }

    /** R196 RecipeHelper.addRecipe: difficulty = Σ component difficulties (audit 7 §4.3). */
    private static float sumComponentDifficulty(Container container) {
        float sum = 0.0F;
        for (Slot slot : container.inventorySlots) {
            if (slot.inventory instanceof InventoryCrafting) {
                ItemStack stack = slot.getStack();
                if (!stack.isEmpty()) {
                    sum += CraftingDifficulty.difficultyOf(stack);
                }
            }
        }
        return sum;
    }

    /**
     * R196 completion (SlotCrafting.onPickupFromSlot:106-110): product straight
     * into the inventory (or dropped); the vanilla {@code onTake} body performs
     * the once-per-craft matrix consumption + container items; the result slot
     * refresh then feeds the next unit (cost-0 crafts continue unstopped).
     */
    private static void completeCraft(EntityPlayer player, ItemStack output, Timer timer) {
        timer.ticks = 0;
        Slot resultSlot = player.openContainer.getSlot(0);
        ItemStack product = output.copy();
        resultSlot.onTake(player, product);
        // Refresh the result slot from the (now-consumed) matrix.
        InventoryCrafting matrix = findCraftingMatrix(player.openContainer);
        if (matrix != null) {
            player.openContainer.onCraftMatrixChanged(matrix);
        }
        // Batch-3: the selected rung rides the granted product (R196
        // SlotCrafting.onUpdate :289-294 ordinals at the light moment).
        EnumQuality quality = EnumQuality.values()[timer.qualityIndex];
        int cost = ETIMQuality.getExperienceCost(
                ETIMQuality.qualityAdjustedDifficulty(timer.difficulty, timer.qualityIndex));
        if (ETIMConfig.qualitySystem && timer.qualityIndex != EnumQuality.AVERAGE.ordinal()) {
            ETIMQuality.set(product, quality);
        }
        // R196 charge gate (quality audit §2.6 §Picker pseudocode :146-148):
        // only a NON-average pick pays (SlotCrafting:312-315 charges inside the
        // quality≠average branch) — average is xp=0 and keeps proceeding.
        boolean charge = ETIMConfig.qualitySystem && quality != EnumQuality.AVERAGE && cost > 0;
        // Snapshot the identity BEFORE the consumptive grant (addItemStackToInventory
        // shrinks the passed stack to 0; log/chat skins captured afterwards read "空气").
        String grantedName = product.getDisplayName() + " ×" + product.getCount();
        if (!player.inventory.addItemStackToInventory(product)) {
            player.dropItem(product, false);
        }
        if (charge) {
            ETIMQuality.chargeExperience(player, cost);
        }
        if (ETIMConfig.craftingFx) {
            playCraftingFx(player.world, player);
        }
        if (charge) {
            // R196 :312-315 — a paid step stops the loop; the next unit needs
            // a fresh take click (cost-0 crafts continue unstopped).
            timer.proceed = false;
            CraftingProgressNetwork.pushIdle((EntityPlayerMP) player, timer.period);
        } else {
            CraftingProgressNetwork.push((EntityPlayerMP) player, 0, timer.period, true);
        }
        log(player, "COMPLETE " + grantedName + " quality=" + quality.name()
                + " xp=" + (charge ? "-" + cost : "0")
                + (charge ? " proceed stopped" : " continue"));
        if (ETIMConfig.craftingCompleteFeedback) {
            player.sendMessage(new TextComponentTranslation("etim.crafting.completed", grantedName));
        }
        if (charge && ETIMConfig.craftingCompleteFeedback) {
            player.sendMessage(new TextComponentTranslation("etim.crafting.paid", cost));
        }
    }

    /**
     * R196 hasCraftingEffect (crafting effect audit §1.5 :86-93): a 5-tick
     * random 1/5 gate plays the same FX packet on completion. ETIM plays the
     * level-up sound + witch sparkles at the crafting position (user-vs-R196
     * presentation variance documented in the batch-3 design §四; the key is
     * default-off until the user names a preference).
     */
    private static void playCraftingFx(World world, EntityPlayer player) {
        world.playSound(null, player.posX, player.posY, player.posZ,
                SoundEvents.ENTITY_PLAYER_LEVELUP, SoundCategory.PLAYERS, 0.7F, 1.0F);
        if (player.world.isRemote) {
            return; // server side never spawns visuals; the client does its own loop
        }
        if (player instanceof EntityPlayerMP) {
            player.world.spawnParticle(EnumParticleTypes.SPELL_WITCH,
                    player.posX, player.posY + 1.0D, player.posZ,
                    0.0D, 0.0D, 0.0D);
        }
    }

    /**
     * R196 upper-body-in-web check (SlotCrafting:155-157 via EntityPlayer
     * 1.6.4 :2897-2899): the torso/head AABB vs the WEB material.
     */
    private static boolean isUpperBodyInWeb(EntityPlayer player) {
        AxisAlignedBB upperBody = player.getEntityBoundingBox().offset(0.0D, 1.0D, 0.0D);
        return player.world.isMaterialInBB(upperBody, Material.WEB);
    }

    /**
     * ❗F-7-24（audit20-07 R1a）：any damaged matrix stack fails — EXCEPT the
     * anvil-style repair pairing（R196 SlotCrafting:178-183 含 isRepair 豁免原句；
     * 原 javadoc 引 MITEContainerCrafting:178-181 系引用错位）: two damaged
     * stacks of the SAME item = the vanilla repair recipe → exempt.
     */
    private static boolean matrixHasDamagedItem(Container container) {
        ItemStack firstDamaged = null;
        for (Slot slot : container.inventorySlots) {
            if (slot.inventory instanceof InventoryCrafting) {
                ItemStack stack = slot.getStack();
                if (!stack.isEmpty() && stack.isItemDamaged()) {
                    if (firstDamaged != null && firstDamaged.getItem() == stack.getItem()) {
                        return false; // repair pairing (same item, both damaged) — isRepair 豁免
                    }
                    firstDamaged = stack;
                }
            }
        }
        return firstDamaged != null;
    }

    /** Gate-fail clear: R196 clearCrafting (:74-80) — cleared, never frozen. */
    private static void clearCraftingByGate(EntityPlayer player, Timer timer, String reason) {
        if (!timer.proceed && timer.ticks == 0) {
            return; // idempotent per R196 semantics: already clear
        }
        timer.proceed = false;
        timer.ticks = 0;
        if (player instanceof EntityPlayerMP) {
            CraftingProgressNetwork.pushIdle((EntityPlayerMP) player, timer.period);
        }
        log(player, reason + " (ticks reset to 0)");
    }

    private static boolean isVanillaWorkbench(Container container) {
        return container instanceof ContainerWorkbench;
    }

    /** Readable seconds for the completion/start feedback lines. */
    private static String periodSeconds(int periodTicks) {
        float seconds = periodTicks / 20.0F;
        return seconds < 10 ? String.format("%.1f s", seconds) : String.format("%.0f s", seconds);
    }

    private static String trim(float value) {
        float rounded = Math.round(value * 100.0F) / 100.0F;
        return Float.toString(rounded);
    }

    /**item identity fingerprint for the recompute-mismatch diagnosis. */
    private static String outputSignature(ItemStack stack) {
        if (stack == null || stack.isEmpty()) {
            return "empty";
        }
        return stack.getItem().getRegistryName() + "#"
                + stack.getMetadata() + "×" + stack.getCount()
                + (stack.getTagCompound() != null ? "+tag" + stack.getTagCompound().getSize() : "");
    }

    private static void log(EntityPlayer player, String message) {
        if (ETIMConfig.craftingDebugLog) {
            ETIM.LOGGER.info("[CraftingLog] " + player.getName() + " (" + player.getEntityId()
                    + ") " + message + " [server]");
        }
    }
}
