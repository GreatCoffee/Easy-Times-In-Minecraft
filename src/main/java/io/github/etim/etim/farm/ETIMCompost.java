package io.github.etim.etim.farm;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.tileentity.TileEntityChest;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Manure-source batch (audit20 B-7): the R196 {@code TileEntityChest} worm
 * composting chain, transcribed verbatim.
 *
 * <p>R196 one-hand (裸文件名引用):</p>
 * <ul>
 *   <li>{@code TileEntityChest.java:303-371} — {@code checkForWormComposting}:
 *       per selection event one roll per LIVE WORM; the worm pair (wormRaw in
 *       the chest) is the requirement (:289-301). A roll picks a random
 *       compostable slot (:409-421), gates
 *       {@code worldObj.rand.nextInt((int)(100 * value)) == 0} (:316-318),
 *       eats ONE item (:340), credits {@code compost += value} (:341), and
 *       settles the remains (:325-363) BEFORE immediately converting
 *       (:365).</li>
 *   <li>{@code TileEntityChest.java:373-385} — {@code
 *       convertAsMuchCompostAsPossible}: while {@code compost >= 1.0F} and
 *       the chest can accept one more manure, +1 manure and {@code
 *       compost--}.</li>
 *   <li>{@code TileEntityChest.java:387-407} — {@code
 *       canChestAcceptOneItem}: first a stack of the SAME item below max
 *       size, then (only when {@code ignore_empty_slots = false}) the first
 *       empty slot.</li>
 *   <li>{@code Item.java:2026-2034} — the value table: flour 0.8 / wheat 0.5
 *       / paper 0.1, else {@code (getSatiation(null) + getNutrition()) *
 *       0.1F}; {@code ItemBlock.java:253-268} hay {@code wheat * 9}, leaves
 *       + vine 1.0, melon + pumpkin (incl. lit) 2.0, mushrooms + tall grass
 *       + waterlily 0.5, flowers 0.25, cake 2.4; per-item zero overrides:
 *       {@code ItemSeeds.java:58} (all seeds), {@code ItemEgg.java:41},
 *       {@code ItemDeadBush.java:19}, {@code ItemMeat.java:18} (wormRaw 0,
 *       wormCooked 0.1, COOKED mirrors the RAW value), {@code
 *       ItemBucketMilk.java:60}, {@code ItemFood.java:131} (golden apple +
 *       golden carrot 0).</li>
 *   <li>Remains ({@code ItemBlock.java:271-274}, {@code ItemBowl.java:204}):
 *       melon → melon seeds; pumpkin (incl. lit) → pumpkin seeds; bowls →
 *       the empty vessel. The LIT pumpkin carries a SECOND remain at chest
 *       level: a torch ({@code TileEntityChest.java:355-363}).</li>
 * </ul>
 *
 * <p>1.12 carriers: WHEAT/PAPER/EGG/GOLDEN_APPLE family/MILK_BUCKET/DEADBUSH/seeds are
 * the vanilla items; the mushroom ITEMS (the form a chest holds) follow the
 * R196 mushroom BLOCK face (instanceof {@code BlockMushroom} → 0.5), NOT the
 * nutrition-registry food face — MITE places/plants through that same item.
 * The R196 flour (0.8) has no 1.12 item (grep flour = 0 hits) — the entry is
 * dropped, not approximated.</p>
 */
public final class ETIMCompost {

    /** Duck interface the chest mixin soft-implements (per-TE compost float). */
    public interface Carry {
        float etim$getCompost();

        void etim$setCompost(float value);
    }

    private static Item hayItem;
    private static Item melonItem;
    private static Item pumpkinItem;
    private static Item pumpkinLitItem;
    private static Item tallgrassItem;
    private static Item waterlilyItem;
    private static Item cakeItem;
    private static Item brownMushroomItem;
    private static Item redMushroomItem;
    private static Item leavesItem;
    private static Item leaves2Item;
    private static Item vineItem;
    private static Item redFlowerItem;
    private static Item yellowFlowerItem;
    private static Item deadbushItem;
    private static Item torchItem;

    private ETIMCompost() {
    }

    /** R196 {@code canBeCompostedByWorms} — value &gt; 0. */
    public static boolean compostable(ItemStack stack) {
        return compostValue(stack) > 0.0F;
    }

