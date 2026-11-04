package io.github.etim.etim.combat;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnchantmentData;
import net.minecraft.init.Enchantments;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemArmor;
import net.minecraft.item.ItemStack;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import io.github.etim.etim.metal.ETIMItemBattleAxe;
import io.github.etim.etim.metal.ETIMItemDagger;
import io.github.etim.etim.metal.ETIMItemKnifeFlint;
import io.github.etim.etim.metal.ETIMItemPickaxe;
import io.github.etim.etim.metal.ETIMItemScythe;
import io.github.etim.etim.metal.ETIMItemShovel;
import io.github.etim.etim.metal.ETIMItemWarHammer;

/**
 * The R196 enchantment-POOL common skeleton (batch six D-1 pool, audit20
 * 条 274-277; D 位六项用户明文 条 276). Every R196 judge value of the pool
 * machinery lives here; the [EnchLog] channel carries the judgment rows.
 *
 * <p>Pinned shape (对照报告 §1/§7 + 终审 A-6 修正集):</p>
 * <ul>
 *   <li>G1 build = the nine-step R196 {@code buildEnchantmentList}
 *       (EnchantmentHelper.java:267-327): budget ±25% jitter → per-entry
 *       highest-affordable-level map → conflict trim → weight pick → level
 *       demotion roll (NO is_book exclusion, :299 一手) → cost
 *       ({@code minCost(level)} for leveled, {@code minCost(3)} for the
 *       level-less face — C-10) − 5 per pick → {@code adj < 5 || picks > 2}
 *       break (hard cap 3) → output shuffle.</li>
 *   <li>weights = EnumRarity standard (common 100 / uncommon 25 / rare 5 /
 *       epic 1); the vanilla-22 corresponds carry their R196 rarity weight in
 *       the table below; entries without an R196 counterpart (B-15) fall back
 *       to the 1.12 rarity weight (10/5/2/1), rule D-B 甲.</li>
 *   <li>G4 altered = the sub-linear enchantability scale
 *       (EnchantmentHelper.java:225-250 — full up to E, +0.5 per point up to
 *       2E, +0.25 up to 3E, Math.round). 1.12 has NO counterpart (A-5).</li>
 *   <li>conflicts = the four R196 families (D-E 甲): Damage tri-kill, the
 *       protection family with the feather-falling exception, LootBonus ×
 *       silkTouch, Untouching × fortune (directional — the picked entry's own
 *       {@code canApplyTogether} face decides).</li>
 *   <li>book = the whole pool minus the 1.12 curse-only rows
 *       ({@code isAllowedOnBooks} — B-10/B-11 bridge note).</li>
 * </ul>
 */
public final class ETIMEnchantPool {

    private ETIMEnchantPool() {
    }

    /** [EnchLog] judgment channel gate (not Discipline 9 (<uses-enchantDebugLog>)). */
    public static void row(String line) {
        if (ETIMConfig.enchantDebugLog) {
            ETIM.LOGGER.info("[EnchLog] " + line + " [server]");
        }
    }

    // ------------------------------------------------------- R196 difficulty/level/weight table

    /**
     * The vanilla-22 correspondence table (B-19 单表落法): registryName →
     * {R196 weight, R196 difficulty, R196 maxLevel}. Level column follows the
     * R196 {@code getNumLevels} overrides 一手 (protection family 4, oxygen 3,
     * thorns 3, knockback/fireAspect/punch 2, lootBonus 3, silk/flame 1,
     * waterWorker 1 — 终审 T-1 复证, waterWorker = 1 face); unbreaking is
     * pinned at 3 by B-17 (接受基差 — 1.12 durability face unchanged).
     */
    private static final Map<String, int[]> VANILLA_TABLE = new HashMap<String, int[]>();

