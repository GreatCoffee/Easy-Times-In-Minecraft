package io.github.etim.etim.item;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VD — the melt arm's pure arithmetic
 * ({@link ETIMItemMelt#chance}, {@link ETIMItemMelt#roll},
 * {@link ETIMItemMelt#rollTicks}, {@link ETIMItemMelt#fmt}, {@link ETIMItemMelt#melts}).
 */
class MeltTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void chanceIsZeroAtOrBelowOne() {
        assertEquals(0.0F, ETIMItemMelt.chance(1.0F), 1.0E-9F);
        assertEquals(0.0F, ETIMItemMelt.chance(0.5F), 1.0E-9F);
        assertEquals(0.0F, ETIMItemMelt.chance(-3.0F), 1.0E-9F);
    }

    @Test
    void chanceGrowsOneeFourPerDegree() {
        assertEquals(1.0E-4F, ETIMItemMelt.chance(2.0F), 1.0E-9F);
        assertEquals(9.0E-4F, ETIMItemMelt.chance(10.0F), 1.0E-9F);
        assertTrue(ETIMItemMelt.chance(30.0F) > ETIMItemMelt.chance(20.0F));
    }

    @Test
    void zeroChanceKeepsEveryItem() {
        ItemStack stack = new ItemStack(Items.SNOWBALL, 5);
        assertEquals(5, ETIMItemMelt.roll(stack, 0.0F));
        assertEquals(5, stack.getCount());
    }

    @Test
    void fullChanceMeltsEveryItem() {
        ItemStack stack = new ItemStack(Items.SNOWBALL, 5);
        assertEquals(0, ETIMItemMelt.roll(stack, 1.0F));
        assertEquals(0, stack.getCount());
    }

    @Test
    void emptyStackRollsToZero() {
        assertEquals(0, ETIMItemMelt.roll(ItemStack.EMPTY, 1.0F));
    }

    @Test
    void rollTicksStopsBelowOneDegree() {
        ItemStack stack = new ItemStack(Items.SNOWBALL, 4);
        assertEquals(0, ETIMItemMelt.rollTicks(stack, 1.0F, 10));
        assertEquals(4, stack.getCount());
    }

    @Test
    void meltsRecognisesSnowAndIceOnly() {
        assertFalse(ETIMItemMelt.melts(ItemStack.EMPTY));
        assertTrue(ETIMItemMelt.melts(new ItemStack(Items.SNOWBALL)));
        assertTrue(ETIMItemMelt.melts(new ItemStack(Blocks.ICE)));
        assertTrue(ETIMItemMelt.melts(new ItemStack(Blocks.PACKED_ICE)));
        assertTrue(ETIMItemMelt.melts(new ItemStack(Blocks.SNOW_LAYER)));
        assertFalse(ETIMItemMelt.melts(new ItemStack(Blocks.STONE)));
        assertFalse(ETIMItemMelt.melts(new ItemStack(Items.WHEAT)));
    }

    @Test
    void fmtUsesRootLocaleFiveDecimals() {
        assertEquals("1.23457", ETIMItemMelt.fmt(1.234567D));
        assertEquals("0.00000", ETIMItemMelt.fmt(0.0D));
        assertEquals("-2.50000", ETIMItemMelt.fmt(-2.5D));
    }
}
