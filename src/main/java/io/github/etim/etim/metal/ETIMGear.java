package io.github.etim.etim.metal;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.registry.ForgeRegistries;
import net.minecraftforge.fml.common.registry.GameRegistry;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Batch-B2 registration face (批文 §二.1): 50 tools (10 types × 5 metals),
 * 40 armor pieces (4 vanilla-shape pieces + 4 chain variants per metal),
 * 5 chain items — 95 items total, R196-shaped recipes for all of them,
 * and the [EquipLog] boot dump (批文 §三 W1 判据源).
 *
 * <p>Registration follows the A-2 fix discipline: every item registers to
 * {@code ForgeRegistries.ITEMS} and {@code assertRegistered()} fail-fasts
 * at boot when any of them is missing from the registry.</p>
 */
public final class ETIMGear {

    private static final List<Item> ALL = new ArrayList<>();

    /** Constructor-judged maxDamage per gear row (B3 A-1 reassert face). */
    private static final java.util.Map<Item, Integer> JUDGED_DURABILITY = new java.util.HashMap<>();

    public static Item chainCopper;
    public static Item chainSilver;
    /** metgear 批: gold joins the chain-face only (D-2 a′ registration split). */
    public static Item chainGold;
    public static Item chainMithril;
    public static Item chainAdamantium;
    public static Item chainAncientMetal;
    public static Item chainRustedIron;

    /** B3: the rusted-iron arrow + shears ride the batch (user ruling 裁决 2). */
    public static Item arrowRustedIron;
    public static Item shearsRustedIron;

    /** scythe/knife + 箭合成面 批: the flint knife + the five craftable metal arrows. */
    public static Item knifeFlint;
    private static final java.util.Map<ETIMMetals, Item> CRAFT_ARROWS = new java.util.EnumMap<>(ETIMMetals.class);

    /** All B2 gear items in registration order (chains first, then tools, then armor). */
    public static List<Item> all() {
        return Collections.unmodifiableList(ALL);
    }

