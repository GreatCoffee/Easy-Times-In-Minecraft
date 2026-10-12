package io.github.etim.etim.crafting;

import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemArrow;
import net.minecraft.item.ItemStack;

import java.util.HashMap;
import java.util.Map;

/**
 * Component crafting difficulty, in TICKS (R196 audit task 7,
 * "R196 落实耗时判定值总表" §四 — "difficulty is the number of ticks taken to
 * craft an item from start to finish", ReferenceFileWriter:683-688).
 *
 * <p>R196 derives the values per item class (ItemIngot = material.durability×100,
 * ItemNugget = ingot/9, ItemShard = rock/9, ...). ETIM's world is vanilla 1.12.2,
 * so the same first-hand values are registered here per ITEM instead, with the
 * R196 generic-ingredient value as the fallback for everything unlisted
 * (§4.1: one-family 25.0 — stick/string/feather/clay_ball/food &cc;).</p>
 *
 * <p>FAMILY mapping used below (§4.1/§4.2 first-hand):</p>
 * <ul>
 *   <li>Ingot = material.durability × 100 → iron (8.0) = 800, gold (4.0) = 400</li>
 *   <li>Nugget = ingot / 9 → gold nugget = 400/9 ≈ 44.4</li>
 *   <li>Arrow family (ItemArrow incl. tipped/spectral) = 40 (§4.2 Item.java:434-458)</li>
 *   <li>leather / reed / bone / brick / nether star / ender pearl / potion /
 *       milk bucket = 100 (§4.2 exceptions)</li>
 *   <li>blaze rod = 200 (§4.2 Item.java:232)</li>
 *   <li>coal &amp; charcoal fall to the generic 25 (§4.2 ItemCoal:25 matches generic)</li>
 * </ul>
 */
public final class CraftingDifficulty {

    /** Generic unlisted-ingredient difficulty (§4.1 one-family; configurable). */
    private static float genericDifficulty = 25.0F;


    private static final Map<Item, Float> BY_ITEM = new HashMap<>();

    static {
        // Ingot family: material.durability × 100 (§4.1 ItemIngot:11-12).
        // EnumEquipmentMaterial durability: iron 8.0, gold 4.0.
        put(Items.IRON_INGOT, 800.0F);
        put(Items.GOLD_INGOT, 400.0F);
        // Nugget family: ingot / 9 (§4.1 ItemNugget:8).
        put(Items.GOLD_NUGGET, 400.0F / 9.0F);

        // §4.2 explicit exceptions at 100.
        put(Items.LEATHER, 100.0F);
        put(Items.REEDS, 100.0F);
        put(Items.BONE, 100.0F);
        put(Items.BRICK, 100.0F);
        put(Items.NETHER_STAR, 100.0F);
        put(Items.ENDER_PEARL, 100.0F);
        put(Items.POTIONITEM, 100.0F);
        put(Items.MILK_BUCKET, 100.0F);

        // §4.2 explicit exception at 200 (Item.java:232).
        put(Items.BLAZE_ROD, 200.0F);
    }

    private static void put(Item item, float difficulty) {
        BY_ITEM.put(item, difficulty);
    }

    /**
     * R196 {@code getCraftingDifficultyAsComponent} for one stack: per-item
     * registration, otherwise the generic one-family value. Diamond (gem-as-rock)
     * has no first-hand row yet in the §四.2 survey — it intentionally falls to
     * the generic value until dumped.
     */
    public static float difficultyOf(ItemStack stack) {
        Item item = stack.getItem();
        Float registered = BY_ITEM.get(item);
        if (registered == null) {
            // §4.2 whole arrow family via class (covers tipped/spectral).
            if (item instanceof ItemArrow) {
                return 40.0F;
            }
            return genericDifficulty;
        }
        return registered;
    }

    /** Called from ETIMConfig.init once — the config owns the tunable. */
    public static void setGenericDifficulty(float value) {
        genericDifficulty = value;
    }
}
