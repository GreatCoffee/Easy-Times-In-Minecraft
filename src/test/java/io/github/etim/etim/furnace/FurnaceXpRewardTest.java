package io.github.etim.etim.furnace;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VF — the furnace XP take table
 * ({@link FurnaceXpRewards#rewardOf}, {@link FurnaceXpRewards#addReward},
 * {@link FurnaceXpRewards#isEnabled}, {@link FurnaceXpRewards#setEnabled}).
 */
class FurnaceXpRewardTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    /** Resolved after {@link Bootstrap#register()}; a static field here would touch {@code Blocks} too early. */
    private static Item torch() {
        return Item.getItemFromBlock(Blocks.TORCH);
    }

    @AfterEach
    void restoreSwitch() {
        FurnaceXpRewards.setEnabled(true);
    }

    @Test
    void emptyStackPaysNothing() {
        assertEquals(0, FurnaceXpRewards.rewardOf(ItemStack.EMPTY, 3));
    }

    @Test
    void unregisteredItemPaysNothing() {
        assertEquals(0, FurnaceXpRewards.rewardOf(new ItemStack(Items.SLIME_BALL), 5));
    }

    @Test
    void registeredRewardScalesWithTheTake() {
        Item probe = torch();
        FurnaceXpRewards.addReward(probe, 3);
        assertEquals(3, FurnaceXpRewards.rewardOf(new ItemStack(probe), 1));
        assertEquals(9, FurnaceXpRewards.rewardOf(new ItemStack(probe), 3));
        assertEquals(0, FurnaceXpRewards.rewardOf(new ItemStack(probe), 0));
    }

    @Test
    void theSwitchToggles() {
        FurnaceXpRewards.setEnabled(false);
        assertFalse(FurnaceXpRewards.isEnabled());
        FurnaceXpRewards.setEnabled(true);
        assertTrue(FurnaceXpRewards.isEnabled());
    }
}
