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

    private static ETIMBlockFurnace[][] twins = new ETIMBlockFurnace[ETIMFurnaceTier.values().length][2];

    public static void register() {
        registerFurnaces();
        registerOres();
        registerRecipes();
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

    private static ETIMBlockOre registerOre(ETIMBlockOre block) {
        net.minecraftforge.fml.common.registry.ForgeRegistries.BLOCKS.register(block);
        ItemBlock item = new ItemBlock(block);
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
        ETIM.LOGGER.info("[FurnaceLog] batch B1 metal content registered: 10 furnace blocks, 4 ores, 10 metal items, "
                + "4 smelting rows, 9:1 conversions, 4 heat rows [server]");
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