    public static void register() {
        chainCopper = chain("chain_copper");
        chainSilver = chain("chain_silver");
        chainGold = chain("chain_gold");
        chainMithril = chain("chain_mithril");
        chainAdamantium = chain("chain_adamantium");
        chainAncientMetal = chain("chain_ancient_metal");
        chainRustedIron = chain("chain_rusted_iron");

        for (ETIMMetals metal : ETIMMetals.TOOL_METALS) {
            register("pickaxe_" + metal.name, new ETIMItemPickaxe(metal));
            register("shovel_" + metal.name, new ETIMItemShovel(metal));
            register("axe_" + metal.name, new ETIMItemAxe(metal));
            register("hoe_" + metal.name, new ETIMItemHoe(metal));
            register("hatchet_" + metal.name, new ETIMItemHatchet(metal));
            register("mattock_" + metal.name, new ETIMItemMattock(metal));
            register("sword_" + metal.name, new ETIMItemSword(metal));
            register("dagger_" + metal.name, new ETIMItemDagger(metal));
            register("battle_axe_" + metal.name, new ETIMItemBattleAxe(metal));
            register("war_hammer_" + metal.name, new ETIMItemWarHammer(metal));

            for (ArmorPiece piece : ARMOR_PIECES) {
                register(piece.name + "_" + metal.name, new ETIMMetalArmor(metal, piece.slot, false));
            }
        }
        // metgear 批 (D-2 a′): the chain-armor set rides CHAIN_METALS — gold
        // gets chain armor but NOT plate armor (gold/iron keep vanilla items).
        for (ETIMMetals metal : ETIMMetals.CHAIN_METALS) {
            for (ArmorPiece piece : ARMOR_PIECES) {
                register("chain_" + piece.name + "_" + metal.name, new ETIMMetalArmor(metal, piece.slot, true));
            }
        }

        // B3: the rusted-iron arrow + shears (批文 §〇; arrow is not gear —
        // its dump row rides the material-item branch, shears is gear).
        // scythe/knife 批: the arrow class generalized to ETIMItemArrow(metal).
        arrowRustedIron = new ETIMItemArrow(ETIMMetals.RUSTED_IRON);
        register("arrow_rusted_iron", arrowRustedIron);
        shearsRustedIron = new ETIMItemShears(ETIMMetals.RUSTED_IRON);
        register("shears_rusted_iron", shearsRustedIron);

        // metgear 批 (条 213): the six R196 metal shears (Item.java:411-416).
        // The parameterized class covers the rusted body too — same decay
        // funnels, same reach, same repair face (D-5 a).
        for (ETIMMetals metal : ETIMMetals.SHEARS_METALS) {
            register("shears_" + metal.name, new ETIMItemShears(metal));
        }

        // scythe/knife + 箭合成面 批 (T1=①/T2/T3 user rulings, 2026-10-24):
        // 6 scythes (5 metals craft + the rusted body, no recipe), the flint
        // knife (A-1 定谳: metal knives unverifiable — dead data, Recipes
        // shadowed by the same-shape daggers; metgear 批 D-1 keep-no-knife),
        // and the five metal arrows (the rusted arrow stays loot-only, no recipe).
        for (ETIMMetals metal : ETIMMetals.TOOL_METALS) {
            register("scythe_" + metal.name, new ETIMItemScythe(metal));
        }
        knifeFlint = register("knife_flint", new ETIMItemKnifeFlint());
        CRAFT_ARROWS.put(ETIMMetals.COPPER, register("arrow_copper", new ETIMItemArrow(ETIMMetals.COPPER)));
        CRAFT_ARROWS.put(ETIMMetals.SILVER, register("arrow_silver", new ETIMItemArrow(ETIMMetals.SILVER)));
        CRAFT_ARROWS.put(ETIMMetals.MITHRIL, register("arrow_mithril", new ETIMItemArrow(ETIMMetals.MITHRIL)));
        CRAFT_ARROWS.put(ETIMMetals.ADAMANTIUM, register("arrow_adamantium", new ETIMItemArrow(ETIMMetals.ADAMANTIUM)));
        CRAFT_ARROWS.put(ETIMMetals.ANCIENT_METAL, register("arrow_ancient_metal", new ETIMItemArrow(ETIMMetals.ANCIENT_METAL)));

        assertRegistered();
        registerRecipes();
        dumpInventory();
    }

    private static final ArmorPiece[] ARMOR_PIECES = {
            new ArmorPiece("helmet", net.minecraft.inventory.EntityEquipmentSlot.HEAD),
            new ArmorPiece("chestplate", net.minecraft.inventory.EntityEquipmentSlot.CHEST),
            new ArmorPiece("leggings", net.minecraft.inventory.EntityEquipmentSlot.LEGS),
            new ArmorPiece("boots", net.minecraft.inventory.EntityEquipmentSlot.FEET),
    };

    /** The etim-domain recipe count in the vanilla REGISTRY (C-SK-3 runtime face). */
    private static int etimRecipeCount() {
        int count = 0;
        for (ResourceLocation key : net.minecraft.item.crafting.CraftingManager.REGISTRY.getKeys()) {
            if (ETIM.MOD_ID.equals(key.getNamespace())) {
                count++;
            }
        }
        return count;
    }

    private static final class ArmorPiece {
        final String name;
        final net.minecraft.inventory.EntityEquipmentSlot slot;

        ArmorPiece(String name, net.minecraft.inventory.EntityEquipmentSlot slot) {
            this.name = name;
            this.slot = slot;
        }
    }

    private static Item register(String name, Item item) {
        item.setRegistryName(new ResourceLocation(ETIM.MOD_ID, name));
        item.setTranslationKey("etim." + name);
        ForgeRegistries.ITEMS.register(item);
        ALL.add(item);
        JUDGED_DURABILITY.put(item, item.getMaxDamage());
        return item;
    }

    private static Item chain(String name) {
        Item item = new ETIMItemChain(name);
        ForgeRegistries.ITEMS.register(item);
        ALL.add(item);
        return item;
    }

