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

    public static Item chainCopper;
    public static Item chainSilver;
    public static Item chainMithril;
    public static Item chainAdamantium;
    public static Item chainAncientMetal;

    /** All B2 gear items in registration order (chains first, then tools, then armor). */
    public static List<Item> all() {
        return Collections.unmodifiableList(ALL);
    }

    public static void register() {
        chainCopper = chain("chain_copper");
        chainSilver = chain("chain_silver");
        chainMithril = chain("chain_mithril");
        chainAdamantium = chain("chain_adamantium");
        chainAncientMetal = chain("chain_ancient_metal");

        for (ETIMMetals metal : ETIMMetals.values()) {
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
                register("chain_" + piece.name + "_" + metal.name, new ETIMMetalArmor(metal, piece.slot, true));
            }
        }

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

    private static final class ArmorPiece {
        final String name;
        final net.minecraft.inventory.EntityEquipmentSlot slot;

        ArmorPiece(String name, net.minecraft.inventory.EntityEquipmentSlot slot) {
            this.name = name;
            this.slot = slot;
        }
    }

    private static void register(String name, Item item) {
        item.setRegistryName(new ResourceLocation(ETIM.MOD_ID, name));
        item.setTranslationKey("etim." + name);
        ForgeRegistries.ITEMS.register(item);
        ALL.add(item);
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

    /**
     * R196-shaped recipes (批文 §〇 配方形状表, 一手 RecipesTools/RecipesWeapons/
     * RecipesArmor): {@code X} = the metal ingot (chain variants use the chain
     * item), {@code /} = stick. Stage-3 timer crafting is generic at the slot
     * layer — zero per-recipe wiring.
     */
    private static void registerRecipes() {
        for (ETIMMetals metal : ETIMMetals.values()) {
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
        ETIM.LOGGER.info("[TestLog] gear recipes registered: 90 shaped rows (50 tools + 40 armor) [server]");
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
