package io.github.etim.etim.metal;

import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.world.storage.loot.LootEntryItem;
import net.minecraft.world.storage.loot.LootPool;
import net.minecraft.world.storage.loot.LootTableList;
import net.minecraft.world.storage.loot.RandomValueRange;
import net.minecraft.world.storage.loot.conditions.LootCondition;
import net.minecraft.world.storage.loot.functions.LootFunction;
import net.minecraft.world.storage.loot.functions.SetCount;
import net.minecraftforge.event.LootTableLoadEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

/**
 * B-2(a) 主会话裁定: the MAIN-WORLD dungeon chest carries ancient metal —
 * nugget + ingot, each 1-4 @ weight 10, verbatim from the R196 underworld
 * chest table (WorldGenDungeons.java:50-51 chest_contents_for_underworld —
 * the main-world field_111189_a :6-47 has NO ancient row, G-FB-11; the
 * rewrite of the R196 letter is the adjudicated face so the 4.1 five-metal
 * v1 stays reachable while stage 7 is closed).
 *
 * <p>Gated by the metal config ({@code metalSystem}); when off the vanilla
 * loot table loads untouched.</p>
 */
public final class ETIMMetalLoot {

    @SubscribeEvent
    public static void onLootTableLoad(LootTableLoadEvent event) {
        if (!ETIMConfig.metalSystem) {
            return;
        }
        if (!LootTableList.CHESTS_SIMPLE_DUNGEON.equals(event.getName())) {
            return;
        }
        LootPool main = event.getTable().getPool("main");
        if (main == null) {
            return;
        }
        main.addEntry(entry(ETIMItems.nuggetAncientMetal));
        main.addEntry(entry(ETIMItems.ingotAncientMetal));
        ETIM.LOGGER.info("[TestLog] dungeon chest loot injected: ancient metal nugget+ingot (1-4, weight 10) [server]");
    }

    /** R196 WeightedRandomChestContent(Item.ancientMetalNugget, 0, 1, 4, 10) 对位. */
    private static LootEntryItem entry(Item item) {
        LootFunction count = new SetCount(new LootCondition[0], new RandomValueRange(1, 4));
        return new LootEntryItem(item, 10, 0, new LootFunction[] {count}, new LootCondition[0],
                item.getRegistryName().toString());
    }

    private ETIMMetalLoot() {
    }
}
