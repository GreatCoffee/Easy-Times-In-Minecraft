package io.github.etim.etim.weather;

import net.minecraft.init.Bootstrap;
import net.minecraft.world.biome.Biome;
import net.minecraft.world.biome.BiomeDesert;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * B-70VR: 群系「会结冰」判定（R196 BiomeGenBase :351-353 temperature &lt;= 0.15）。
 */
class RainFreezingTest {

    @BeforeAll
    static void boot() {
        Bootstrap.register();
    }

    @Test
    void coldTaigaFreezes() {
        Biome coldTaiga = Biome.getBiome(30);
        assertTrue(coldTaiga.getDefaultTemperature() <= 0.15F);
        assertTrue(ETIMRain.isFreezing(coldTaiga));
    }

    @Test
    void desertNeverFreezes() {
        Biome desert = Biome.getBiome(2);
        assertFalse(ETIMRain.isFreezing(desert));
    }

    @Test
    void vanillaDesertInstanceMatchesRegistry() {
        assertSame(BiomeDesert.class, Biome.getBiome(2).getClass());
    }

    @Test
    void predicateIsTheTemperatureComparison() {
        for (int id = 0; id < 60; id++) {
            Biome b = Biome.getBiome(id);
            if (b == null) {
                continue;
            }
            org.junit.jupiter.api.Assertions.assertEquals(
                b.getDefaultTemperature() <= 0.15F, ETIMRain.isFreezing(b), "biome " + id);
        }
    }
}
