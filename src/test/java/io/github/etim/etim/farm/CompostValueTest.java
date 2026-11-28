package io.github.etim.etim.farm;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VD — the worm-pump table
 * ({@link ETIMCompost#compostable}, {@link ETIMCompost#compostValue},
 * {@link ETIMCompost#compostRemains}).
 */
class CompostValueTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void emptyAndNonfoodReadZero() {
        assertEquals(0.0F, ETIMCompost.compostValue(ItemStack.EMPTY), 1.0E-6F);
        assertEquals(0.0F, ETIMCompost.compostValue(new ItemStack(Blocks.STONE)), 1.0E-6F);
        assertFalse(ETIMCompost.compostable(ItemStack.EMPTY));
        assertFalse(ETIMCompost.compostable(new ItemStack(Blocks.STONE)));
    }

    @Test
    void valueIsNeverNegative() {
        for (Item item : new Item[] {Items.APPLE, Items.BREAD, Items.WHEAT, Items.WHEAT_SEEDS}) {
            assertTrue(ETIMCompost.compostValue(new ItemStack(item)) >= 0.0F, item.getRegistryName().toString());
        }
    }

    @Test
    void compostableMatchesPositiveValue() {
        ItemStack apple = new ItemStack(Items.APPLE);
        assertEquals(ETIMCompost.compostValue(apple) > 0.0F, ETIMCompost.compostable(apple));
    }

    @Test
    void melonAndPumpkinLeaveSeeds() {
        assertSame(Items.MELON_SEEDS, ETIMCompost.compostRemains(new ItemStack(Blocks.MELON_BLOCK)));
        assertSame(Items.PUMPKIN_SEEDS, ETIMCompost.compostRemains(new ItemStack(Blocks.PUMPKIN)));
    }

    @Test
    void stewReturnsBowl() {
        assertSame(Items.BOWL, ETIMCompost.compostRemains(new ItemStack(Items.MUSHROOM_STEW)));
    }

    @Test
    void plainItemsLeaveNothing() {
        assertNull(ETIMCompost.compostRemains(ItemStack.EMPTY));
        assertNull(ETIMCompost.compostRemains(new ItemStack(Blocks.STONE)));
        assertNull(ETIMCompost.compostRemains(new ItemStack(Items.WHEAT)));
    }
}
