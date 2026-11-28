package io.github.etim.etim.crafting;

import net.minecraft.init.Bootstrap;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * B-70VQ: 合成难度查表（R196 CraftingManager 的 per-item 难度 + 箭族整族 40 + 通用回落）。
 */
class CraftingDifficultyTest {

    @BeforeAll
    static void boot() {
        Bootstrap.register();
    }

    @BeforeEach
    void save() {
        CraftingDifficulty.setGenericDifficulty(25.0F);
    }

    @AfterEach
    void restore() {
        CraftingDifficulty.setGenericDifficulty(25.0F);
    }

    @Test
    void unregisteredItemFallsBackToGeneric() {
        assertEquals(25.0F, CraftingDifficulty.difficultyOf(new ItemStack(Items.FEATHER)));
    }

    @Test
    void genericIsConfigurable() {
        CraftingDifficulty.setGenericDifficulty(33.0F);
        assertEquals(33.0F, CraftingDifficulty.difficultyOf(new ItemStack(Items.FEATHER)));
    }

    @Test
    void arrowFamilyIsForty() {
        assertEquals(40.0F, CraftingDifficulty.difficultyOf(new ItemStack(Items.ARROW)));
        assertEquals(40.0F, CraftingDifficulty.difficultyOf(new ItemStack(Items.SPECTRAL_ARROW)));
        assertEquals(40.0F, CraftingDifficulty.difficultyOf(new ItemStack(Items.TIPPED_ARROW)));
    }

    @Test
    void registeredItemOverridesGeneric() {
        CraftingDifficulty.register(Items.BONE, 12.5F);
        assertEquals(12.5F, CraftingDifficulty.difficultyOf(new ItemStack(Items.BONE)));
    }

    @Test
    void registeredArrowOverridesTheFamilyDefault() {
        CraftingDifficulty.register(Items.ARROW, 7.0F);
        assertEquals(7.0F, CraftingDifficulty.difficultyOf(new ItemStack(Items.ARROW)));
        assertEquals(40.0F, CraftingDifficulty.difficultyOf(new ItemStack(Items.SPECTRAL_ARROW)));
    }

    @Test
    void genericChangeDoesNotLeakIntoRegisteredRows() {
        CraftingDifficulty.register(Items.SLIME_BALL, 9.0F);
        CraftingDifficulty.setGenericDifficulty(50.0F);
        assertEquals(9.0F, CraftingDifficulty.difficultyOf(new ItemStack(Items.SLIME_BALL)));
        assertEquals(50.0F, CraftingDifficulty.difficultyOf(new ItemStack(Items.FEATHER)));
    }
}