    /** A-2 discipline: fail-fast at boot, not at level.dat read. */
    private static void assertRegistered() {
        for (Item item : ALL) {
            ResourceLocation name = item.getRegistryName();
            if (name == null || ForgeRegistries.ITEMS.getValue(name) == null) {
                throw new IllegalStateException("etim gear item not registered: " + name);
            }
        }
    }

    /** Registry lookup by suffix (asserted at boot) — the mob-equip face's accessor (B3). */
    public static Item gear(String suffix) {
        Item item = ForgeRegistries.ITEMS.getValue(new ResourceLocation(ETIM.MOD_ID, suffix));
        if (item == null) {
            throw new IllegalStateException("etim gear item not registered: " + suffix);
        }
        return item;
    }

    /**
     * B3 A-1 fail-fast: re-run after {@code ETIMToolDurability.apply()} — every
     * gear row must still carry its constructor-judged maxDamage (the IRON
     * placeholder ctor material made apply() rewrite B2+B3 tools to the vanilla
     * mapping: adamantium pickaxe 307200→9600).
     */
    public static void reassertJudgedDurability() {
        for (java.util.Map.Entry<Item, Integer> row : JUDGED_DURABILITY.entrySet()) {
            if (row.getKey().getMaxDamage() != row.getValue()) {
                throw new IllegalStateException("etim gear maxDamage drifted from the judged value: "
                        + row.getKey().getRegistryName() + " " + row.getKey().getMaxDamage()
                        + " != " + row.getValue());
            }
        }
        ETIM.LOGGER.info("[EquipLog] durability reassert: " + JUDGED_DURABILITY.size()
                + " gear rows ok [server]");
    }