    static {
        VANILLA_TABLE.put("minecraft:protection", new int[]{100, 10, 4});
        VANILLA_TABLE.put("minecraft:fire_protection", new int[]{25, 10, 4});
        VANILLA_TABLE.put("minecraft:feather_falling", new int[]{25, 10, 4});
        VANILLA_TABLE.put("minecraft:blast_protection", new int[]{25, 10, 4});
        VANILLA_TABLE.put("minecraft:projectile_protection", new int[]{25, 10, 4});
        VANILLA_TABLE.put("minecraft:respiration", new int[]{5, 10, 3});
        VANILLA_TABLE.put("minecraft:aqua_affinity", new int[]{5, 10, 1});
        VANILLA_TABLE.put("minecraft:thorns", new int[]{5, 20, 3});
        VANILLA_TABLE.put("minecraft:sharpness", new int[]{100, 10, 5});
        VANILLA_TABLE.put("minecraft:smite", new int[]{25, 10, 5});
        VANILLA_TABLE.put("minecraft:bane_of_arthropods", new int[]{25, 10, 5});
        VANILLA_TABLE.put("minecraft:knockback", new int[]{25, 10, 2});
        VANILLA_TABLE.put("minecraft:fire_aspect", new int[]{5, 20, 2});
        VANILLA_TABLE.put("minecraft:looting", new int[]{25, 10, 3});
        VANILLA_TABLE.put("minecraft:efficiency", new int[]{100, 10, 5});
        VANILLA_TABLE.put("minecraft:silk_touch", new int[]{5, 10, 1});
        VANILLA_TABLE.put("minecraft:unbreaking", new int[]{25, 10, 3}); // B-17 接受基差
        VANILLA_TABLE.put("minecraft:fortune", new int[]{5, 10, 3});
        VANILLA_TABLE.put("minecraft:power", new int[]{100, 10, 5});
        VANILLA_TABLE.put("minecraft:punch", new int[]{25, 10, 2});
        VANILLA_TABLE.put("minecraft:flame", new int[]{5, 20, 1});
    }

    private static int[] tableOf(Enchantment enchantment) {
        net.minecraft.util.ResourceLocation name = enchantment.getRegistryName();
        return name == null ? null : VANILLA_TABLE.get(name.toString());
    }

    /** R196 difficulty for the pool windows; ETIM entries read their live cfg. */
    public static int difficultyOf(Enchantment enchantment) {
        if (enchantment instanceof ETIMMiteEnchantment) {
            return ((ETIMMiteEnchantment) enchantment).difficultyOpen();
        }
        int[] row = tableOf(enchantment);
        return row != null ? row[1] : 10;
    }

    /** The effective pool cap (the R196 getNumLevels face; B-17 keeps unbreaking at 3). */
    public static int maxLevelOf(Enchantment enchantment) {
        if (enchantment instanceof ETIMMiteEnchantment) {
            return enchantment.getMaxLevel();
        }
        int[] row = tableOf(enchantment);
        return row != null ? row[2] : enchantment.getMaxLevel();
    }

    /** R196 rarity weight; rule D-B 甲 fallback = the 1.12 rarity weight. */
    public static int weightOf(Enchantment enchantment) {
        int[] row = tableOf(enchantment);
        if (row != null) {
            return row[0];
        }
        if (enchantment instanceof ETIMMiteEnchantment) {
            switch (enchantment.getRarity()) { // C-11: the 1.12 Rarity family maps to the R196 price ladder
                case COMMON:
                    return 100;
                case UNCOMMON:
                    return 25;
                case RARE:
                    return 5;
                default: // VERY_RARE ≈ epic (vampiric)
                    return 1;
            }
        }
        return enchantment.getRarity().getWeight(); // untabbed vanilla face = the 1.12 weight (10/5/2/1)
    }

    /** R196 Enchantment.java:124-141 min-cost formula. */
    public static int minCost(Enchantment enchantment, int level) {
        int diff = difficultyOf(enchantment);
        return Math.max(diff - 10, 0) + diff * (level - 1) + 1;
    }

    /** R196 hasLevels face ({@code getNumLevels() > 1}) — drives the level-less 3-cost pricing (C-10). */
    public static boolean hasLevels(Enchantment enchantment) {
        return maxLevelOf(enchantment) > 1;
    }

    // ------------------------------------------------------- carriers (G3, R196 逐枚桥接)

    /** R196 {@code isSolidMetal()} bridge: metal material minus the chain mail face (ItemArmor one-hand). */
    private static boolean isSolidMetal(ItemArmor armor) {
        return armor.getArmorMaterial() != ItemArmor.ArmorMaterial.LEATHER
                && armor.getArmorMaterial() != ItemArmor.ArmorMaterial.CHAIN;
    }

    /** R196 armor-slot bridge. NOTE: {@code ItemArmor#getEquipmentSlot()} is
     *  @SideOnly(Side.CLIENT) in 1.12 Forge (ItemArmor:103-108) — the
     *  dedicated server throws NoSuchMethodError (判窗 A-1, 条 279); the
     *  {@code armorType} FIELD is common-side, so the slot compare rides it. */
    private static boolean armorSlot(Item item, net.minecraft.inventory.EntityEquipmentSlot slot) {
        return item instanceof ItemArmor && ((ItemArmor) item).armorType == slot;
    }