    /**
     * R196 {@code getCompostingValue} — the one-hand table above; unregistered
     * non-foods read 0 (nutritional default 0). Never negative.
     */
    public static float compostValue(ItemStack stack) {
        if (stack == null || stack.isEmpty()) {
            return 0.0F;
        }
        Item item = stack.getItem();
        float value = specialValue(item, stack);
        if (value >= 0.0F) {
            return value; // a special row (may be 0.0F) — override resolved
        }
        // Default: R196 (satiation + nutrition) * 0.1 over the nutrition
        // registry; unregistered items (plain non-foods) read 0.
        io.github.etim.etim.nutrition.NutritionSystem.FoodValue fv =
                io.github.etim.etim.nutrition.NutritionSystem.getFoodValue(stack);
        return fv == null ? 0.0F : (fv.satiation + fv.nutrition) * 0.1F;
    }

    /**
     * R196 {@code getCompostingRemains} — null when none; chest-level
     * extra remains (lit pumpkin torch) settle inside the pump, not here.
     */
    public static Item compostRemains(ItemStack stack) {
        if (stack.isEmpty()) {
            return null;
        }
        Item item = stack.getItem();
        ensureItems();
        if (item == melonItem) {
            return Items.MELON_SEEDS; // ItemBlock.java:273
        }
        if (item == pumpkinItem || item == pumpkinLitItem) {
            return Items.PUMPKIN_SEEDS; // ItemBlock.java:273
        }
        if (item == Items.MUSHROOM_STEW) {
            return Items.BOWL; // ItemBowl.java:205 getEmptyVessel face
        }
        return null; // Item.java:2036-2038 default null
    }

    /** LIT-pumpkin face: the chest adds a torch remain at its own level. */
    private static boolean litPumpkin(ItemStack stack) {
        ensureItems();
        return stack.getItem() == pumpkinLitItem;
    }

    private static void ensureItems() {
        if (hayItem == null) {
            hayItem = Item.getItemFromBlock(Blocks.HAY_BLOCK);
            melonItem = Item.getItemFromBlock(Blocks.MELON_BLOCK);
            pumpkinItem = Item.getItemFromBlock(Blocks.PUMPKIN);
            pumpkinLitItem = Item.getItemFromBlock(Blocks.LIT_PUMPKIN);
            tallgrassItem = Item.getItemFromBlock(Blocks.TALLGRASS);
            waterlilyItem = Item.getItemFromBlock(Blocks.WATERLILY);
            cakeItem = Item.getItemFromBlock(Blocks.CAKE);
            brownMushroomItem = Item.getItemFromBlock(Blocks.BROWN_MUSHROOM);
            redMushroomItem = Item.getItemFromBlock(Blocks.RED_MUSHROOM);
            leavesItem = Item.getItemFromBlock(Blocks.LEAVES);
            leaves2Item = Item.getItemFromBlock(Blocks.LEAVES2);
            vineItem = Item.getItemFromBlock(Blocks.VINE);
            redFlowerItem = Item.getItemFromBlock(Blocks.RED_FLOWER);
            yellowFlowerItem = Item.getItemFromBlock(Blocks.YELLOW_FLOWER);
            deadbushItem = Item.getItemFromBlock(Blocks.DEADBUSH);
            torchItem = Item.getItemFromBlock(Blocks.TORCH);
        }
    }

    /**
     * Special rows, R196 order. Returns a value ≥ 0 for a resolved row, or
     * -1 for "not special — fall to the (sat+nut)*0.1 default".
     */
    private static float specialValue(Item item, ItemStack stack) {
        ensureItems();
        // ItemBlock block faces, by ITEM identity (ItemBlock.java:253-268)
        if (item == hayItem) {
            return 0.5F * 9.0F; // Item.wheat * 9
        }
        if (item == leavesItem || item == leaves2Item || item == vineItem) {
            return 1.0F;
        }
        if (item == melonItem || item == pumpkinItem || item == pumpkinLitItem) {
            return 2.0F;
        }
        if (item == brownMushroomItem || item == redMushroomItem
                || item == tallgrassItem || item == waterlilyItem) {
            return 0.5F;
        }
        if (item == redFlowerItem || item == yellowFlowerItem) {
            return 0.25F; // R196 BlockFlower face
        }
        if (item == cakeItem) {
            return 2.4F;
        }
        if (item == Items.WHEAT) {
            return 0.5F;
        }
        if (item == Items.PAPER) {
            return 0.1F;
        }
        if (item == io.github.etim.etim.fishing.ETIMFishingItems.wormRaw) {
            return 0.0F; // ItemMeat.java:19
        }
        if (item == io.github.etim.etim.fishing.ETIMFishingItems.wormCooked) {
            return 0.1F; // ItemMeat.java:21
        }
        // Zero rows (one-hand overrides)
        if (item == Items.GOLDEN_APPLE || item == Items.GOLDEN_CARROT
                || item == Items.EGG || item == Items.MILK_BUCKET
                || item == deadbushItem
                || item == Items.WHEAT_SEEDS || item == Items.PUMPKIN_SEEDS
                || item == Items.MELON_SEEDS) {
            return 0.0F;
        }
        // Cooked meats mirror the RAW value (ItemMeat.java:24, itemID-1 face):
        // porkRaw (4+4)->0.8, beefRaw (5+5)->1.0, chickenRaw (3+3)->0.6,
        // lambchopRaw (3+3)->0.6 (Item.java:621/:2051), fish by meta mirror.
        if (item == Items.COOKED_PORKCHOP) {
            return 0.8F;
        }
        if (item == Items.COOKED_BEEF) {
            return 1.0F;
        }
        if (item == Items.COOKED_CHICKEN || item == Items.COOKED_MUTTON) {
            return 0.6F;
        }
        if (item == Items.COOKED_FISH) {
            int meta = stack.getItemDamage();
            return meta == 0 ? 0.6F : (meta == 1 ? 1.0F : 0.0F);
        }
        return -1.0F;
    }

