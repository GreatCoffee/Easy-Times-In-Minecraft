package io.github.etim.etim.furnace;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

/**
 * B-70TG: R196 furnace heat table (FurnaceHeat.java) — required heat,
 * fuel heat and the sand special case, all pure lookups.
 */
class FurnaceHeatTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    // ------------------------------------------------------- getRequiredHeat

    @Test
    void emptyStackRequiresNothing() {
        assertEquals(0, FurnaceHeat.getRequiredHeat(ItemStack.EMPTY));
    }

    @Test
    void unregisteredItemDefaultsToOne() {
        assertEquals(1, FurnaceHeat.getRequiredHeat(new ItemStack(Items.DIAMOND)));
    }

    // ----------------------------------------------------- getSmeltingResult

    @Test
    void sandBelowFourStaysSand() {
        assertSame(ItemStack.EMPTY.getItem(), FurnaceHeat.getSmeltingResult(new ItemStack(Blocks.SAND, 3), 4).getItem());
    }

    @Test
    void sandOnWoodHeatBecomesSandstone() {
        assertSame(Item.getItemFromBlock(Blocks.SANDSTONE), FurnaceHeat.getSmeltingResult(new ItemStack(Blocks.SAND, 4), 1).getItem());
    }

    @Test
    void sandOnCoalHeatOrHigherBecomesGlass() {
        assertSame(Item.getItemFromBlock(Blocks.GLASS), FurnaceHeat.getSmeltingResult(new ItemStack(Blocks.SAND, 4), 2).getItem());
        assertSame(Item.getItemFromBlock(Blocks.GLASS), FurnaceHeat.getSmeltingResult(new ItemStack(Blocks.SAND, 4), 3).getItem());
        assertSame(Item.getItemFromBlock(Blocks.GLASS), FurnaceHeat.getSmeltingResult(new ItemStack(Blocks.SAND, 4), 4).getItem());
    }

    // ----------------------------------------------------------- getHeatOf

    @Test
    void charcoalIsWoodHeatAndCoalIsCoalHeat() {
        assertEquals(1, FurnaceHeat.getHeatOf(new ItemStack(Items.COAL, 1, 1)));
        assertEquals(2, FurnaceHeat.getHeatOf(new ItemStack(Items.COAL, 1, 0)));
    }

    @Test
    void coalBlockIsCoalHeat() {
        assertEquals(2, FurnaceHeat.getHeatOf(new ItemStack(Blocks.COAL_BLOCK)));
    }

    @Test
    void blazeRodIsBlazeHeat() {
        assertEquals(4, FurnaceHeat.getHeatOf(new ItemStack(Items.BLAZE_ROD)));
    }

    @Test
    void lavaBucketIsLavaHeat() {
        assertEquals(3, FurnaceHeat.getHeatOf(new ItemStack(Items.LAVA_BUCKET)));
    }

    @Test
    void anyOtherBurnableIsWoodHeat() {
        assertEquals(1, FurnaceHeat.getHeatOf(new ItemStack(Items.STICK)));
    }

    @Test
    void nonFuelIsZero() {
        assertEquals(0, FurnaceHeat.getHeatOf(new ItemStack(Items.WATER_BUCKET)));
        assertEquals(0, FurnaceHeat.getHeatOf(new ItemStack(Items.DIAMOND)));
    }
}