    /**
     * The R196 carrier face for the pool candidates (G3). The ETIM 17 ride
     * their verified {@code canApplyAtEnchantingTable} overrides; the
     * vanilla-22 ride the R196 carriers translated to the 1.12 item classes
     * (smite = the war hammer exact class, sharpness = sword ∨ battle axe ∨
     * scythe, blast/proj = solid-metal chest ∨ legs, thorns = chest only,
     * unbreaking incl. the whole pickaxe family); entries without an R196
     * counterpart keep the 1.12 default.
     */
    public static boolean canEnchantR196(Enchantment enchantment, Item item) {
        if (enchantment instanceof ETIMMiteEnchantment) {
            // the ETIM 17: the verified carrier faces ride the Forge stack face
            return enchantment.canApplyAtEnchantingTable(new ItemStack(item));
        }
        if (enchantment == Enchantments.PROTECTION || enchantment == Enchantments.FIRE_PROTECTION) {
            return item instanceof ItemArmor;
        }
        if (enchantment == Enchantments.FEATHER_FALLING) {
            return armorSlot(item, net.minecraft.inventory.EntityEquipmentSlot.FEET); // R196 instanceof ItemBoots (1.12 无该类)
        }
        if (enchantment == Enchantments.BLAST_PROTECTION || enchantment == Enchantments.PROJECTILE_PROTECTION) {
            return (armorSlot(item, net.minecraft.inventory.EntityEquipmentSlot.CHEST)
                    || armorSlot(item, net.minecraft.inventory.EntityEquipmentSlot.LEGS))
                    && item instanceof ItemArmor && isSolidMetal((ItemArmor) item);
        }
        if (enchantment == Enchantments.RESPIRATION || enchantment == Enchantments.AQUA_AFFINITY) {
            return armorSlot(item, net.minecraft.inventory.EntityEquipmentSlot.HEAD);
        }
        if (enchantment == Enchantments.THORNS) {
            return armorSlot(item, net.minecraft.inventory.EntityEquipmentSlot.CHEST);
        }
        if (enchantment == Enchantments.SHARPNESS) {
            return item instanceof net.minecraft.item.ItemSword || item instanceof ETIMItemBattleAxe
                    || item instanceof ETIMItemScythe;
        }
        if (enchantment == Enchantments.SMITE) {
            return item.getClass() == ETIMItemWarHammer.class;
        }
        if (enchantment == Enchantments.BANE_OF_ARTHROPODS) {
            return item instanceof net.minecraft.item.ItemSword;
        }
        if (enchantment == Enchantments.KNOCKBACK) {
            return item.getClass() == ETIMItemWarHammer.class; // ItemCudgel absent (C-2)
        }
        if (enchantment == Enchantments.FIRE_ASPECT) {
            return item instanceof net.minecraft.item.ItemSword;
        }
        if (enchantment == Enchantments.LOOTING) {
            return item instanceof net.minecraft.item.ItemSword; // ItemCudgel absent (C-2)
        }
        if (enchantment == Enchantments.FORTUNE) {
            return item.getClass() == net.minecraft.item.ItemPickaxe.class
                    || item.getClass() == ETIMItemPickaxe.class
                    || item.getClass() == net.minecraft.item.ItemSpade.class
                    || item.getClass() == io.github.etim.etim.metal.ETIMItemShovel.class;
        }
        if (enchantment == Enchantments.EFFICIENCY) {
            return item.getClass() == net.minecraft.item.ItemPickaxe.class
                    || item.getClass() == ETIMItemPickaxe.class
                    || item instanceof net.minecraft.item.ItemAxe
                    || item instanceof net.minecraft.item.ItemSpade
                    || item instanceof net.minecraft.item.ItemHoe;
        }
        if (enchantment == Enchantments.SILK_TOUCH) {
            return item.getClass() == net.minecraft.item.ItemPickaxe.class
                    || item.getClass() == ETIMItemPickaxe.class
                    || item.getClass() == net.minecraft.item.ItemSpade.class
                    || item.getClass() == io.github.etim.etim.metal.ETIMItemShovel.class
                    || item instanceof net.minecraft.item.ItemShears
                    || item.getClass() == ETIMItemKnifeFlint.class
                    || item.getClass() == ETIMItemDagger.class;
        }
        if (enchantment == Enchantments.UNBREAKING) {
            if (item instanceof ItemArmor) {
                return isSolidMetal((ItemArmor) item);
            }
            return item instanceof net.minecraft.item.ItemPickaxe // incl. war hammer / battle axe (instanceof face)
                    || item instanceof net.minecraft.item.ItemSpade
                    || item instanceof net.minecraft.item.ItemHoe
                    || item instanceof net.minecraft.item.ItemAxe
                    || item instanceof net.minecraft.item.ItemFishingRod
                    || item instanceof net.minecraft.item.ItemBow;
        }
        if (enchantment == Enchantments.POWER || enchantment == Enchantments.PUNCH
                || enchantment == Enchantments.FLAME) {
            return item instanceof net.minecraft.item.ItemBow;
        }
        // untabbed vanilla face (B-15): the 1.12 carrier
        return enchantment.canApplyAtEnchantingTable(new ItemStack(item));
    }

