package io.github.etim.etim.metal;

import net.minecraft.block.Block;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemAir;
import net.minecraft.item.ItemBlock;
import net.minecraft.item.ItemStack;
import net.minecraft.item.crafting.FurnaceRecipes;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.registry.GameRegistry;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.furnace.FurnaceHeat;

/**
 * Stage 4 batch B1 block/item registration + the judged recipe rows.
 *
 * <ul>
 *   <li>Five furnace tiers × idle/burning twins = ten blocks (终审 B-4:
 *       1.12 vanilla FURNACE/LIT_FURNACE 同构). The burning twin gets
 *       vanilla's ItemAir (no placement item), exactly like LIT_FURNACE.</li>
 *   <li>Four ore blocks (copper/silver/mithril/adamantium — R196 BlockOre
 *       G-FB-9). No ancient-metal ore: R196 ancient metal has no ore, it is
 *       chest loot (G-FB-11, B-2(a) 主会话裁定).</li>
 *   <li>Furnace crafting rows (R196 RecipesMITE.java:259-263): clay oven =
 *       2×2 clay; the other four = 3×3 ring of their material. The R196
 *       MASONRY skill gate has no ETIM counterpart (F-8-23 = B) → dropped.</li>
 *   <li>Ore → ingot smelting rows ×4 (R196 :492-496 — the fifth row there is
 *       oreIron, which vanilla 1.12 already carries). XP float stays 0: the
 *       payout is the FurnaceXpRewards table (audit 9 §1.4).</li>
 *   <li>9:1 nugget↔ingot conversion (R196 nugget_based_items :4-25, the
 *       vanilla gold pattern).</li>
 *   <li>Required-heat rows for the four ore blocks (R196
 *       TileEntityFurnace.getHeatLevelRequired :219-241): copper/silver 2,
 *       mithril 3, adamantium 4.</li>
 * </ul>
 */
public final class ETIMBlocks {

    public static ETIMBlockFurnace FURNACE_CLAY;
    public static ETIMBlockFurnace FURNACE_CLAY_LIT;
    public static ETIMBlockFurnace FURNACE_SANDSTONE;
    public static ETIMBlockFurnace FURNACE_SANDSTONE_LIT;
    public static ETIMBlockFurnace FURNACE_HARDENED_CLAY;
    public static ETIMBlockFurnace FURNACE_HARDENED_CLAY_LIT;
    public static ETIMBlockFurnace FURNACE_OBSIDIAN;
    public static ETIMBlockFurnace FURNACE_OBSIDIAN_LIT;
    public static ETIMBlockFurnace FURNACE_NETHERRACK;
    public static ETIMBlockFurnace FURNACE_NETHERRACK_LIT;

    public static ETIMBlockOre ORE_COPPER;
    public static ETIMBlockOre ORE_SILVER;
    public static ETIMBlockOre ORE_MITHRIL;
    public static ETIMBlockOre ORE_ADAMANTIUM;

    /** 金属砧块批 — the six metal anvils (R196 Block :876-888/:959-961). */
    public static ETIMBlockAnvil ANVIL_COPPER;
    public static ETIMBlockAnvil ANVIL_SILVER;
    public static ETIMBlockAnvil ANVIL_GOLD;
    public static ETIMBlockAnvil ANVIL_MITHRIL;
    public static ETIMBlockAnvil ANVIL_ADAMANTIUM;
    public static ETIMBlockAnvil ANVIL_ANCIENT_METAL;

    /** 金属砧块批 T2① — the five metal storage blocks (gold/iron stay vanilla). */
    public static ETIMBlockStorage STORAGE_COPPER;
    public static ETIMBlockStorage STORAGE_SILVER;
    public static ETIMBlockStorage STORAGE_MITHRIL;
    public static ETIMBlockStorage STORAGE_ADAMANTIUM;
    public static ETIMBlockStorage STORAGE_ANCIENT_METAL;

    private static ETIMBlockFurnace[][] twins = new ETIMBlockFurnace[ETIMFurnaceTier.values().length][2];

    public static void register() {
        registerFurnaces();
        registerOres();
        registerAnvils();
        registerStorageBlocks();
        registerMantleOrCore();
        registerPortal();
        registerRecipes();
    }

    /**
     * underworld 二阶段 T1 — the R196 portal block (world/ETIMBlockPortal).
     * R196 canBeCarried=false / dropBlockAsEntityItem 0 → no ItemBlock
     * (NA-28). No BlockContainer (NA-29: TileEntity ✗ in R196).
     */
    private static void registerPortal() {
        PORTAL = new io.github.etim.etim.world.ETIMBlockPortal();
        net.minecraftforge.fml.common.registry.ForgeRegistries.BLOCKS.register(PORTAL);
        ETIM.LOGGER.info("[DimLog] portal block registered (metadata 0/1/2 destinations, runegate bit reserved) [server]");
    }

