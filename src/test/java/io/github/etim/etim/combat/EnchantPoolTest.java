package io.github.etim.etim.combat;

import net.minecraft.enchantment.Enchantment;
import net.minecraft.init.Enchantments;
import net.minecraft.init.Bootstrap;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-70VE — the R196 pool arithmetic and the conflict matrix
 * ({@link ETIMEnchantPool#difficultyOf}, {@link ETIMEnchantPool#maxLevelOf},
 * {@link ETIMEnchantPool#weightOf}, {@link ETIMEnchantPool#minCost},
 * {@link ETIMEnchantPool#hasLevels}, {@link ETIMEnchantPool#canEnchantR196},
 * {@link ETIMEnchantPool#compatible}, {@link ETIMEnchantPool#altered}).
 */
class EnchantPoolTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    @Test
    void difficultyIsPositiveForVanillaFaces() {
        assertTrue(ETIMEnchantPool.difficultyOf(Enchantments.SHARPNESS) > 0);
        assertTrue(ETIMEnchantPool.difficultyOf(Enchantments.PROTECTION) > 0);
        assertTrue(ETIMEnchantPool.difficultyOf(Enchantments.MENDING) > 0);
    }

    @Test
    void maxLevelMatchesTheTableOrTheVanillaCap() {
        assertTrue(ETIMEnchantPool.maxLevelOf(Enchantments.SHARPNESS) >= 1);
        assertEquals(1, ETIMEnchantPool.maxLevelOf(Enchantments.MENDING));
        assertEquals(3, ETIMEnchantPool.maxLevelOf(Enchantments.UNBREAKING));
    }

    @Test
    void weightIsAlwaysPositive() {
        for (Enchantment e : new Enchantment[] {Enchantments.SHARPNESS, Enchantments.MENDING, Enchantments.FORTUNE}) {
            assertTrue(ETIMEnchantPool.weightOf(e) > 0, e.getRegistryName().toString());
        }
    }

    @Test
    void minCostIsLinearInLevel() {
        for (Enchantment e : new Enchantment[] {Enchantments.SHARPNESS, Enchantments.PROTECTION}) {
            int diff = ETIMEnchantPool.difficultyOf(e);
            assertEquals(Math.max(diff - 10, 0) + 1, ETIMEnchantPool.minCost(e, 1), e.getRegistryName().toString());
            for (int level = 1; level <= 3; level++) {
                assertEquals(diff, ETIMEnchantPool.minCost(e, level + 1) - ETIMEnchantPool.minCost(e, level),
                        e.getRegistryName() + " level " + level);
            }
        }
    }

    @Test
    void hasLevelsFollowsTheCap() {
        assertTrue(ETIMEnchantPool.hasLevels(Enchantments.SHARPNESS));
        assertTrue(ETIMEnchantPool.hasLevels(Enchantments.UNBREAKING));
        assertFalse(ETIMEnchantPool.hasLevels(Enchantments.MENDING));
    }

    @Test
    void protectionCarrierIsArmorOnly() {
        assertTrue(ETIMEnchantPool.canEnchantR196(Enchantments.PROTECTION, Items.IRON_CHESTPLATE));
        assertFalse(ETIMEnchantPool.canEnchantR196(Enchantments.PROTECTION, Items.DIAMOND_SWORD));
    }

    @Test
    void featherFallingIsBootsOnly() {
        assertTrue(ETIMEnchantPool.canEnchantR196(Enchantments.FEATHER_FALLING, Items.IRON_BOOTS));
        assertFalse(ETIMEnchantPool.canEnchantR196(Enchantments.FEATHER_FALLING, Items.IRON_CHESTPLATE));
    }

    @Test
    void bowEnchantmentsStayOnBows() {
        assertTrue(ETIMEnchantPool.canEnchantR196(Enchantments.POWER, Items.BOW));
        assertFalse(ETIMEnchantPool.canEnchantR196(Enchantments.POWER, Items.DIAMOND_SWORD));
    }

    @Test
    void unbreakingRidesToolsAndArmorNotSwords() {
        assertTrue(ETIMEnchantPool.canEnchantR196(Enchantments.UNBREAKING, Items.IRON_PICKAXE));
        assertTrue(ETIMEnchantPool.canEnchantR196(Enchantments.UNBREAKING, Items.IRON_CHESTPLATE));
        assertFalse(ETIMEnchantPool.canEnchantR196(Enchantments.UNBREAKING, Items.IRON_SWORD));
    }

    @Test
    void damageFamilyIsMutuallyExclusive() {
        assertFalse(ETIMEnchantPool.compatible(Enchantments.SHARPNESS, Enchantments.SMITE));
        assertFalse(ETIMEnchantPool.compatible(Enchantments.SMITE, Enchantments.BANE_OF_ARTHROPODS));
        assertTrue(ETIMEnchantPool.compatible(Enchantments.SHARPNESS, Enchantments.PROTECTION));
    }

    @Test
    void protectionFamilyCollidesExceptFeatherFalling() {
        assertFalse(ETIMEnchantPool.compatible(Enchantments.PROTECTION, Enchantments.BLAST_PROTECTION));
        assertTrue(ETIMEnchantPool.compatible(Enchantments.PROTECTION, Enchantments.FEATHER_FALLING));
        assertTrue(ETIMEnchantPool.compatible(Enchantments.BLAST_PROTECTION, Enchantments.FEATHER_FALLING));
    }

    @Test
    void fortuneAndSilkTouchAreExclusive() {
        assertFalse(ETIMEnchantPool.compatible(Enchantments.FORTUNE, Enchantments.SILK_TOUCH));
        assertFalse(ETIMEnchantPool.compatible(Enchantments.LOOTING, Enchantments.SILK_TOUCH));
        assertFalse(ETIMEnchantPool.compatible(Enchantments.SILK_TOUCH, Enchantments.FORTUNE));
        assertTrue(ETIMEnchantPool.compatible(Enchantments.FORTUNE, Enchantments.UNBREAKING));
    }

    @Test
    void identicalPairIsRejectedByTheBaseRule() {
        assertFalse(ETIMEnchantPool.compatible(Enchantments.SHARPNESS, Enchantments.SHARPNESS));
        assertTrue(ETIMEnchantPool.compatible(Enchantments.SHARPNESS, Enchantments.UNBREAKING));
    }

    @Test
    void alteredKeepsLowBudgetsVerbatim() {
        Item ironSword = Items.IRON_SWORD;
        assertEquals(0, ETIMEnchantPool.altered(0, ironSword));
        assertEquals(1, ETIMEnchantPool.altered(1, ironSword));
        assertTrue(ETIMEnchantPool.altered(40, ironSword) >= ETIMEnchantPool.altered(20, ironSword));
    }

    @Test
    void alteredMatchesTheGateForTheSameEnchantability() {
        ItemStack stack = new ItemStack(Items.DIAMOND_SWORD);
        int ench = stack.getItem().getItemEnchantability();
        assertEquals(EnchantGates.altered(15, ench), ETIMEnchantPool.altered(15, stack.getItem()));
    }
}
