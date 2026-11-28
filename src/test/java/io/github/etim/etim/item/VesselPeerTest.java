package io.github.etim.etim.item;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * B-70VP: 碗族容器映射与材质行数值格式（R196 getPeerForContents）。
 */
class VesselPeerTest {

    @BeforeAll
    static void boot() {
        Bootstrap.register();
    }

    @Test
    void nullContentsFallsBackToVanillaBowl() {
        assertEquals(Items.BOWL, ETIMItemVessel.peerForContents(null));
    }

    @Test
    void unboundContentsHasNoPeer() {
        assertNull(ETIMItemVessel.peerForContents(ETIMBowlContents.SORBET));
    }

    @Test
    void bowlForNullGivesVanillaBowl() {
        ItemStack stack = ETIMFoodItems.bowlFor(null);
        assertEquals(Items.BOWL, stack.getItem());
        assertEquals(1, stack.getCount());
    }

    @Test
    void bowlForUnboundContentsIsEmpty() {
        assertTrue(ETIMFoodItems.bowlFor(ETIMBowlContents.MILK).isEmpty());
    }

    @Test
    void fmtUsesThreeDecimals() {
        assertEquals("1.235", ETIMItemMaterialEvents.fmt(1.23456));
        assertEquals("0.000", ETIMItemMaterialEvents.fmt(0.0));
        assertEquals("-1.500", ETIMItemMaterialEvents.fmt(-1.5));
        assertEquals("100.000", ETIMItemMaterialEvents.fmt(100.0));
    }

    @Test
    void fmtNeverUsesExponent() {
        assertEquals("0.000", ETIMItemMaterialEvents.fmt(4.0E-4));
        assertEquals("0.001", ETIMItemMaterialEvents.fmt(0.0009));
    }
}
