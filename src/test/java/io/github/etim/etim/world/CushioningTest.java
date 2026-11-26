package io.github.etim.etim.world;

import net.minecraft.block.BlockSnow;
import net.minecraft.init.Blocks;
import net.minecraft.init.Bootstrap;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * B-70TJ: R196 per-block cushioning table ({@code Block.java:2575-2582}) and
 * the composition rule ({@code EntityLivingBase.java:1010-1057}).
 */
class CushioningTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    private static void eq(float expected, float actual) {
        assertEquals(expected, actual, 1.0E-4F);
    }

    @Test
    void tableMatchesR196() {
        eq(0.4F, ETIMCushioning.of(Blocks.SAND.getDefaultState()));
        eq(1.0F, ETIMCushioning.of(Blocks.SPONGE.getDefaultState()));
        eq(0.6F, ETIMCushioning.of(Blocks.BED.getDefaultState()));
        eq(0.2F, ETIMCushioning.of(Blocks.TALLGRASS.getDefaultState()));
        eq(0.8F, ETIMCushioning.of(Blocks.WOOL.getDefaultState()));
        eq(0.4F, ETIMCushioning.of(Blocks.HAY_BLOCK.getDefaultState()));
        eq(0.8F, ETIMCushioning.of(Blocks.LEAVES.getDefaultState()));
        eq(0.8F, ETIMCushioning.of(Blocks.LEAVES2.getDefaultState()));
        eq(0.8F, ETIMCushioning.of(Blocks.SNOW.getDefaultState()));
        eq(0.4F, ETIMCushioning.of(Blocks.FARMLAND.getDefaultState()));
        eq(0.4F, ETIMCushioning.of(Blocks.BROWN_MUSHROOM_BLOCK.getDefaultState()));
        eq(0.4F, ETIMCushioning.of(Blocks.RED_MUSHROOM_BLOCK.getDefaultState()));
        eq(0.4F, ETIMCushioning.of(Blocks.SOUL_SAND.getDefaultState()));
        eq(0.2F, ETIMCushioning.of(Blocks.DIRT.getDefaultState()));
        eq(0.2F, ETIMCushioning.of(Blocks.GRASS.getDefaultState()));
        eq(0.2F, ETIMCushioning.of(Blocks.WHEAT.getDefaultState()));
        eq(0.2F, ETIMCushioning.of(Blocks.CARROTS.getDefaultState()));
        eq(0.2F, ETIMCushioning.of(Blocks.POTATOES.getDefaultState()));
        eq(0.2F, ETIMCushioning.of(Blocks.BEETROOTS.getDefaultState()));
        eq(0.2F, ETIMCushioning.of(Blocks.SAPLING.getDefaultState()));
        eq(0.2F, ETIMCushioning.of(Blocks.DEADBUSH.getDefaultState()));
    }

    @Test
    void unlistedBlocksCarryNone() {
        eq(0.0F, ETIMCushioning.of(Blocks.STONE.getDefaultState()));
        eq(0.0F, ETIMCushioning.of(Blocks.PLANKS.getDefaultState()));
        eq(0.0F, ETIMCushioning.of(Blocks.WATER.getDefaultState()));
        eq(0.0F, ETIMCushioning.of(null));
    }

    @Test
    void snowLayerScalesWithDepth() {
        for (int layers = 1; layers <= 8; layers++) {
            eq(0.2F * layers, ETIMCushioning.of(
                    Blocks.SNOW_LAYER.getDefaultState().withProperty(BlockSnow.LAYERS, layers)));
        }
    }

    @Test
    void compositionAddsBelowOnlyForSnowLikeBase() {
        // Sand resting on stone: only the base counts.
        eq(0.4F, ETIMCushioning.compose(0.4F, false, 0.2F, 0.0F));
        // Snow layer 2 (0.4) over air (below contributes 1.0) -> clamp 1.0.
        eq(1.0F, ETIMCushioning.compose(0.4F, true, 1.0F, 0.0F));
        // Snow layer 1 (0.2) over wool (0.8) -> 1.0.
        eq(1.0F, ETIMCushioning.compose(0.2F, true, 0.8F, 0.0F));
    }

    @Test
    void compositionAddsBlockAboveFeet() {
        // Bed 0.6 with tall grass at the feet (0.2) -> 0.8.
        eq(0.8F, ETIMCushioning.compose(0.6F, false, 0.0F, 0.2F));
        // Hay 0.4 + above 0.8 -> clamp to 1.0.
        eq(1.0F, ETIMCushioning.compose(0.4F, false, 0.0F, 0.8F));
    }

    @Test
    void compositionClampsAtOne() {
        eq(1.0F, ETIMCushioning.compose(1.0F, false, 0.0F, 0.0F));
        eq(1.0F, ETIMCushioning.compose(0.8F, false, 0.0F, 0.4F));
        eq(1.0F, ETIMCushioning.compose(0.2F, true, 1.0F, 0.2F));
    }
}
