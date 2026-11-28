package io.github.etim.etim.farm;

import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Biomes;
import net.minecraft.init.Blocks;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * B-71: the R196 bush alphabet — biome gate (BlockBush.java:97-99), soil gate
 * (BlockPlant.isLegalOn :51-53), growth rate (:174-180) and the metadata
 * packing (growth in the high two bits, berries = 3 → meta 12).
 */
public class BushGatesTest {

    private static ETIMBlockBush BUSH;

    @BeforeAll
    static void boot() {
        // Bootstrap first: the constructor touches CreativeTabs/Material and
        // must not run before the registries exist (B-70VF lesson).
        net.minecraft.init.Bootstrap.register();
        BUSH = new ETIMBlockBush();
    }

    @Test
    void onlyTheTwoConcreteForestBiomesAreSuitable() {
        assertTrue(ETIMBlockBush.isBushBiome(Biomes.FOREST));
        assertTrue(ETIMBlockBush.isBushBiome(Biomes.FOREST_HILLS));
        assertFalse(ETIMBlockBush.isBushBiome(Biomes.BIRCH_FOREST));
        assertFalse(ETIMBlockBush.isBushBiome(Biomes.PLAINS));
        assertFalse(ETIMBlockBush.isBushBiome(Biomes.TAIGA));
    }

    @Test
    void soilMustBeGrassDirtOrTilledField() {
        assertTrue(ETIMBlockBush.soilOk(Blocks.GRASS.getDefaultState()));
        assertTrue(ETIMBlockBush.soilOk(Blocks.DIRT.getDefaultState()));
        assertTrue(ETIMBlockBush.soilOk(Blocks.FARMLAND.getDefaultState()));
        assertFalse(ETIMBlockBush.soilOk(Blocks.STONE.getDefaultState()));
        assertFalse(ETIMBlockBush.soilOk(Blocks.SAND.getDefaultState()));
    }

    @Test
    void growthRatePeaksAtForestTemperature() {
        assertEquals(0.025F, ETIMBlockBush.growthRateFor(0.7F), 1.0E-6F);
    }

    @Test
    void growthRateFallsWithDistanceFromSeven() {
        assertEquals(0.0125F, ETIMBlockBush.growthRateFor(0.2F), 1.0E-6F);
        assertEquals(0.0075F, ETIMBlockBush.growthRateFor(0.0F), 1.0E-6F);
        assertEquals(0.0125F, ETIMBlockBush.growthRateFor(1.2F), 1.0E-6F);
    }

    @Test
    void growthRateClampsAtZeroOutsideTolerance() {
        assertEquals(0.0F, ETIMBlockBush.growthRateFor(1.7F), 1.0E-6F);
        assertEquals(0.0F, ETIMBlockBush.growthRateFor(-0.3F), 1.0E-6F);
        assertEquals(0.0F, ETIMBlockBush.growthRateFor(2.5F), 1.0E-6F);
    }

    @Test
    void berriesOnlyAtFullGrowth() {
        assertFalse(ETIMBlockBush.hasBerries(0));
        assertFalse(ETIMBlockBush.hasBerries(1));
        assertFalse(ETIMBlockBush.hasBerries(2));
        assertTrue(ETIMBlockBush.hasBerries(3));
        assertTrue(ETIMBlockBush.hasBerries(ETIMBlockBush.MAX_GROWTH));
    }

    @Test
    void metadataPacksGrowthInTheHighTwoBits() {
        assertEquals(12, ETIMBlockBush.META_WITH_BERRIES);
        assertEquals(0, BUSH.getMetaFromState(BUSH.getStateFromMeta(0)));
        assertEquals(4, BUSH.getMetaFromState(BUSH.getStateFromMeta(4)));
        assertEquals(12, BUSH.getMetaFromState(BUSH.getStateFromMeta(12)));
        assertEquals(3, BUSH.getStateFromMeta(12).getValue(ETIMBlockBush.GROWTH).intValue());
        assertEquals(1, BUSH.getStateFromMeta(6).getValue(ETIMBlockBush.GROWTH).intValue());
        assertEquals(3, BUSH.getStateFromMeta(15).getValue(ETIMBlockBush.GROWTH).intValue());
    }

    @Test
    void stateAlwaysCarriesExactlyTheGrowthProperty() {
        IBlockState state = BUSH.getDefaultState();
        assertEquals(1, state.getPropertyKeys().size());
        assertTrue(state.getPropertyKeys().contains(ETIMBlockBush.GROWTH));
        assertEquals(0, state.getValue(ETIMBlockBush.GROWTH).intValue());
    }
}
