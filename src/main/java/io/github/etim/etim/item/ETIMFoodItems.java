package io.github.etim.etim.item;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.nutrition.NutritionSystem;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraftforge.fml.common.registry.GameRegistry;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * B-65 · 食物 / 容器 / 货币注册入口（F-2）。
 *
 * <p>碗族 15 件（D-1 全量，空碗复用原版 {@code minecraft:bowl}），
 * 货币 6 件（D-6 全量）。注册顺序：物品 → 空器绑定 → 营养表行，
 * 末尾挂空碗燃料 200 tick。</p>
 *
 * <p>判定源：{@code Item.java:37-736} 的碗/币注册段，以及
 * {@code ItemBowl.java:112-198} 的 peer 表。</p>
 */
public final class ETIMFoodItems {

    public static Item bowlMushroomStew;
    public static Item bowlMilk;
    public static Item bowlWater;
    public static Item bowlBeefStew;
    public static Item bowlChickenSoup;
    public static Item bowlVegetableSoup;
    public static Item bowlIceCream;
    public static Item bowlSalad;
    public static Item bowlCreamOfMushroomSoup;
    public static Item bowlCreamOfVegetableSoup;
    public static Item bowlPumpkinSoup;
    public static Item bowlMashedPotato;
    public static Item bowlSorbet;
    public static Item bowlPorridge;
    public static Item bowlCereal;

    public static Item coinCopper;
    public static Item coinSilver;
    public static Item coinGold;
    public static Item coinAncient;
    public static Item coinMithril;
    public static Item coinAdamantium;

    private ETIMFoodItems() {
    }

    public static void register() {
        bowlMushroomStew = bowl("bowl_mushroom_stew", ETIMBowlContents.MUSHROOM_STEW);
        bowlMilk = bowl("bowl_milk", ETIMBowlContents.MILK);
        bowlWater = bowl("bowl_water", ETIMBowlContents.WATER);
        bowlBeefStew = bowl("bowl_beef_stew", ETIMBowlContents.BEEF_STEW);
        bowlChickenSoup = bowl("bowl_chicken_soup", ETIMBowlContents.CHICKEN_SOUP);
        bowlVegetableSoup = bowl("bowl_vegetable_soup", ETIMBowlContents.VEGETABLE_SOUP);
        bowlIceCream = bowl("bowl_ice_cream", ETIMBowlContents.ICE_CREAM);
        bowlSalad = bowl("bowl_salad", ETIMBowlContents.SALAD);
        bowlCreamOfMushroomSoup = bowl("bowl_cream_of_mushroom_soup", ETIMBowlContents.CREAM_OF_MUSHROOM_SOUP);
        bowlCreamOfVegetableSoup = bowl("bowl_cream_of_vegetable_soup", ETIMBowlContents.CREAM_OF_VEGETABLE_SOUP);
        bowlPumpkinSoup = bowl("bowl_pumpkin_soup", ETIMBowlContents.PUMPKIN_SOUP);
        bowlMashedPotato = bowl("bowl_mashed_potato", ETIMBowlContents.MASHED_POTATO);
        bowlSorbet = bowl("bowl_sorbet", ETIMBowlContents.SORBET);
        bowlPorridge = bowl("bowl_porridge", ETIMBowlContents.PORRIDGE);
        bowlCereal = bowl("bowl_cereal", ETIMBowlContents.CEREAL);

        coinCopper = coin("coin_copper", "copper", 5);
        coinSilver = coin("coin_silver", "silver", 25);
        coinGold = coin("coin_gold", "gold", 100);
        coinAncient = coin("coin_ancient_metal", "ancient_metal", 500);
        coinMithril = coin("coin_mithril", "mithril", 2500);
        coinAdamantium = coin("coin_adamantium", "adamantium", 10000);

        GameRegistry.registerFuelHandler(ETIMItemBowl::emptyBowlBurnTime);

        ETIM.LOGGER.info("[EtimInit] B-65 food items registered: 15 bowls + 6 coins");
    }

    private static Item bowl(String name, ETIMBowlContents contents) {
        ETIMItemBowl item = new ETIMItemBowl(contents);
        item.setRegistryName(ETIM.MOD_ID, name);
        item.setTranslationKey("etim." + name);
        item.setCreativeTab(CreativeTabs.FOOD);
        ForgeRegistries.ITEMS.register(item);
        item.etimBindVessel(Items.BOWL);
        NutritionSystem.addEtimFood(item, contents.satiation, contents.nutrition,
                contents.sugarContent, contents.protein, contents.fats, contents.phyto);
        return item;
    }

    private static Item coin(String name, String metal, int xp) {
        ETIMItemCoin item = new ETIMItemCoin(metal, xp);
        item.setRegistryName(ETIM.MOD_ID, name);
        item.setTranslationKey("etim." + name);
        item.setCreativeTab(CreativeTabs.MISC);
        ForgeRegistries.ITEMS.register(item);
        return item;
    }

    /** 开发命令用：按内容物取碗物品。 */
    public static ItemStack bowlFor(ETIMBowlContents contents) {
        Item item = ETIMItemVessel.peerForContents(contents);
        return item == null ? ItemStack.EMPTY : new ItemStack(item);
    }
}