    /**
     * R196-shaped recipes (批文 §〇 配方形状表, 一手 RecipesTools/RecipesWeapons/
     * RecipesArmor): {@code X} = the metal ingot (chain variants use the chain
     * item), {@code /} = stick. Stage-3 timer crafting is generic at the slot
     * layer — zero per-recipe wiring.
     */
    private static void registerRecipes() {
        for (ETIMMetals metal : ETIMMetals.TOOL_METALS) {
            if (metal == ETIMMetals.RUSTED_IRON) {
                // B3 批文 §〇: rusted iron has NO ingot and NO ingot-based
                // recipes (R196 无锭一手); only the chain-armor four exist
                // (RecipesArmor.java:37 chainRustedIron). The chain item
                // itself comes from the mineshaft chest (1-5, w5,
                // StructureMineshaftPieces.java:24).
                Object chain = chainOf(metal);
                addShaped("chain_helmet_" + metal.name, chain, "XXX", "X X");
                addShaped("chain_chestplate_" + metal.name, chain, "X X", "XXX", "XXX");
                addShaped("chain_leggings_" + metal.name, chain, "XXX", "X X", "X X");
                addShaped("chain_boots_" + metal.name, chain, "X X", "X X");
                continue;
            }
            Object ingot = ingotOf(metal);
            Object chain = chainOf(metal);

            // Tools (R196 RecipesTools:4-126 + RecipesWeapons:4-48).
            addShaped("pickaxe_" + metal.name, ingot, "XXX", " / ", " / ");
            addShaped("shovel_" + metal.name, ingot, "X", "/", "/");
            addShaped("axe_" + metal.name, ingot, "XX", "X/", " /");
            addShaped("hoe_" + metal.name, ingot, "XX", " /", " /");
            addShaped("mattock_" + metal.name, ingot, "XXX", " /X", " / ");
            addShaped("battle_axe_" + metal.name, ingot, "X X", "X/X", " / ");
            addShaped("war_hammer_" + metal.name, ingot, "XXX", "X/X", " / ");
            addShaped("hatchet_" + metal.name, ingot, "/X", "/ ");
            addShaped("sword_" + metal.name, ingot, "X", "X", "/");
            addShaped("dagger_" + metal.name, ingot, "X", "/");

            // Armor (R196 RecipesArmor:6-28): vanilla shapes; chains feed the
            // chain variants through the SAME shapes.
            addShaped("helmet_" + metal.name, ingot, "XXX", "X X");
            addShaped("chestplate_" + metal.name, ingot, "X X", "XXX", "XXX");
            addShaped("leggings_" + metal.name, ingot, "XXX", "X X", "X X");
            addShaped("boots_" + metal.name, ingot, "X X", "X X");
            addShaped("chain_helmet_" + metal.name, chain, "XXX", "X X");
            addShaped("chain_chestplate_" + metal.name, chain, "X X", "XXX", "XXX");
            addShaped("chain_leggings_" + metal.name, chain, "XXX", "X X", "X X");
            addShaped("chain_boots_" + metal.name, chain, "X X", "X X");
        }

        // metgear 批 gold chain face (D-2 a′ / D-6 a):
        // 4 chain-armor rows (RecipesArmor chain column) + 1 form + 1
        // dismantle. Nuggets point at the vanilla gold nugget
        // (RecipesMITE.java:66 goldNugget — 条 213 终-A1 引 :66), the chain
        // item / repair chain into the vanilla gold armor chain column.
        Object goldChain = chainOf(ETIMMetals.GOLD);
        Item goldNugget = ingotToNugget(ETIMMetals.GOLD);
        addShaped("chain_helmet_gold", goldChain, "XXX", "X X");
        addShaped("chain_chestplate_gold", goldChain, "X X", "XXX", "XXX");
        addShaped("chain_leggings_gold", goldChain, "XXX", "X X", "X X");
        addShaped("chain_boots_gold", goldChain, "X X", "X X");
        // Chain forming (R196 RecipesMITE:15-24 nugget_based, gold column).
        addShaped("chain_gold", goldNugget, " X ", "X X", " X ");
        // Chain dismantling (R196 RecipesMITE:61-74 chain_based, gold column → 4 nuggets).
        GameRegistry.addShapedRecipe(new ResourceLocation(ETIM.MOD_ID, "gear_chain_dismantle_gold"), null,
                new ItemStack(goldNugget, 4), "X", 'X', goldChain);

        // scythe/knife + 箭合成面 批 29 rows (批文 §〇, R196 一手):
        // C-SK-3 (verdict A-SK-1 round): the count is the RUNTIME delta of the
        // vanilla recipe REGISTRY across registerBatchRecipes() — the literal
        // "111 rows" string was dead data (hardcoded, would not catch a
        // skipped addRecipe). Only the BATCH delta is fail-fasted: the etim
        // domain total evolves every batch (154 at this commit — B1/B2 rows
        // included), so no total expectation exists.
        int before = etimRecipeCount();
        registerBatchRecipes();
        int added = etimRecipeCount() - before;
        if (added != 35) {
            throw new IllegalStateException("[ETIM] gear recipe count drifted: expected 35 batch rows (2 iron-nugget 9:1 + 5 scythe + 5 arrow + 5 dismantle + 1 sinew + 1 knife_flint + 6 chain form + 6 chain dismantle + 4 gold chain-armor, metgear 批 条 214), registered " + added);
        }
        ETIM.LOGGER.info("[TestLog] gear recipes registered: " + added
                + " batch rows ok (runtime REGISTRY delta; etim-domain total " + etimRecipeCount()
                + " incl legacy 94: 90 ingot-based + 4 rusted + 4 gold chain-armor) [server]");
    }

