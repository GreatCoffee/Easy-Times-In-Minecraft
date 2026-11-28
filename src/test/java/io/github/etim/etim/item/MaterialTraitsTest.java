package io.github.etim.etim.item;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VD — material axes and the empty-bowl burn value
 * ({@link ETIMMaterialTraits#byName}, {@link ETIMMaterialTraits#dousesFire},
 * {@link ETIMMaterialTraits#dissolvesInWater}, {@link ETIMItemBowl#emptyBowlBurnTime}).
 */
class MaterialTraitsTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void unknownMaterialFallsBackToPlain() {
        ETIMMaterialTraits.Trait a = ETIMMaterialTraits.byName("definitely-not-a-material");
        ETIMMaterialTraits.Trait b = ETIMMaterialTraits.byName("another-unknown");
        assertNotNull(a);
        assertSame(a, b, "PLAIN is a shared sentinel");
    }

    @Test
    void snowDousesButStoneDoesNot() {
        assertTrue(ETIMMaterialTraits.dousesFire(new ItemStack(Items.SNOWBALL)));
        assertFalse(ETIMMaterialTraits.dousesFire(new ItemStack(Blocks.STONE)));
        assertFalse(ETIMMaterialTraits.dousesFire(ItemStack.EMPTY));
    }

    @Test
    void snowDissolvesButStoneDoesNot() {
        assertTrue(ETIMMaterialTraits.dissolvesInWater(new ItemStack(Items.SNOWBALL)));
        assertFalse(ETIMMaterialTraits.dissolvesInWater(new ItemStack(Blocks.STONE)));
        assertFalse(ETIMMaterialTraits.dissolvesInWater(ItemStack.EMPTY));
    }

    @Test
    void everyMaterialNameResolves() {
        for (String name : new String[] {"wood", "stone", "metal", "glass", "plant", "wool", "snow"}) {
            assertNotNull(ETIMMaterialTraits.byName(name), name);
        }
    }

    @Test
    void emptyBowlBurnsTwoHundredTicks() {
        assertEquals(200, ETIMItemBowl.emptyBowlBurnTime(new ItemStack(Items.BOWL)));
        assertEquals(0, ETIMItemBowl.emptyBowlBurnTime(new ItemStack(Blocks.STONE)));
        assertEquals(0, ETIMItemBowl.emptyBowlBurnTime(ItemStack.EMPTY));
    }
}