    // ------------------------------------------------------------------ pump

    /**
     * The R196 selection event (one chest random tick). {@code rand} is the
     * caller's world rand — the 1.12 randomTick shares the MITE statistical
     * cadence (randomTickSpeed gate {@code WorldServer.java:494}).
     */
    public static void checkForWormComposting(TileEntityChest chest, World world, BlockPos pos, Random rand) {
        if (!ETIMConfig.chestWormCompostR196 || world.isRemote) {
            return;
        }
        Carry carry = (Carry) chest;
        int numWorms = numLiveWorms(chest);
        if (numWorms < 1) {
            return; // TileEntityChest.java:305 pair gate
        }
        if (carry.etim$getCompost() >= 1.0F) {
            convertAsMuchCompostAsPossible(chest, pos);
            return; // :306-308 — the compost-bank face skips fresh rolls
        }
        double manureProduced = 0.0;
        float compostBefore = carry.etim$getCompost();
        List<String> foods = new ArrayList<>();
        for (int i = 0; i < numWorms; i++) {
            int sourceIndex = getIndexOfRandomWormFood(chest, rand);
            if (sourceIndex < 0) {
                break; // :311-313 no food left
            }
            ItemStack source = chest.getStackInSlot(sourceIndex);
            float value = compostValue(source);
            int chanceIn = (int) (100.0F * value);
            if (chanceIn <= 0) {
                continue; // value < 0.01 — R196 would throw; our table floors at 0.1
            }
            if (rand.nextInt(chanceIn) != 0) {
                continue; // :318 the roll misses
            }
            int requiredEmpty = 0;
            int manureIndex = canChestAcceptOneItem(chest, manureItem(), true);
            if (manureIndex < 0) {
                requiredEmpty++;
            }
            Item remains = compostRemains(source);
            int remainsIndex = remains == null ? -1 : canChestAcceptOneItem(chest, remains, true);
            if (remains != null && remainsIndex < 0) {
                requiredEmpty++;
            }
            if (litPumpkin(source) && canChestAcceptOneItem(chest, torchItem(), true) < 0) {
                requiredEmpty++;
            }
            if (requiredEmpty > 0 && source.getCount() == 1) {
                requiredEmpty--; // :335 the food slot frees itself
            }
            if (numEmptySlots(chest) < requiredEmpty) {
                continue; // :339 no room — the roll is voided
            }
            // --- success path (:340-365)
            chest.decrStackSize(sourceIndex, 1);
            float compost = carry.etim$getCompost() + value;
            carry.etim$setCompost(compost);
            if (remains != null) {
                int idx = remainsIndex;
                if (idx < 0) {
                    idx = canChestAcceptOneItem(chest, remains, false);
                }
                settleRemain(chest, idx, remains);
            }
            if (litPumpkin(source)) {
                int idx = canChestAcceptOneItem(chest, torchItem(), false);
                if (idx >= 0) {
                    settleRemain(chest, idx, torchItem()); // :355-363
                }
            }
            int converted = convertAsMuchCompostAsPossible(chest, pos); // :365
            manureProduced += converted;
            foods.add(source.getItem().getRegistryName() + "#" + value);
        }
        if (!foods.isEmpty()) {
            ETIMFarm.row("compost src=chest pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " worms=" + numWorms + " hits=" + foods.size()
                    + " foods=" + String.join("|", foods)
                    + " compost=" + fmt2(compostBefore) + "->" + fmt2(carry.etim$getCompost())
                    + " manure=" + (int) manureProduced);
        }
    }