    /** The scythe/knife/arrow recipe face — R196 RecipesTools:102 / RecipesWeapons:73,85 / RecipesMITE:252,257. */
    private static void registerBatchRecipes() {
        // 批三修理面 T5②: the iron-nugget ↔ ingot pair (R196 RecipesIngots
        // :65 ingot→9 nuggets shapeless / :66 nuggets→ingot 对位 — vanilla
        // 1.12 has NO iron-nugget recipes; the R196 table covers iron at
        // :5-6/:9 the same column). The vanilla iron items, no ETIM items.
        Item ironIngot = Items.IRON_INGOT;
        Item ironNugget = Items.IRON_NUGGET;
        net.minecraft.item.crafting.Ingredient[] ironNuggets = new net.minecraft.item.crafting.Ingredient[9];
        for (int n = 0; n < 9; n++) {
            ironNuggets[n] = net.minecraft.item.crafting.Ingredient.fromStacks(new ItemStack(ironNugget));
        }
        GameRegistry.addShapelessRecipe(new ResourceLocation(ETIM.MOD_ID, "iron_ingot_from_nuggets"), null,
                new ItemStack(ironIngot), ironNuggets);
        GameRegistry.addShapelessRecipe(new ResourceLocation(ETIM.MOD_ID, "iron_nuggets_from_ingot"), null,
                new ItemStack(ironNugget, 9),
                net.minecraft.item.crafting.Ingredient.fromStacks(new ItemStack(ironIngot)));

        java.util.List<ETIMMetals> ingotMetals = java.util.Arrays.asList(
                ETIMMetals.COPPER, ETIMMetals.SILVER, ETIMMetals.MITHRIL,
                ETIMMetals.ADAMANTIUM, ETIMMetals.ANCIENT_METAL);
        for (ETIMMetals metal : ingotMetals) {
            // Scythe (RecipesTools:102): stick column left, two ingots.
            addShaped("scythe_" + metal.name, ingotOf(metal), "/X ", "/ X", "/  ");
            // Arrow (RecipesWeapons:73): nugget over stick over feather → 1.
            Item arrow = CRAFT_ARROWS.get(metal);
            GameRegistry.addShapedRecipe(new ResourceLocation(ETIM.MOD_ID, "arrow_" + metal.name), null,
                    new ItemStack(arrow), "?", "/", "F",
                    '?', ingotToNugget(metal), '/', Items.STICK, 'F', Items.FEATHER);
            // Dismantle (RecipesMITE:252): 1 arrow → 1 nugget, shapeless.
            GameRegistry.addShapelessRecipe(new ResourceLocation(ETIM.MOD_ID, "arrow_dismantle_" + metal.name), null,
                    new ItemStack(ingotToNugget(metal)),
                    net.minecraft.item.crafting.Ingredient.fromStacks(new ItemStack(arrow)));

            // Chain forming (R196 RecipesMITE:15-24, nugget_based→chain piece):
            // 4 nuggets in the ring shape → 1 chain (count=1 via CraftingManager
            // :491 directional quantity when the trailing cell is absent).
            addShaped("chain_" + metal.name, ingotToNugget(metal), " X ", "X X", " X ");
            // Chain dismantling (R196 RecipesMITE:61-74, chain_based): 1 chain
            // → 4 nuggets; addShaped pins output count=1 (ETIMGear :327), so
            // the count-4 output rides the same GameRegistry direct call that
            // the arrow/sinew rows above use (forge passes output ItemStack
            // count straight through).
            GameRegistry.addShapedRecipe(new ResourceLocation(ETIM.MOD_ID, "gear_chain_dismantle_" + metal.name), null,
                    new ItemStack(ingotToNugget(metal), 4), "X", 'X', chainOf(metal));
        }
        // Sinew (RecipesMITE:257): 1 leather → 4 sinew.
        GameRegistry.addShapedRecipe(new ResourceLocation(ETIM.MOD_ID, "sinew_from_leather"), null,
                new ItemStack(ETIMItems.sinew, 4), "#", '#', Items.LEATHER);
        // Flint knife (RecipesWeapons:85): flint + stick + sinew.
        GameRegistry.addShapedRecipe(new ResourceLocation(ETIM.MOD_ID, "knife_flint"), null,
                new ItemStack(knifeFlint), "Xs", "# ",
                'X', Items.FLINT, '#', Items.STICK, 's', ETIMItems.sinew);
    }