    private static void registerFurnaces() {
        for (ETIMFurnaceTier tier : ETIMFurnaceTier.values()) {
            twins[tier.ordinal()][0] = registerFurnaceBlock(tier, false);
            twins[tier.ordinal()][1] = registerFurnaceBlock(tier, true);
        }
    }

    private static ETIMBlockFurnace registerFurnaceBlock(ETIMFurnaceTier tier, boolean burning) {
        ETIMBlockFurnace block = new ETIMBlockFurnace(tier, burning);
        net.minecraftforge.fml.common.registry.ForgeRegistries.BLOCKS.register(block);
        if (burning) {
            // Vanilla registers LIT_FURNACE with an ItemAir (no real item).
            net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.register(
                    new ItemAir(block).setRegistryName(block.getRegistryName()));
        } else {
            ItemBlock item = new ItemBlock(block);
            item.setRegistryName(block.getRegistryName());
            net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.register(item);
        }
        return block;
    }

    private static void registerOres() {
        ORE_COPPER = registerOre(new ETIMBlockOre("ore_copper", 2.5F, 2));
        ORE_SILVER = registerOre(new ETIMBlockOre("ore_silver", 2.5F, 2));
        ORE_MITHRIL = registerOre(new ETIMBlockOre("ore_mithril", 3.5F, 3));
        ORE_ADAMANTIUM = registerOre(new ETIMBlockOre("ore_adamantium", 4.0F, 4));
    }

    /** underworld 批 (2026-10-25, D-2 裁定 = 新方块): the unbreakable floor block. */
    public static ETIMBlockMantleOrCore MANTLE_OR_CORE;

    /** underworld 二阶段 T1: the R196 portal block (destination metadata 0/1/2). */
    public static io.github.etim.etim.world.ETIMBlockPortal PORTAL;

    private static void registerMantleOrCore() {
        MANTLE_OR_CORE = new ETIMBlockMantleOrCore();
        MANTLE_OR_CORE.setRegistryName(new ResourceLocation(ETIM.MOD_ID, "mantle_or_core"));
        net.minecraftforge.fml.common.registry.ForgeRegistries.BLOCKS.register(MANTLE_OR_CORE);
        // R196 canBeCarried=false → no ItemBlock.
        ETIM.LOGGER.info("[FurnaceLog] underworld floor block registered: mantle_or_core (unbreakable, light 0.9) [server]");
    }

    private static ETIMBlockOre registerOre(ETIMBlockOre block) {
        net.minecraftforge.fml.common.registry.ForgeRegistries.BLOCKS.register(block);
        ItemBlock item = new ItemBlock(block);
        item.setRegistryName(block.getRegistryName());
        net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.register(item);
        return block;
    }

    /**
     * 金属砧块批 — the six metal anvils (R196 Block :876-888/:959-961 对位).
     * Durability column (EnumEquipmentMaterial :9-15): copper/silver/gold 4.0,
     * ancient 16.0, mithril 64.0, adamantium 256.0 → the repair gate + the
     * wear capacity (1600 × 31 × value, R196 BlockAnvil :191-197). Item stack
     * 1 (R196 BlockAnvil :19).
     */
    private static void registerAnvils() {
        ANVIL_COPPER = registerAnvil(new ETIMBlockAnvil("anvil_copper", 4.0F));
        ANVIL_SILVER = registerAnvil(new ETIMBlockAnvil("anvil_silver", 4.0F));
        ANVIL_GOLD = registerAnvil(new ETIMBlockAnvil("anvil_gold", 4.0F));
        ANVIL_ANCIENT_METAL = registerAnvil(new ETIMBlockAnvil("anvil_ancient_metal", 16.0F));
        ANVIL_MITHRIL = registerAnvil(new ETIMBlockAnvil("anvil_mithril", 64.0F));
        ANVIL_ADAMANTIUM = registerAnvil(new ETIMBlockAnvil("anvil_adamantium", 256.0F));
    }

    private static ETIMBlockAnvil registerAnvil(ETIMBlockAnvil block) {
        net.minecraftforge.fml.common.registry.ForgeRegistries.BLOCKS.register(block);
        ItemBlock item = new ItemBlock(block);
        item.setMaxStackSize(1); // R196 BlockAnvil :19
        item.setRegistryName(block.getRegistryName());
        net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.register(item);
        return block;
    }

