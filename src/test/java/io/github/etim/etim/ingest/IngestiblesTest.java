package io.github.etim.etim.ingest;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * B-70VO: 基础 Item 进食漏斗的成员判定与标识格式（R196 Item.onItemRightClick :99-102）。
 */
class IngestiblesTest {

    @BeforeAll
    static void boot() {
        Bootstrap.register();
    }

    @Test
    void sugarMushroomsAndEggAreIngestible() {
        assertTrue(ETIMIngestibles.isIngestible(new ItemStack(Items.SUGAR)));
        assertTrue(ETIMIngestibles.isIngestible(new ItemStack(Item.getItemFromBlock(Blocks.BROWN_MUSHROOM))));
        assertTrue(ETIMIngestibles.isIngestible(new ItemStack(Item.getItemFromBlock(Blocks.RED_MUSHROOM))));
        assertTrue(ETIMIngestibles.isIngestible(new ItemStack(Items.EGG)));
    }

    @Test
    void foodItemsAreNotInTheBaseFunnel() {
        assertFalse(ETIMIngestibles.isIngestible(new ItemStack(Items.BEEF)));
        assertFalse(ETIMIngestibles.isIngestible(new ItemStack(Items.BREAD)));
    }

    @Test
    void emptyStackIsNeverIngestible() {
        assertFalse(ETIMIngestibles.isIngestible(ItemStack.EMPTY));
    }

    @Test
    void itemKeyUsesRegistryName() {
        assertEquals("minecraft:beef", ETIMIngestibles.itemKey(new ItemStack(Items.BEEF)));
        assertEquals("minecraft:sugar", ETIMIngestibles.itemKey(new ItemStack(Items.SUGAR)));
        assertEquals("minecraft:egg", ETIMIngestibles.itemKey(new ItemStack(Items.EGG)));
    }

    @Test
    void itemKeyFallsBackToClassName() {
        assertEquals("minecraft:air", ETIMIngestibles.itemKey(ItemStack.EMPTY));
    }
}
