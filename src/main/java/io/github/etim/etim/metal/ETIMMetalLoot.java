package io.github.etim.etim.metal;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.world.storage.loot.LootEntryItem;
import net.minecraft.world.storage.loot.LootPool;
import net.minecraft.world.storage.loot.LootTableList;
import net.minecraft.world.storage.loot.RandomValueRange;
import net.minecraft.world.storage.loot.conditions.LootCondition;
import net.minecraft.world.storage.loot.functions.LootFunction;
import net.minecraft.world.storage.loot.functions.SetCount;
import net.minecraft.world.storage.loot.functions.SetDamage;
import net.minecraftforge.event.LootTableLoadEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

import java.util.List;

/**
 * D-02 (ii) 裁定 (2026-10-25) + B3 批文 §〇-宝箱面: the MAIN-WORLD dungeon
 * chest carries ONLY the eight rusted-iron gear rows (WorldGenDungeons.java:
 * 28-46, all 1-1) — the two ancient-metal rows (nugget + ingot 1-4 w10) are
 * deleted (the ancient face moves to the underworld chest, M4-12 后置批;
 * ancient metal is unavailable in the overworld until then, A-6/D-10 已裁);
 * the mineshaft chest carries the seven rusted rows incl. the chain item 1-5
 * w5 (StructureMineshaftPieces.java:24-55); the skeleton entity loot swaps
 * its arrow face to the rusted arrow (R196 getDropItemId :143-146).
 *
 * <p>Every rusted row applies the R196 chest-damage face (ItemStack.java:
 * 1010-1022): rusted items take (int)(3.0+rand×7.0) = 3-9/10 of maxDamage
 * (non-rusted rows 0-6/10 — none present in these tables). The 1.12
 * {@code SetDamage} function carries the fraction.</p>
 *
 * <p>Gated by the metal config ({@code metalSystem}); when off the vanilla
 * loot tables load untouched.</p>
 */
public final class ETIMMetalLoot {

