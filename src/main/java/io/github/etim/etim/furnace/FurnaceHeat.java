package io.github.etim.etim.furnace;

import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.tileentity.TileEntityFurnace;
import java.util.HashMap;
import java.util.Map;

/**
 * Stage 4 batch A: the R196 heat ladder, wired onto the VANILLA furnace
 * (batch-A scope decision: one furnace tier first — the vanilla block maps to
 * R196's cobblestone furnace, whose cap is heat 2, so heat levels ≤ 2 run
 * against it; the five extra furnace tiers become whole new blocks and come
 * in batch B with the metal-system content).
 *
 * <p>Every number is a one-hand judgment (9B audit + audit 9) — nothing
 * invented:</p>
 * <ul>
 *   <li><b>Required-heat query</b> (9B §2.4, the strict same-order switch):
 *       ore rows {@code adamantium 4 / mithril 3 / {cu,ag,au,fe} 2 /
 *       {quartz,emerald,diamond,redstone} 2 / lapis 2 / sandStone 2 /
 *       sand 1 / else 1}. Rows land on the vanilla ORE inputs they exist for;
 *       every vanilla-only input (cobble, log, raw food) falls to the
 *       {@code else → 1} R196 default branch.</li>
 *   <li><b>Fuel heat</b> (audit 9 fuel table + 9B §2.1): base rule
 *       Item.getHeatLevel = {@code getBurnTime > 0 → 1, else 0}
 *       (Item.java 1723-1729); the named exceptions: coal → 2, charcoal → 1
 *       (ItemCoal:38-45), lava bucket → 3 (ItemBucket), blaze rod → 4 (the
 *       9B-verified special branch).</li>
 *   <li><b>Cap</b>: the vanilla tier is R196's cobblestone furnace
 *       (audit 9 §2.6) — cap heat 2.</li>
 * </ul>
 *
 * <p>Failed gates are judged from the [FurnaceLog] channel (AGENTS.md rule
 * 9): fuel admission and canSmelt denials both log; the vanilla furnace keeps
 * its vanilla 200-tick cook cadence untouched (same speed as R196 — audit 9
 * §3.1 PASS).</p>
 */
public final class FurnaceHeat {

    /** R196 static{} (javap 1239-1266) — the four named heat levels. */
    public static final int HEAT_WOOD_AND_CHARCOAL = 1;
    public static final int HEAT_COAL = 2;
    public static final int HEAT_LAVA = 3;
    public static final int HEAT_BLAZE = 4;

    /** Vanilla furnace = R196 cobblestone furnace (audit 9 §2.6). */
    public static final int VANILLA_FURNACE_CAP = 2;

    /** Required heat per INPUT item (§2.4 rows; the default = else 1). */
    private static final Map<Item, Integer> REQUIRED = new HashMap<>();

    private static boolean enabled = true;
    private static int vanillaCap = VANILLA_FURNACE_CAP;

    static {
        // Ore rows (9A §2.4) — the ORE BLOCK is the input; products never
        // enter the furnace, so the map stays ore-keyed.
        REQUIRED.put(Item.getItemFromBlock(Blocks.IRON_ORE), 2);
        REQUIRED.put(Item.getItemFromBlock(Blocks.GOLD_ORE), 2);
        REQUIRED.put(Item.getItemFromBlock(Blocks.DIAMOND_ORE), 2);
        REQUIRED.put(Item.getItemFromBlock(Blocks.EMERALD_ORE), 2);
        REQUIRED.put(Item.getItemFromBlock(Blocks.REDSTONE_ORE), 2);
        REQUIRED.put(Item.getItemFromBlock(Blocks.LAPIS_ORE), 2);
        REQUIRED.put(Item.getItemFromBlock(Blocks.QUARTZ_ORE), 2);
        // ❗F-8-18/R-13（audit20-08 R5 + 回裁 R-13=A）：COAL_ORE→2 已删——
        // R196 getHeatLevelRequired（TileEntityFurnace.java:219-241）无 oreCoal 支，
        // else 恒 1 ⇒ COAL_ORE 落默认档 HEAT_WOOD_AND_CHARCOAL。
        REQUIRED.put(Item.getItemFromBlock(Blocks.SANDSTONE), 2);  // sandStone row: smelt to glass at heat 2
        // else branch (sand, cobble, logs, raw food, ...) = 1.
    }

    /** Called from ETIMConfig.init. */
    public static void setEnabled(boolean value) {
        enabled = value;
    }

