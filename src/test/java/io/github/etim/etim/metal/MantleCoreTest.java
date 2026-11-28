package io.github.etim.etim.metal;

import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Bootstrap;
import net.minecraft.init.Blocks;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * B-70VQ: 地幔/地核两态识别（R196 BlockMantleOrCore :41-51 的 meta 0 / meta 1）。
 */
class MantleCoreTest {

    @BeforeAll
    static void boot() {
        Bootstrap.register();
    }

    @Test
    void metadataConstantsAreZeroAndOne() {
        assertEquals(0, ETIMBlockMantleOrCore.METADATA_MANTLE);
        assertEquals(1, ETIMBlockMantleOrCore.METADATA_CORE);
        assertEquals("mantle", ETIMBlockMantleOrCore.VARIANT.getName());
    }

    @Test
    void defaultStateIsTheMantle() {
        ETIMBlockMantleOrCore block = new ETIMBlockMantleOrCore();
        IBlockState state = block.getDefaultState();
        assertEquals(ETIMBlockMantleOrCore.METADATA_MANTLE, state.getValue(ETIMBlockMantleOrCore.VARIANT));
        assertTrue(ETIMBlockMantleOrCore.isMantle(state));
        assertFalse(ETIMBlockMantleOrCore.isCore(state));
    }

    @Test
    void coreVariantFlipsTheTwoPredicates() {
        ETIMBlockMantleOrCore block = new ETIMBlockMantleOrCore();
        IBlockState core = block.getDefaultState().withProperty(ETIMBlockMantleOrCore.VARIANT,
            ETIMBlockMantleOrCore.METADATA_CORE);
        assertTrue(ETIMBlockMantleOrCore.isCore(core));
        assertFalse(ETIMBlockMantleOrCore.isMantle(core));
    }

    @Test
    void foreignBlocksAreNeither() {
        IBlockState stone = Blocks.STONE.getDefaultState();
        assertFalse(ETIMBlockMantleOrCore.isMantle(stone));
        assertFalse(ETIMBlockMantleOrCore.isCore(stone));
    }

    @Test
    void variantPropertyOnlyAllowsTheTwoStates() {
        assertEquals(2, ETIMBlockMantleOrCore.VARIANT.getAllowedValues().size());
    }
}
