package io.github.etim.etim.fishing;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.metal.ETIMItems;

import net.minecraft.block.Block;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemFood;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ResourceLocation;

import net.minecraftforge.fml.common.registry.GameRegistry;

/**
 * Batch five item registry faces (audit20 条 268-271): the nine D-4 甲 rods,
 * the two bait worm items, and their cooking rows.
 *
 * <p>Nutrition faces (R196 Item.java valores — one-hand): {@code wormRaw
 * ItemMeat(1024, 0, 1, "worm_raw")} sat 0 / nut 1 / no protein / no fats;
 * {@code wormCooked ItemMeat(1025, 1, 1, false, true)} sat 1 / nut 1 / no
 * protein / ESSENTIAL FATS true. The rows ride the NutritionSystem registry
 * through its new ETIM-item overload (the R196 vanilla bridge items keep the
 * vanilla items untouched). The eating paths ride the vanilla ItemFood
 * pipeline (base ingestion face), amount mirrors the nutrition unit so the
 * leftover vanilla bar stays sane.</p>
 */
public final class ETIMFishingItems {

    public static Item rodFlint;
    public static Item rodObsidian;
    public static Item rodCopper;
    public static Item rodSilver;
    public static Item rodGold;
    public static Item rodIron;
    public static Item rodMithril;
    public static Item rodAdamantium;
    public static Item rodAncientMetal;
    /** R196 {@code wormRaw} (Item.java:769). */
    public static Item wormRaw;
    /** R196 {@code wormCooked} (Item.java:770). */
    public static Item wormCooked;

    private static Item[] rods;

    /** Called from ETIM preInit BEFORE the enchantment/event wiring. */
    public static void register() {
        rodFlint = rod(ETIMItemFishingRod.HookMaterial.FLINT);
        rodObsidian = rod(ETIMItemFishingRod.HookMaterial.OBSIDIAN);
        rodCopper = rod(ETIMItemFishingRod.HookMaterial.COPPER);
        rodSilver = rod(ETIMItemFishingRod.HookMaterial.SILVER);
        rodGold = rod(ETIMItemFishingRod.HookMaterial.GOLD);
        rodIron = rod(ETIMItemFishingRod.HookMaterial.IRON);
        rodMithril = rod(ETIMItemFishingRod.HookMaterial.MITHRIL);
        rodAdamantium = rod(ETIMItemFishingRod.HookMaterial.ADAMANTIUM);
        rodAncientMetal = rod(ETIMItemFishingRod.HookMaterial.ANCIENT_METAL);
        rods = new Item[]{rodFlint, rodObsidian, rodCopper, rodSilver, rodGold,
                rodIron, rodMithril, rodAdamantium, rodAncientMetal};

        // R196 wormRaw ItemMeat(id, satiation 0, nutrition 1, protein false,
        // fats false) — the vanilla ItemFood amount stays 0 on BOTH worms:
        // the satiation face is the NutritionSystem row (the vanilla bar never
        // feeds the pools in ETIM's model), and a zero amount keeps the legacy
        // bar face exactly at R196's satiation for these two.
        wormRaw = new ItemFood(0, 0.0F, false);
        register(wormRaw, "worm_raw", CreativeTabs.FOOD);
        wormCooked = new ItemFood(0, 0.0F, false);
        register(wormCooked, "worm_cooked", CreativeTabs.FOOD);

        // NutritionSystem rows (报告 §9 语义: 蚯蚓走新增重载; fish meta rows exist).
        io.github.etim.etim.nutrition.NutritionSystem.addEtimFood(wormRaw, 0, 1, 0, false, false, false);
        io.github.etim.etim.nutrition.NutritionSystem.addEtimFood(wormCooked, 1, 1, 0, false, true, false);

        // R196 Item.java:2055 setCookingResult(wormRaw, wormCooked, 0) — heat 0 face.
        GameRegistry.addSmelting(new ItemStack(wormRaw), new ItemStack(wormCooked), 0.0F);
        io.github.etim.etim.furnace.FurnaceHeat.addRequiredHeat(wormRaw, 0);

        assertRegistered();

        // Rod recipes — R196 RecipesMITE.java:100-125: rows "  /"," /|","/?|",
        // '/' = stick, '|' = Item.silk = the VANILLA string (Item.java:46),
        // '?' = the per-material hook element. The block-item bridge for the
        // obsidian shard is a C face (no shard item exists in 1.12).
        int added = 0;
        for (Item item : rods) {
            ETIMItemFishingRod rod = (ETIMItemFishingRod) item;
            String base = "fishing_rod_" + rod.hook.name;
            GameRegistry.addShapedRecipe(new ResourceLocation(ETIM.MOD_ID, base + "_recipe"), null,
                    new ItemStack(item), "  /", " /|", "/s|",
                    '/', Items.STICK, '|', Items.STRING, 's', rod.recipeHookElement());
            added++;
        }
        ETIM.LOGGER.info("[EtimInit] fishing items registered: 9 rods + 2 worms + {} rod recipes", added);
    }

    public static Item[] rods() {
        return rods;
    }

    private static Item rod(ETIMItemFishingRod.HookMaterial hook) {
        Item item = new ETIMItemFishingRod(hook);
        register(item, "fishing_rod_" + hook.name, null); // tab set in the class
        return item;
    }

    private static void register(Item item, String name, CreativeTabs tab) {
        if (tab != null) {
            item.setCreativeTab(tab);
        }
        item.setRegistryName(new ResourceLocation(ETIM.MOD_ID, name));
        item.setTranslationKey("etim." + name);
        net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.register(item);
    }

    /** The B1 assertRegistered face — fail fast, not at level.dat read. */
    private static void assertRegistered() {
        for (Item item : rods) {
            ResourceLocation name = item.getRegistryName();
            if (name == null || net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.getValue(name) == null) {
                throw new IllegalStateException("etim fishing rod not registered: " + name);
            }
        }
        for (Item item : new Item[]{wormRaw, wormCooked}) {
            ResourceLocation name = item.getRegistryName();
            if (name == null || net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.getValue(name) == null) {
                throw new IllegalStateException("etim worm item not registered: " + name);
            }
        }
    }

    private ETIMFishingItems() {
    }
}
