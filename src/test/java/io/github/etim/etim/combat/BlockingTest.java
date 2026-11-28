package io.github.etim.etim.combat;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VE — the block-carrier faces
 * ({@link ETIMBlocking#isBlockCarrier}, {@link ETIMBlocking#isShieldStack},
 * {@link ETIMBlocking#isBlockingCarrier}).
 */
class BlockingTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void vanillaArmsAreBlockCarriers() {
        assertTrue(ETIMBlocking.isBlockCarrier(new ItemStack(Items.IRON_SWORD)));
        assertTrue(ETIMBlocking.isBlockCarrier(new ItemStack(Items.DIAMOND_PICKAXE)));
        assertTrue(ETIMBlocking.isBlockCarrier(new ItemStack(Items.IRON_AXE)));
        assertTrue(ETIMBlocking.isBlockCarrier(new ItemStack(Items.IRON_SHOVEL)));
    }

    @Test
    void nonArmsAreNotBlockCarriers() {
        assertFalse(ETIMBlocking.isBlockCarrier(ItemStack.EMPTY));
        assertFalse(ETIMBlocking.isBlockCarrier(new ItemStack(Items.STICK)));
        assertFalse(ETIMBlocking.isBlockCarrier(new ItemStack(Items.BOW)));
        assertFalse(ETIMBlocking.isBlockCarrier(new ItemStack(Items.IRON_CHESTPLATE)));
    }

    @Test
    void shieldFaceIsDetectedByTheVanillaPredicate() {
        assertTrue(ETIMBlocking.isShieldStack(new ItemStack(Items.SHIELD)));
        assertFalse(ETIMBlocking.isShieldStack(new ItemStack(Items.IRON_SWORD)));
        assertFalse(ETIMBlocking.isShieldStack(ItemStack.EMPTY));
    }

    @Test
    void blockingCarrierIsTheUnion() {
        assertTrue(ETIMBlocking.isBlockingCarrier(new ItemStack(Items.SHIELD)));
        assertTrue(ETIMBlocking.isBlockingCarrier(new ItemStack(Items.IRON_SWORD)));
        assertFalse(ETIMBlocking.isBlockingCarrier(new ItemStack(Items.STICK)));
        assertFalse(ETIMBlocking.isBlockingCarrier(ItemStack.EMPTY));
    }
}