    /** Called from ETIMConfig.init. */
    public static void setVanillaCap(int value) {
        vanillaCap = value;
    }

    public static boolean isEnabled() {
        return enabled;
    }

    // ---------------------------------------------------------------- burn time

    /**
     * R196 burn-time table (audit 9 §2.2 first-hand) where it DIFFERS from
     * vanilla 1.12 — logs 1600 (vanilla 300), planks/wood-slabs/torch family
     * re-tunes, lava bucket 3200 (vanilla 20000), coal block 16000
     * (vanilla 80000), stick/arrow/book rows, and the material-wood tools
     * override. {@code null} result = leave the vanilla value (unknown
     * items).
     */
    public static Integer getR196BurnTime(ItemStack stack) {
        Item item = stack.getItem();
        if (item == Items.BLAZE_ROD) {
            return 2400;
        }
        if (item == Items.LAVA_BUCKET) {
            return 3200;
        }
        if (item == Items.PAPER) {
            return 25;
        }
        if (item == Items.STICK || item instanceof net.minecraft.item.ItemArrow) {
            return 100;
        }
        if (item == Items.BOOK || item == Items.WRITABLE_BOOK
                || item == Items.ENCHANTED_BOOK) {
            return 100;
        }
        if (item == net.minecraft.item.Item.getItemFromBlock(Blocks.LOG)
                || item == net.minecraft.item.Item.getItemFromBlock(Blocks.LOG2)) {
            return 1600;
        }
        if (item == net.minecraft.item.Item.getItemFromBlock(Blocks.PLANKS)
                || item == net.minecraft.item.Item.getItemFromBlock(Blocks.WOODEN_SLAB)) {
            return 400;
        }
        if (item == net.minecraft.item.Item.getItemFromBlock(Blocks.SAPLING)
                || item == net.minecraft.item.Item.getItemFromBlock(Blocks.DEADBUSH)) {
            return 200;
        }
        if (item == net.minecraft.item.Item.getItemFromBlock(Blocks.TORCH)) {
            return 800;
        }
        if (item == net.minecraft.item.Item.getItemFromBlock(Blocks.COAL_BLOCK)) {
            return 16000;
        }
        if (item == Items.OAK_DOOR || item == Items.SPRUCE_DOOR || item == Items.BIRCH_DOOR
                || item == Items.JUNGLE_DOOR || item == Items.ACACIA_DOOR || item == Items.DARK_OAK_DOOR) {
            return 400;
        }
        if (item == Items.BOAT || item == Items.SPRUCE_BOAT || item == Items.BIRCH_BOAT
                || item == Items.JUNGLE_BOAT || item == Items.ACACIA_BOAT || item == Items.DARK_OAK_BOAT) {
            return 1200;
        }
        if (item == Items.BOWL) {
            return 200;
        }
        if (item instanceof net.minecraft.item.ItemTool
                && ((net.minecraft.item.ItemTool) item).getToolMaterialName().equals(Item.ToolMaterial.WOOD.toString())) {
            return 200;
        }
        return null;
    }

    public static int getVanillaCap() {
        return vanillaCap;
    }

    /**
     * Required-heat query (9B §2.4): mapped rows first, the R196
     * {@code else → 1} default for every vanilla-only input.
     */
    public static int getRequiredHeat(ItemStack input) {
        if (input.isEmpty()) {
            return 0;
        }
        Integer registered = REQUIRED.get(input.getItem());
        return registered != null ? registered : HEAT_WOOD_AND_CHARCOAL;
    }

