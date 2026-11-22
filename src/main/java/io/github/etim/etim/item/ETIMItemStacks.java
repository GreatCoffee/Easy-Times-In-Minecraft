package io.github.etim.etim.item;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * R196 {@code Item.java:791} starts every item at {@code maxStackSize = 16}
 * (census F :142) and the per-item overrides at :31/:111/:150/:153/:158/:197/
 * :198/:269/:317/:324/:330 ride on top of that (census F :143).
 *
 * <p>1.12 starts at 64 and every vanilla item that wants 64 either relies on
 * that field or calls {@code setMaxStackSize(64)} explicitly. The global
 * default moves to 16 in {@code MixinItem} — explicit 64 callers keep 64,
 * which is exactly R196's shape (paper is the one item that asks for 64).
 * This class then re-applies the R196 per-item table, and pins ETIM's own
 * non-damageable metal content (arrows, nuggets, chains…) to 16 as well.</p>
 *
 * <p>Called from {@code ETIM.preInit} after {@code ETIMConfig.init}.</p>
 */
public final class ETIMItemStacks {

    private ETIMItemStacks() {
    }

    public static void apply() {
        if (!ETIMConfig.itemsStack16R196) {
            return;
        }
        // R196 Item.java per-item table (census F :143).
        set(Items.STICK, 32);        // :31
        set(Items.FLINT, 16);        // :111
        set(Items.REEDS, 16);        // :150
        set(Items.PAPER, 64);        // :158
        set(Items.CAKE, 8);          // :197
        set(Items.CAULDRON, 4);      // :269
        set(Items.PUMPKIN_PIE, 8);   // :317
        set(Items.QUARTZ, 16);       // :330
        set(Items.ENCHANTED_BOOK, 1); // :324
        // The bucket family stays at one per slot in R196 (vanilla container rule;
        // 1.12's empty bucket is a plain Item here, so the global default would
        // otherwise raise it to 16).
        set(Items.BUCKET, 1);
        set(Items.WATER_BUCKET, 1);
        set(Items.LAVA_BUCKET, 1);
        set(Items.MILK_BUCKET, 1);

        // ETIM metal / material families: R196 runs every one of them through
        // the same default 16 (they are plain Item subclasses there).
        int pinned = 0;
        for (Item item : ForgeRegistries.ITEMS) {
            ResourceLocation id = item.getRegistryName();
            if (id == null || !ETIM.MOD_ID.equals(id.getNamespace())) {
                continue;
            }
            if (item.getMaxDamage() > 0) {
                continue; // damageable items are forced to 1 by the ctor
            }
            if (item instanceof net.minecraft.item.ItemBlock
                    || item instanceof net.minecraft.item.ItemBlockSpecial) {
                continue; // block items keep the B-66 stack of 4
            }
            if (item.getItemStackLimit() != 16) {
                set(item, 16);
                pinned++;
            }
        }
        ETIM.LOGGER.info("[ItemLog] stack table applied default=16 r196Table=9 etimPinned={} [server]",
                pinned);
    }

    private static void set(Item item, int size) {
        item.setMaxStackSize(size);
    }
}