    /**
     * 金属砧块批 T2① — the five metal storage blocks (补-2: R196 BlockOreStorage
     * :4-10 — harvest = grade + 1, stack 4, hardness = the 1.2 × durability
     * relative form; gold/iron stay vanilla, A-1 定谳).
     */
    private static void registerStorageBlocks() {
        STORAGE_COPPER = registerStorage(new ETIMBlockStorage("storage_copper", ETIMMetals.COPPER.grade + 1, 4.8F));
        STORAGE_SILVER = registerStorage(new ETIMBlockStorage("storage_silver", ETIMMetals.SILVER.grade + 1, 4.8F));
        STORAGE_ANCIENT_METAL = registerStorage(new ETIMBlockStorage("storage_ancient_metal", ETIMMetals.ANCIENT_METAL.grade + 1, 19.2F));
        STORAGE_MITHRIL = registerStorage(new ETIMBlockStorage("storage_mithril", ETIMMetals.MITHRIL.grade + 1, 76.8F));
        STORAGE_ADAMANTIUM = registerStorage(new ETIMBlockStorage("storage_adamantium", ETIMMetals.ADAMANTIUM.grade + 1, 307.2F));
    }

    private static ETIMBlockStorage registerStorage(ETIMBlockStorage block) {
        net.minecraftforge.fml.common.registry.ForgeRegistries.BLOCKS.register(block);
        ItemBlock item = new ItemBlock(block);
        item.setMaxStackSize(4); // R196 BlockOreStorage :8
        item.setRegistryName(block.getRegistryName());
        net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.register(item);
        return block;
    }