    /**
     * R196 FurnaceRecipes.getSmeltingResult with its two hard filters (9B
     * §3.2, code confirmed against the 1.6.4 decompile TileEntityFurnace:
     * 296-331 this run): the sand dual EXACT branch — a sand input smelts
     * only with stackSize ≥ 4, to SANDSTONE when the live heat is exactly
     * 1 and to GLASS when it is higher (both branches consume 4) — and the
     * strict {@code heat ≥ required} gate on every other row (already the
     * canSmelt HEAD gate). heat −1 ("potential-heat query") is a GUI quick
     * lookup the heat gate replaces here.
     */
    public static ItemStack getSmeltingResult(ItemStack input, int heat) {
        if (input.isEmpty()) {
            return ItemStack.EMPTY;
        }
        if (input.getItem() == Item.getItemFromBlock(Blocks.SAND)) {
            if (input.getCount() < 4) {
                return ItemStack.EMPTY;
            }
            ItemStack choice = heat == HEAT_WOOD_AND_CHARCOAL
                    ? new ItemStack(Blocks.SANDSTONE)
                    : new ItemStack(Blocks.GLASS);
            return choice;
        }
        return net.minecraft.item.crafting.FurnaceRecipes.instance()
                .getSmeltingResult(input);
    }
    /**
     * Fuel heat of one stack (audit 9 fuel table + 9B §2.1): the base
     * {@code getBurnTime > 0 → 1} rule, then the four one-hand exceptions.
     * The base rule reads the STATIC TileEntityFurnace.getItemBurnTime —
     * R196's 1.6.4 base check runs through the same furnace table; the
     * per-Item getter returns −1 ("defer to the furnace table") for the
     * entire wood family in 1.12, so planks/logs/torch all read heat=0
     * through it (run26 D2/D4 round bug: planks flagged notFuel, denied
     * admission).
     */
    public static int getHeatOf(ItemStack fuel) {
        Item item = fuel.getItem();
        if (item == Items.COAL) {
            // 1.12.2 folds charcoal into the coal item (metadata 1) — the R196
            // ItemCoal heat split (charcoal → 1, coal → 2) maps on the meta.
            return fuel.getMetadata() == 1 ? HEAT_WOOD_AND_CHARCOAL : HEAT_COAL;
        }
        if (item == Item.getItemFromBlock(Blocks.COAL_BLOCK)) {
            return HEAT_COAL;               // ItemBlock:158-161 — coal block burns 16000 at heat 2
        }
        if (item == Items.BLAZE_ROD) {
            return HEAT_BLAZE;              // Item.java:1723-1729 special branch (9B §2.3)
        }
        if (item == Items.LAVA_BUCKET) {
            return HEAT_LAVA;               // lava bucket → 3 (audit 9 fuel table; milk/water/empty are never fuels)
        }
        // Base rule: the vanilla furnace table (which already includes the
        // vanilla Item.getItemBurnTime overrides) > 0 → 1.
        return TileEntityFurnace.getItemBurnTime(fuel) > 0 ? HEAT_WOOD_AND_CHARCOAL : 0;
    }

    /**
     * Batch B-3: the R196 furnace rows that VANILLA lacks, registered onto
     * the vanilla recipe map (audit 9 §1.2 rows: redstone ore → redstone ×4,
     * lapis ore → lapis dye ×4, quartz/diamond/emerald/coal ore → their
     * items, sandstone → glass, clay block → hardened clay). Vanilla already
     * carries: iron/gold ore, log → charcoal, netherrack brick, cactus dye,
     * clay ball → brick. The XP float stays 0 — the payout is the per-item
     * reward table (FurnaceXpRewards), not the vanilla recipe xp.
     */
    public static void addJudgedRecipes() {
        net.minecraft.item.crafting.FurnaceRecipes recipes = net.minecraft.item.crafting.FurnaceRecipes.instance();
        recipes.addSmelting(Item.getItemFromBlock(Blocks.REDSTONE_ORE), new ItemStack(Items.REDSTONE, 4), 0.0F);
        recipes.addSmelting(Item.getItemFromBlock(Blocks.LAPIS_ORE), new ItemStack(Items.DYE, 4, 4), 0.0F);
        recipes.addSmelting(Item.getItemFromBlock(Blocks.QUARTZ_ORE), new ItemStack(Items.QUARTZ), 0.0F);
        recipes.addSmelting(Item.getItemFromBlock(Blocks.DIAMOND_ORE), new ItemStack(Items.DIAMOND), 0.0F);
        recipes.addSmelting(Item.getItemFromBlock(Blocks.EMERALD_ORE), new ItemStack(Items.EMERALD), 0.0F);
        recipes.addSmelting(Item.getItemFromBlock(Blocks.COAL_ORE), new ItemStack(Items.COAL), 0.0F);
        recipes.addSmelting(Item.getItemFromBlock(Blocks.SANDSTONE), new ItemStack(Blocks.GLASS), 0.0F);
        recipes.addSmelting(Item.getItemFromBlock(Blocks.CLAY), new ItemStack(Blocks.HARDENED_CLAY), 0.0F);
        io.github.etim.etim.ETIM.LOGGER.info("[FurnaceLog] 8 judged smelting rows registered (redstone/lapis/quartz/diamond/emerald/coal ores + sandstone→glass + clay block→hardened clay) [server]");
    }
}