    @SubscribeEvent
    public static void onLootTableLoad(LootTableLoadEvent event) {
        if (!ETIMConfig.metalSystem) {
            return;
        }
        if (LootTableList.CHESTS_SIMPLE_DUNGEON.equals(event.getName())) {
            LootPool main = event.getTable().getPool("main");
            if (main != null) {
                // D-02 (ii) 裁定 (2026-10-25): the two ancient-metal rows are
                // GONE — the main-world dungeon chest carries only the rusted
                // face; ancient metal's only source = the underworld chest
                // (M4-12 后置批). E-1 勘误: the deletion pair is EXACTLY the
                // two addEntry rows; the import face is untouched (Item is
                // still used by the entry() helpers).
                // WorldGenDungeons.java:28-46 — eight rusted rows (1-1, weights).
                main.addEntry(entry(ETIMGear.gear("shears_rusted_iron"), 1, 1, 3, true));
                main.addEntry(entry(ETIMGear.gear("shovel_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("hoe_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("mattock_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("dagger_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("sword_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("battle_axe_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("war_hammer_rusted_iron"), 1, 1, 2, true));
                // §8.2 — the pool introspection face (W9 判点): the ancient rows
                // must read 0, the rusted rows 8 (反射先例 :90-106 形状).
                int ancient = countPoolEntries(main, "nugget_ancient_metal", "ingot_ancient_metal");
                int rusted = countPoolEntries(main,
                        "shears_rusted_iron", "shovel_rusted_iron", "hoe_rusted_iron", "mattock_rusted_iron",
                        "dagger_rusted_iron", "sword_rusted_iron", "battle_axe_rusted_iron", "war_hammer_rusted_iron");
                ETIM.LOGGER.info("[TestLog] dungeon pool entries introspected ancientMetal=" + ancient
                        + " rustedRows=" + rusted + " [server]");
            }
            return;
        }
        if (LootTableList.CHESTS_ABANDONED_MINESHAFT.equals(event.getName())) {
            LootPool main = event.getTable().getPool("main");
            if (main != null) {
                // StructureMineshaftPieces.java:24-55 — seven rusted rows.
                main.addEntry(entry(ETIMGear.chainRustedIron, 1, 5, 5, false)); // the chain LINK, no damage face? R196 :24 row — chain links are plain items (not damageable)
                main.addEntry(entry(ETIMGear.gear("shovel_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("hatchet_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("axe_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("mattock_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("pickaxe_rusted_iron"), 1, 1, 2, true));
                main.addEntry(entry(ETIMGear.gear("war_hammer_rusted_iron"), 1, 1, 2, true));
                ETIM.LOGGER.info("[TestLog] mineshaft chest loot injected: 7 rusted rows (chain 1-5 w5) [server]");
            }
            return;
        }
        if (LootTableList.ENTITIES_SKELETON.equals(event.getName())) {
            LootPool main = event.getTable().getPool("main");
            if (main != null) {
                // R196 EntitySkeleton.java:143-146/:174-175 — the arrow face IS
                // the rusted arrow. 1.12 LootPool has no removeEntry (LootPool
                // :24 lootEntries private) → reflective removal of the vanilla
                // arrow row, additive fallback if the reflection misses.
                LootEntryItem rusted = entry(ETIMGear.arrowRustedIron, 1, 2, 10, false);
                boolean removed = false;
                try {
                    // obf runtime remaps the field to its SRG name — try both.
                    java.lang.reflect.Field field = null;
                    for (String candidate : new String[]{"lootEntries", "field_186453_a"}) {
                        try {
                            field = LootPool.class.getDeclaredField(candidate);
                            field.setAccessible(true);
                            break;
                        } catch (NoSuchFieldException wrongSurface) {
                            // next candidate
                        }
                    }
                    if (field != null) {
                        @SuppressWarnings("unchecked")
                        List<Object> entries = (List<Object>) field.get(main);
                        removed = entries.removeIf(e -> {
                            String name = ((net.minecraft.world.storage.loot.LootEntry) e).getEntryName();
                            return name.equals("arrow") || name.equals("minecraft:arrow");
                        });
                    }
                } catch (Exception reflectionMiss) {
                    ETIM.LOGGER.warn("[TestLog] skeleton arrow removal missed: " + reflectionMiss);
                }
                main.addEntry(rusted);
                ETIM.LOGGER.info("[TestLog] skeleton loot injected: rusted arrow (1-2) vanilla-arrow-removed=" + removed);
            }
        }
    }

    /** Ancient-metal row — (a) 已删 (D-02 ii, 2026-10-25)，留作 (b) 箱面形状参考. */
    private static LootEntryItem entry(Item item, int min, int max, boolean rustedDamage) {
        return entry(item, min, max, 10, rustedDamage);
    }

    /** R196 row 对位: weight + SetCount + the rusted chest-damage face. */
    private static LootEntryItem entry(Item item, int min, int max, int weight, boolean rustedDamage) {
        LootFunction count = new SetCount(new LootCondition[0], new RandomValueRange(min, max));
        LootFunction[] functions;
        if (rustedDamage) {
            // R196 (int)(3.0 + rand×7.0) = 3-9/10 damage fraction (ItemStack.java:1012).
            // 1.12 SetDamage.apply is INVERTED vs 1.13+: damage = (1 - f) × maxDamage
            // (SetDamage.java:28-34, f = remaining fraction) — pass 0.1-0.7 remaining
            // to land 0.3-0.9 damage (B3 A-2; continuous draw approximating the R196
            // seven-band discrete face).
            LootFunction damage = new SetDamage(new LootCondition[0], new RandomValueRange(0.1F, 0.7F));
            functions = new LootFunction[]{count, damage};
        } else {
            functions = new LootFunction[]{count};
        }
        return new LootEntryItem(item, weight, 0, functions, new LootCondition[0],
                item.getRegistryName().toString());
    }

    /**
     * §8.2 — the pool introspection face: reflect the private lootEntries
     * list (the :90-106 double-candidate shape) and count entries whose name
     * contains one of the given registry-path fragments.
     */
    private static int countPoolEntries(LootPool pool, String... fragments) {
        try {
            java.lang.reflect.Field field = null;
            for (String candidate : new String[]{"lootEntries", "field_186453_a"}) {
                try {
                    field = LootPool.class.getDeclaredField(candidate);
                    field.setAccessible(true);
                    break;
                } catch (NoSuchFieldException wrongSurface) {
                    // next candidate
                }
            }
            if (field != null) {
                @SuppressWarnings("unchecked")
                List<Object> entries = (List<Object>) field.get(pool);
                int count = 0;
                for (Object e : entries) {
                    String name = ((net.minecraft.world.storage.loot.LootEntry) e).getEntryName();
                    for (String fragment : fragments) {
                        if (name.contains(fragment)) {
                            count++;
                            break;
                        }
                    }
                }
                return count;
            }
        } catch (Exception reflectionMiss) {
            ETIM.LOGGER.warn("[TestLog] dungeon pool introspection missed: " + reflectionMiss);
        }
        return -1;
    }
}