    private static void registerRecipes() {
        // --- furnace crafting (R196 RecipesMITE.java:259-263, skill gate dropped)
        GameRegistry.addShapedRecipe(key("furnace_clay"), null, new ItemStack(FURNACE_CLAY),
                "##", "##", '#', Blocks.CLAY);
        GameRegistry.addShapedRecipe(key("furnace_sandstone"), null, new ItemStack(FURNACE_SANDSTONE),
                "###", "# #", "###", '#', Blocks.SANDSTONE);
        GameRegistry.addShapedRecipe(key("furnace_hardened_clay"), null, new ItemStack(FURNACE_HARDENED_CLAY),
                "###", "# #", "###", '#', Blocks.HARDENED_CLAY);
        GameRegistry.addShapedRecipe(key("furnace_obsidian"), null, new ItemStack(FURNACE_OBSIDIAN),
                "###", "# #", "###", '#', Blocks.OBSIDIAN);
        GameRegistry.addShapedRecipe(key("furnace_netherrack"), null, new ItemStack(FURNACE_NETHERRACK),
                "###", "# #", "###", '#', Blocks.NETHERRACK);

        // --- ore → ingot smelting (R196 :492-496; iron row is vanilla-native;
        //     ancient metal has NO ore row — chest loot only, G-FB-11)
        FurnaceRecipes.instance().addSmelting(Item.getItemFromBlock(ORE_COPPER), new ItemStack(ETIMItems.ingotCopper), 0.0F);
        FurnaceRecipes.instance().addSmelting(Item.getItemFromBlock(ORE_SILVER), new ItemStack(ETIMItems.ingotSilver), 0.0F);
        FurnaceRecipes.instance().addSmelting(Item.getItemFromBlock(ORE_MITHRIL), new ItemStack(ETIMItems.ingotMithril), 0.0F);
        FurnaceRecipes.instance().addSmelting(Item.getItemFromBlock(ORE_ADAMANTIUM), new ItemStack(ETIMItems.ingotAdamantium), 0.0F);

        // --- 9:1 nugget ↔ ingot (the vanilla gold pattern)
        for (int i = 0; i < ETIMItems.nuggets().size(); i++) {
            Item nugget = ETIMItems.nuggets().get(i);
            Item ingot = ETIMItems.ingots().get(i);
            String path = nugget.getRegistryName().getPath();
            net.minecraft.item.crafting.Ingredient[] nuggets = new net.minecraft.item.crafting.Ingredient[9];
            for (int n = 0; n < 9; n++) {
                nuggets[n] = net.minecraft.item.crafting.Ingredient.fromStacks(new ItemStack(nugget));
            }
            GameRegistry.addShapelessRecipe(key("ingot_from_nuggets_" + path), null,
                    new ItemStack(ingot), nuggets);
            GameRegistry.addShapelessRecipe(key("nuggets_from_ingot_" + path), null,
                    new ItemStack(nugget, 9), net.minecraft.item.crafting.Ingredient.fromStacks(new ItemStack(ingot)));
        }

        // --- required-heat rows (R196 TileEntityFurnace.getHeatLevelRequired :219-241)
        FurnaceHeat.addRequiredHeat(Item.getItemFromBlock(ORE_COPPER), 2);
        FurnaceHeat.addRequiredHeat(Item.getItemFromBlock(ORE_SILVER), 2);
        FurnaceHeat.addRequiredHeat(Item.getItemFromBlock(ORE_MITHRIL), 3);
        FurnaceHeat.addRequiredHeat(Item.getItemFromBlock(ORE_ADAMANTIUM), 4);

        // --- 金属砧块批: storage block ↔ ingot, both directions (A-1 正本 =
        //     R196 RecipesIngots recipeItems :29-45 — 9 ingots → 1 block
        //     "###"×3; 1 block → 9 ingots "#"; skillsets dropped F-8-23=B)
        registerStorageRecipe(STORAGE_COPPER, ETIMItems.ingotCopper, "copper");
        registerStorageRecipe(STORAGE_SILVER, ETIMItems.ingotSilver, "silver");
        registerStorageRecipe(STORAGE_MITHRIL, ETIMItems.ingotMithril, "mithril");
        registerStorageRecipe(STORAGE_ADAMANTIUM, ETIMItems.ingotAdamantium, "adamantium");
        registerStorageRecipe(STORAGE_ANCIENT_METAL, ETIMItems.ingotAncientMetal, "ancient_metal");

        // --- 金属砧块批: the six metal anvils (R196 RecipesMITE :264-275 —
        //     "III" / " i " / "iii": 3 storage blocks + 7 ingots; the gold
        //     row rides the vanilla block/ingot, A-1 定谳)
        GameRegistry.addShapedRecipe(key("anvil_copper"), null, new ItemStack(ANVIL_COPPER),
                "III", " i ", "iii", 'I', STORAGE_COPPER, 'i', ETIMItems.ingotCopper);
        GameRegistry.addShapedRecipe(key("anvil_silver"), null, new ItemStack(ANVIL_SILVER),
                "III", " i ", "iii", 'I', STORAGE_SILVER, 'i', ETIMItems.ingotSilver);
        GameRegistry.addShapedRecipe(key("anvil_gold"), null, new ItemStack(ANVIL_GOLD),
                "III", " i ", "iii", 'I', Blocks.GOLD_BLOCK, 'i', Items.GOLD_INGOT);
        GameRegistry.addShapedRecipe(key("anvil_mithril"), null, new ItemStack(ANVIL_MITHRIL),
                "III", " i ", "iii", 'I', STORAGE_MITHRIL, 'i', ETIMItems.ingotMithril);
        GameRegistry.addShapedRecipe(key("anvil_adamantium"), null, new ItemStack(ANVIL_ADAMANTIUM),
                "III", " i ", "iii", 'I', STORAGE_ADAMANTIUM, 'i', ETIMItems.ingotAdamantium);
        GameRegistry.addShapedRecipe(key("anvil_ancient_metal"), null, new ItemStack(ANVIL_ANCIENT_METAL),
                "III", " i ", "iii", 'I', STORAGE_ANCIENT_METAL, 'i', ETIMItems.ingotAncientMetal);

        ETIM.LOGGER.info("[FurnaceLog] batch B1 metal content registered: 10 furnace blocks, 4 ores, 10 metal items, "
                + "4 smelting rows, 9:1 conversions, 4 heat rows [server]");
        ETIM.LOGGER.info("[TestLog] metal anvil batch registered: 6 anvil blocks, 5 storage blocks, "
                + "6 anvil recipes, 10 storage-recipes [server]");
    }

    /** 金属砧块批 — the RecipesIngots pair for one storage block (§一 正本). */
    private static void registerStorageRecipe(ETIMBlockStorage block, Item ingot, String metal) {
        GameRegistry.addShapedRecipe(key("storage_" + metal + "_from_ingots"), null,
                new ItemStack(block), "###", "###", "###", '#', ingot);
        GameRegistry.addShapelessRecipe(key("ingots_from_storage_" + metal), null,
                new ItemStack(ingot, 9), net.minecraft.item.crafting.Ingredient.fromStacks(new ItemStack(block)));
    }

    private static ResourceLocation key(String path) {
        return new ResourceLocation(ETIM.MOD_ID, path);
    }

    /** The idle/burning block of a tier (R196 getIdleBlockID/getActiveBlockID). */
    public static ETIMBlockFurnace twinOf(ETIMFurnaceTier tier, boolean burning) {
        return twins[tier.ordinal()][burning ? 1 : 0];
    }

    public static ETIMBlockFurnace idleOf(ETIMFurnaceTier tier) {
        return twins[tier.ordinal()][0];
    }

    private ETIMBlocks() {
    }
}
