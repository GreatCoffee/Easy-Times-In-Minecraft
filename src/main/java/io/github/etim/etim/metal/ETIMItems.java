package io.github.etim.etim.metal;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import io.github.etim.etim.ETIM;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.item.Item;
import net.minecraft.util.ResourceLocation;

/**
 * The five metal materials batch B1 registers as raw ingredients (B-5
 * 物品面裁剪: nugget + ingot only — the tool/weapon/armor/chain faces ride
 * batch B2). Five metals: copper / silver / mithril / adamantium /
 * ancient-metal (gold and iron keep the vanilla items).
 *
 * <p>Smelt XP rows (终审 G-FB-9: copper 10 / silver 15 / mithril 40 /
 * ancient 20 / adamantium 100) wire onto FurnaceXpRewards here — the
 * furnace take pays them (audit 9 §1.4, batch C face).</p>
 */
public final class ETIMItems {

    public static Item nuggetCopper;
    public static Item nuggetSilver;
    public static Item nuggetMithril;
    public static Item nuggetAdamantium;
    public static Item nuggetAncientMetal;
    public static Item ingotCopper;
    public static Item ingotSilver;
    public static Item ingotMithril;
    public static Item ingotAdamantium;
    public static Item ingotAncientMetal;
    /** scythe/knife 批：the R196 sinew (RecipesMITE:257 皮革→4) — the flint-knife chain material. */
    public static Item sinew;

    private static final List<Item> NUGGETS = new ArrayList<>();
    private static final List<Item> INGOTS = new ArrayList<>();

    public static void register() {
        nuggetCopper = simple("nugget_copper");
        nuggetSilver = simple("nugget_silver");
        nuggetMithril = simple("nugget_mithril");
        nuggetAdamantium = simple("nugget_adamantium");
        nuggetAncientMetal = simple("nugget_ancient_metal");
        ingotCopper = simple("ingot_copper");
        ingotSilver = simple("ingot_silver");
        ingotMithril = simple("ingot_mithril");
        ingotAdamantium = simple("ingot_adamantium");
        ingotAncientMetal = simple("ingot_ancient_metal");
        sinew = simple("sinew");

        Collections.addAll(NUGGETS, nuggetCopper, nuggetSilver, nuggetMithril, nuggetAdamantium, nuggetAncientMetal);
        Collections.addAll(INGOTS, ingotCopper, ingotSilver, ingotMithril, ingotAdamantium, ingotAncientMetal);
        assertRegistered();

        // FurnaceXpRewards metal rows (batch-C take face): R196 Item.java:347-351
        io.github.etim.etim.furnace.FurnaceXpRewards.addReward(ingotCopper, 10);
        io.github.etim.etim.furnace.FurnaceXpRewards.addReward(ingotSilver, 15);
        io.github.etim.etim.furnace.FurnaceXpRewards.addReward(ingotMithril, 40);
        io.github.etim.etim.furnace.FurnaceXpRewards.addReward(ingotAncientMetal, 20);
        io.github.etim.etim.furnace.FurnaceXpRewards.addReward(ingotAdamantium, 100);
    }

    public static List<Item> nuggets() {
        return NUGGETS;
    }

    public static List<Item> ingots() {
        return INGOTS;
    }

    private static Item simple(String name) {
        Item item = new Item();
        item.setRegistryName(new ResourceLocation(ETIM.MOD_ID, name));
        item.setTranslationKey("etim." + name);
        item.setCreativeTab(CreativeTabs.MATERIALS);
        // A-2 fix (verdict B1): the ten metal items were never REGISTERED —
        // /give answered "no such item" and the 9:1 recipes failed validation
        // with "produces unregistered item" on world load.
        net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.register(item);
        return item;
    }

    /**
     * A-2 fail-fast self-check (verdict B1): every metal item must be IN the
     * item registry after registration — the A-2 class of bug used to surface
     * only at level.dat read ("produces unregistered item"), far from the
     * register call.
     */
    private static void assertRegistered() {
        for (Item item : NUGGETS) {
            ResourceLocation name = item.getRegistryName();
            if (name == null || net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.getValue(name) == null) {
                throw new IllegalStateException("etim metal item not registered: " + name);
            }
        }
        for (Item item : INGOTS) {
            ResourceLocation name = item.getRegistryName();
            if (name == null || net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS.getValue(name) == null) {
                throw new IllegalStateException("etim metal item not registered: " + name);
            }
        }
    }

    private ETIMItems() {
    }
}