    // ------------------------------------------------------- conflicts (D-E 甲四族)

    private static boolean isDamageFamily(Enchantment e) {
        return e == Enchantments.SHARPNESS || e == Enchantments.SMITE || e == Enchantments.BANE_OF_ARTHROPODS;
    }

    private static boolean isProtectionFamily(Enchantment e) {
        return e == Enchantments.PROTECTION || e == Enchantments.FIRE_PROTECTION
                || e == Enchantments.FEATHER_FALLING || e == Enchantments.BLAST_PROTECTION
                || e == Enchantments.PROJECTILE_PROTECTION;
    }

    /**
     * R196 directional {@code canApplyTogether} — the PICKED entry's face
     * decides for each candidate (EnchantmentHelper :252-265 loop shape).
     */
    public static boolean compatible(Enchantment picked, Enchantment candidate) {
        if (isDamageFamily(picked)) {
            return !isDamageFamily(candidate);
        }
        if (isProtectionFamily(picked)) {
            if (!isProtectionFamily(candidate)) {
                return true;
            }
            return candidate == Enchantments.FEATHER_FALLING || picked == Enchantments.FEATHER_FALLING;
        }
        if (picked == Enchantments.LOOTING || picked == Enchantments.FORTUNE) {
            return candidate != Enchantments.SILK_TOUCH;
        }
        if (picked == Enchantments.SILK_TOUCH) {
            return candidate != Enchantments.FORTUNE;
        }
        return picked != candidate; // R196 base :75-77
    }

    // ------------------------------------------------------- G4.b 放大 (A-5 自建)

    /**
     * R196 {@code getEnchantmentLevelsAlteredByItemEnchantability}
     * (EnchantmentHelper.java:225-250) verbatim — full up to E, +0.5 per
     * point up to 2E, +0.25 up to 3E, Math.round.
     */
    public static int altered(int levels, Item item) {
        int e = item.getItemEnchantability();
        if (e < 1) {
            return 0;
        }
        if (levels <= e) {
            return levels;
        }
        float altered = e;
        for (int i = e + 1; i <= levels; i++) {
            if (i <= e * 2) {
                altered += 0.5F;
            } else {
                if (i > e * 3) {
                    break;
                }
                altered += 0.25F;
            }
        }
        return Math.round(altered);
    }

    // ------------------------------------------------------- G1 装配九步