    /** TileEntityChest.java:373-385 — returns the manure count produced. */
    private static int convertAsMuchCompostAsPossible(TileEntityChest chest, BlockPos pos) {
        Carry carry = (Carry) chest;
        int produced = 0;
        while (carry.etim$getCompost() >= 1.0F) {
            int idx = canChestAcceptOneItem(chest, manureItem(), false);
            if (idx < 0) {
                break; // the chest is full — the compost bank stays
            }
            ItemStack inSlot = chest.getStackInSlot(idx);
            if (inSlot.isEmpty()) {
                chest.setInventorySlotContents(idx, new ItemStack(manureItem()));
            } else {
                inSlot.grow(1);
            }
            carry.etim$setCompost(carry.etim$getCompost() - 1.0F);
            produced++;
        }
        if (produced > 0) {
            ETIMFarm.row("compost src=chest-convert pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " manure=" + produced + " compost=" + fmt2(carry.etim$getCompost()));
        }
        return produced;
    }

    private static void settleRemain(TileEntityChest chest, int idx, Item remain) {
        ItemStack inSlot = chest.getStackInSlot(idx);
        if (inSlot.isEmpty()) {
            chest.setInventorySlotContents(idx, new ItemStack(remain));
        } else {
            inSlot.grow(1);
        }
    }

    /** TileEntityChest.java:289-301 — wormRaw stackSize total. */
    public static int numLiveWorms(TileEntityChest chest) {
        Item worm = io.github.etim.etim.fishing.ETIMFishingItems.wormRaw;
        int num = 0;
        for (int i = 0; i < chest.getSizeInventory(); i++) {
            ItemStack stack = chest.getStackInSlot(i);
            if (!stack.isEmpty() && stack.getItem() == worm) {
                num += stack.getCount();
            }
        }
        return num;
    }

    /** TileEntityChest.java:409-421 — random compostable slot. */
    private static int getIndexOfRandomWormFood(TileEntityChest chest, Random rand) {
        List<Integer> candidates = new ArrayList<>();
        for (int i = 0; i < chest.getSizeInventory(); i++) {
            ItemStack stack = chest.getStackInSlot(i);
            if (!stack.isEmpty() && compostable(stack)) {
                candidates.add(i);
            }
        }
        return candidates.isEmpty() ? -1 : candidates.get(rand.nextInt(candidates.size()));
    }

    /** TileEntityChest.java:387-407. */
    public static int canChestAcceptOneItem(TileEntityChest chest, Item item, boolean ignoreEmpty) {
        int size = chest.getSizeInventory();
        for (int i = 0; i < size; i++) {
            ItemStack stack = chest.getStackInSlot(i);
            if (!stack.isEmpty() && stack.getItem() == item && stack.getCount() < stack.getMaxStackSize()) {
                return i;
            }
        }
        if (!ignoreEmpty) {
            for (int i = 0; i < size; i++) {
                if (chest.getStackInSlot(i).isEmpty()) {
                    return i;
                }
            }
        }
        return -1;
    }

    private static int numEmptySlots(TileEntityChest chest) {
        int num = 0;
        for (int i = 0; i < chest.getSizeInventory(); i++) {
            if (chest.getStackInSlot(i).isEmpty()) {
                num++;
            }
        }
        return num;
    }

    private static Item manureItem() {
        return ETIMItemManure.item();
    }

    private static Item torchItem() {
        ensureItems();
        return torchItem;
    }

    private static String fmt2(float v) {
        return String.format("%.2f", v);
    }

    /** /etest chestio peek — the [FarmLog] dump face. */
    public static void peekChest(TileEntityChest chest, BlockPos pos) {
        Carry carry = (Carry) chest;
        StringBuilder sb = new StringBuilder("chest-peek pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                + " worms=" + numLiveWorms(chest)
                + " compost=" + fmt2(carry.etim$getCompost()));
        for (int i = 0; i < chest.getSizeInventory(); i++) {
            ItemStack stack = chest.getStackInSlot(i);
            if (!stack.isEmpty()) {
                sb.append(" [" + i + "]=" + stack.getItem().getRegistryName() + "#" + stack.getCount());
            }
        }
        ETIMFarm.row(sb.toString());
        ETIM.LOGGER.info("[FarmLog] " + sb + " [server]");
    }
}