    private static Item ingotToNugget(ETIMMetals metal) {
        switch (metal) {
            case COPPER: return ETIMItems.nuggetCopper;
            case SILVER: return ETIMItems.nuggetSilver;
            case MITHRIL: return ETIMItems.nuggetMithril;
            case ADAMANTIUM: return ETIMItems.nuggetAdamantium;
            case ANCIENT_METAL: return ETIMItems.nuggetAncientMetal;
            // metgear 批 B-4: gold rides the vanilla nugget (ETIMGravelDrop:76 precedent).
            case GOLD: return Items.GOLD_NUGGET;
            default: throw new IllegalArgumentException("no nugget for " + metal);
        }
    }

    /** One shaped recipe; {@code X} = component, {@code /} = stick (key added only when the shape uses it). */
    private static void addShaped(String name, Object component, Object... rows) {
        StringBuilder shape = new StringBuilder();
        for (Object row : rows) {
            shape.append(row);
        }
        boolean usesStick = shape.toString().indexOf("/") >= 0;
        Object[] pattern = new Object[rows.length + (usesStick ? 4 : 2)];
        System.arraycopy(rows, 0, pattern, 0, rows.length);
        pattern[rows.length] = 'X';
        pattern[rows.length + 1] = component;
        if (usesStick) {
            pattern[rows.length + 2] = '/';
            pattern[rows.length + 3] = Items.STICK;
        }
        ResourceLocation id = new ResourceLocation(ETIM.MOD_ID, "gear_" + name);
        Item result = ForgeRegistries.ITEMS.getValue(new ResourceLocation(ETIM.MOD_ID, name));
        if (result == null) {
            throw new IllegalStateException("gear recipe result not registered: " + name);
        }
        GameRegistry.addShapedRecipe(id, null, new ItemStack(result), pattern);
    }

    private static Object ingotOf(ETIMMetals metal) {
        switch (metal) {
            case COPPER: return ETIMItems.ingotCopper;
            case SILVER: return ETIMItems.ingotSilver;
            case ANCIENT_METAL: return ETIMItems.ingotAncientMetal;
            case MITHRIL: return ETIMItems.ingotMithril;
            case ADAMANTIUM: return ETIMItems.ingotAdamantium;
            // metgear 批 B-4: gold keeps the vanilla ingot (ETIMBlocks:252 precedent);
            // the gold chain face never calls this, the case is the fail-fast guard.
            case GOLD: return Items.GOLD_INGOT;
            default: throw new IllegalArgumentException("no ingot for " + metal);
        }
    }

    private static Object chainOf(ETIMMetals metal) {
        switch (metal) {
            case COPPER: return chainCopper;
            case SILVER: return chainSilver;
            case ANCIENT_METAL: return chainAncientMetal;
            case MITHRIL: return chainMithril;
            case ADAMANTIUM: return chainAdamantium;
            case RUSTED_IRON: return chainRustedIron;
            // metgear 批 B-4: the gold chain joins the chain face.
            case GOLD: return chainGold;
            default: throw new IllegalArgumentException("no chain for " + metal);
        }
    }

    /** [EquipLog] boot dump (批文 §三): one row per gear item, judged columns. */
    private static void dumpInventory() {
        if (!ETIMConfig.equipDebugLog) {
            return;
        }
        for (Item item : ALL) {
            ResourceLocation name = item.getRegistryName();
            ItemStack probe = new ItemStack(item);
            int burn = item.getItemBurnTime(probe);
            if (item instanceof ETIMMetalGear) {
                ETIMMetalGear gear = (ETIMMetalGear) item;
                double armor = item instanceof ETIMMetalArmor ? ((ETIMMetalArmor) item).etimArmorPoints() : 0.0D;
                ETIM.LOGGER.info("[EquipLog] gear item=" + name + " maxDamage=" + item.getMaxDamage()
                        + " attackDamage=" + gear.etimAttackDamage()
                        + " efficiency=" + gear.etimEfficiency()
                        + " grade=" + gear.etimGrade()
                        + " burn=" + burn
                        + " armor=" + armor);
            } else {
                ETIM.LOGGER.info("[EquipLog] material item=" + name + " maxStackSize=" + item.getItemStackLimit(probe)
                        + " burn=" + burn);
            }
        }
    }

    private ETIMGear() {
    }
}