    /**
     * The R196 {@code buildEnchantmentList} (EnchantmentHelper.java:267-327)
     * one-hand replica. {@code levels} enters as the caller's budget (the
     * table already ran {@link #altered}; the addRandom path pays it in the
     * MixinEnchantmentHelper redirect — B-16).
     */
    public static List<EnchantmentData> build(Random random, ItemStack stack, int levels) {
        Item item = stack.getItem();
        int enchantability = item.getItemEnchantability();

        List<EnchantmentData> out = new ArrayList<EnchantmentData>();

        if (enchantability <= 0) {
            row("pool item=" + item.getRegistryName() + " budget=" + levels + " out=none (ench " + enchantability + ")");
            return null;
        }

        float randomness = 1.0F + (random.nextFloat() - 0.5F) * 0.5F;
        int adj = (int) (levels * randomness);
        if (adj < 1) {
            adj = 1;
        }
        int budgetIn = levels;
        row("pool item=" + item.getRegistryName() + " budget=" + budgetIn + " adj=" + adj + " start");

        while (adj > 0) {
            Map<Integer, EnchantmentData> candidates = mapData(adj, stack);
            if (candidates == null) {
                break;
            }
            int drop = 0;
            ArrayList<Integer> conflictKeys = new ArrayList<Integer>();
            for (EnchantmentData pick : out) {
                for (Map.Entry<Integer, EnchantmentData> entry : candidates.entrySet()) {
                    if (!compatible(pick.enchantment, entry.getValue().enchantment)) {
                        conflictKeys.add(entry.getKey());
                        drop++;
                    }
                }
            }
            for (Integer key : conflictKeys) {
                candidates.remove(key);
            }
            if (drop > 0) {
                row("conflict dropped=" + drop);
            }
            if (candidates.isEmpty()) {
                break;
            }

            EnchantmentData pick = weightedPick(random, candidates.values());
            if (pick == null) {
                break;
            }
            if (out.size() < 2 && candidates.size() > 1 && hasLevels(pick.enchantment) && random.nextInt(2) == 0) {
                // 1.12 EnchantmentData.enchantmentLevel is FINAL — the demotion face
                // replaces the holder (R196 mutates the field, :300; same value face)
                pick = new EnchantmentData(pick.enchantment, random.nextInt(pick.enchantmentLevel) + 1);
            }
            out.add(pick);
            int cost = hasLevels(pick.enchantment) ? minCost(pick.enchantment, pick.enchantmentLevel) : minCost(pick.enchantment, 3);
            adj -= cost;
            adj -= 5;
            row("pick item=" + item.getRegistryName() + " ench=" + enchantmentIdOf(pick.enchantment)
                    + " L=" + pick.enchantmentLevel + " cost=" + cost + " adj=" + adj);
            if (adj < 5 || out.size() > 2) {
                break;
            }
        }

        shuffle(random, out);
        row("pool item=" + item.getRegistryName() + " budget=" + budgetIn + " adj=" + adj
                + " cand=end picks=" + out.size());
        return out.isEmpty() ? null : out;
    }

    /** R196 mapEnchantmentData (EnchantmentHelper.java:329-351). */
    private static Map<Integer, EnchantmentData> mapData(int levels, ItemStack stack) {
        Item item = stack.getItem();
        boolean book = item == Items.BOOK;
        Map<Integer, EnchantmentData> map = new HashMap<Integer, EnchantmentData>();
        for (Enchantment enchantment : ForgeRegistries.ENCHANTMENTS.getValues()) {
            if (enchantment == null) {
                continue;
            }
            boolean carrier = book ? enchantment.isAllowedOnBooks() : canEnchantR196(enchantment, item);
            if (!carrier) {
                continue;
            }
            int cap = maxLevelOf(enchantment);
            if (hasLevels(enchantment)) {
                for (int level = cap; level > 0; level--) {
                    if (minCost(enchantment, level) <= levels) {
                        map.put(Integer.valueOf(enchantmentIdOf(enchantment)),
                                new EnchantmentData(enchantment, level));
                        break;
                    }
                }
            } else if (minCost(enchantment, 3) <= levels) { // C-10 level-less price = minCost(3)
                map.put(Integer.valueOf(enchantmentIdOf(enchantment)), new EnchantmentData(enchantment, 1));
            }
        }
        return map.isEmpty() ? null : map;
    }

    private static int enchantmentIdOf(Enchantment enchantment) {
        return Enchantment.getEnchantmentID(enchantment);
    }

    /** R196 WeightedRandom pick (weight = the rarity weight) — own accumulator, exact distribution. */
    private static EnchantmentData weightedPick(Random random, Iterable<EnchantmentData> pool) {
        int total = 0;
        for (EnchantmentData data : pool) {
            total += weightOf(data.enchantment);
        }
        if (total <= 0) {
            return null;
        }
        int roll = random.nextInt(total);
        for (EnchantmentData data : pool) {
            roll -= weightOf(data.enchantment);
            if (roll < 0) {
                return data;
            }
        }
        return null;
    }

    /** R196 :313-324 shuffle (separate hold list, exact face). */
    private static void shuffle(Random random, List<EnchantmentData> out) {
        List<EnchantmentData> hold = new ArrayList<EnchantmentData>(out);
        out.clear();
        int n = hold.size();
        while (n > 0) {
            int index = random.nextInt(hold.size());
            out.add(hold.get(index));
            hold.set(index, hold.get(hold.size() - 1));
            hold.remove(hold.size() - 1);
            n--;
        }
    }
}
