package io.github.etim.etim.farm;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.nutrition.NutritionSystem;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.item.Item;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * Drought-death batch (B-8): the dead-plant carriers — one class, many
 * instances (ETIMBlockOre multi-instance precedent). No ItemBlock either
 * (R196 canBeCarried false; portal NA-28 precedent).
 *
 * <p>B-68 (user D-2): the single wheat carrier grows into the four R196
 * families — wheat ({@code cropsDead} 7 textures), carrot/potato (3 each),
 * onion (4). The living onion crop (R196 block 234) and its seed-food item
 * (R196 {@code Item.onion}) join the same registration pass.</p>
 */
public final class ETIMFarmBlocks {

    /** R196 Block.onions 234 — the living onion crop. */
    public static ETIMBlockOnion ONION_CROP;
    /** R196 Item.onion 931 — seed + food, one identity. */
    public static Item ONION_ITEM;
    /** R196 Block.bush 249 — the berry bush (B-71, census F:125). */
    public static ETIMBlockBush BUSH;
    /** The bush's ItemBlock (R196 stack 8). */
    public static Item BUSH_ITEM;
    /** R196 Item.blueberries 969 — the berry food. */
    public static Item BLUEBERRIES;

    private ETIMFarmBlocks() {
    }

    public static void register() {
        ETIMBlockDeadPlant.DEAD_CROP = new ETIMBlockDeadPlant("dead_crop", false);
        ETIMBlockDeadPlant.DEAD_STEM = new ETIMBlockDeadPlant("dead_stem", true);
        ETIMBlockDeadPlant.DEAD_CARROT = new ETIMBlockDeadPlant("dead_carrot", false);
        ETIMBlockDeadPlant.DEAD_POTATO = new ETIMBlockDeadPlant("dead_potato", false);
        ETIMBlockDeadPlant.DEAD_ONION = new ETIMBlockDeadPlant("dead_onion", false);
        ForgeRegistries.BLOCKS.register(ETIMBlockDeadPlant.DEAD_CROP);
        ForgeRegistries.BLOCKS.register(ETIMBlockDeadPlant.DEAD_STEM);
        ForgeRegistries.BLOCKS.register(ETIMBlockDeadPlant.DEAD_CARROT);
        ForgeRegistries.BLOCKS.register(ETIMBlockDeadPlant.DEAD_POTATO);
        ForgeRegistries.BLOCKS.register(ETIMBlockDeadPlant.DEAD_ONION);

        ONION_CROP = new ETIMBlockOnion();
        ONION_CROP.setRegistryName(ETIM.MOD_ID, "onions");
        ONION_CROP.setTranslationKey("etim.onions");
        ForgeRegistries.BLOCKS.register(ONION_CROP);

        ONION_ITEM = new ETIMItemOnion(ONION_CROP);
        ONION_ITEM.setRegistryName(ETIM.MOD_ID, "onion");
        ONION_ITEM.setTranslationKey("etim.onion");
        ONION_ITEM.setCreativeTab(CreativeTabs.FOOD);
        ForgeRegistries.ITEMS.register(ONION_ITEM);
        // R196 Item.onion = ItemSeedFood(..., satiation 1, nutrition 1,
        // no protein, phytonutrients, no fats).
        NutritionSystem.addEtimFood(ONION_ITEM, 1, 1, 0, false, false, true);

        // B-71 (census F:125): the R196 berry bush — block 249, one subtype
        // (blueberry), meta 12 on every drop, ItemBlock stack 8.
        BUSH = new ETIMBlockBush();
        BUSH.setRegistryName(ETIM.MOD_ID, "bush");
        BUSH.setTranslationKey("etim.bush");
        ForgeRegistries.BLOCKS.register(BUSH);

        net.minecraft.item.ItemBlock bushItem = new net.minecraft.item.ItemBlock(BUSH);
        bushItem.setRegistryName(ETIM.MOD_ID, "bush");
        bushItem.setTranslationKey("etim.bush");
        bushItem.setCreativeTab(CreativeTabs.DECORATIONS);
        ForgeRegistries.ITEMS.register(bushItem);
        BUSH_ITEM = bushItem;
        net.minecraft.init.Blocks.FIRE.setFireInfo(BUSH, 30, 50);   // R196 BlockFire.java:51

        // R196 Item.blueberries = ItemFood(969, ..., satiation 1, nutrition 1,
        // sugar 1000, no protein/fats, phytonutrients).
        BLUEBERRIES = new net.minecraft.item.ItemFood(1, 0.6F, false);
        BLUEBERRIES.setRegistryName(ETIM.MOD_ID, "blueberries");
        BLUEBERRIES.setTranslationKey("etim.blueberries");
        BLUEBERRIES.setCreativeTab(CreativeTabs.FOOD);
        ForgeRegistries.ITEMS.register(BLUEBERRIES);
        NutritionSystem.addEtimFood(BLUEBERRIES, 1, 1, 1000, false, false, true);

        ETIM.LOGGER.info("[FarmLog] dead-plant carriers registered "
                + "(dead_crop/dead_stem/dead_carrot/dead_potato/dead_onion, no ItemBlock) "
                + "+ onion crop/item + bush/blueberries [server]");
    }

    /** The onion seed/crop item — null until {@link #register()} ran. */
    public static Item onionItem() {
        return ONION_ITEM;
    }
}
