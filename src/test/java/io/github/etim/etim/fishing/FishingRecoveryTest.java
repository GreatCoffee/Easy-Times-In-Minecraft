package io.github.etim.etim.fishing;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * B-70VR: 鱼钩回收概率表（R196 ItemFishingRod 的 per-metal 回收率）。
 */
class FishingRecoveryTest {

    @Test
    void copperAndSilverShareSixtyPercent() {
        assertEquals(0.6F, ETIMFishing.recoveryChanceByName("copper"));
        assertEquals(0.6F, ETIMFishing.recoveryChanceByName("silver"));
    }

    @Test
    void rustedIronAndGoldShareFiftyPercent() {
        assertEquals(0.5F, ETIMFishing.recoveryChanceByName("rusted_iron"));
        assertEquals(0.5F, ETIMFishing.recoveryChanceByName("gold"));
    }

    @Test
    void vanillaIronIsSeventyPercent() {
        assertEquals(0.7F, ETIMFishing.recoveryChanceByName("iron"));
    }

    @Test
    void obsidianIsTheLowestNamed() {
        assertEquals(0.4F, ETIMFishing.recoveryChanceByName("obsidian"));
    }

    @Test
    void mithrilAndAncientMetalShareEightyPercent() {
        assertEquals(0.8F, ETIMFishing.recoveryChanceByName("mithril"));
        assertEquals(0.8F, ETIMFishing.recoveryChanceByName("ancient_metal"));
    }

    @Test
    void adamantiumIsTheBest() {
        assertEquals(0.9F, ETIMFishing.recoveryChanceByName("adamantium"));
    }

    @Test
    void flintAndUnknownFallBackToThirtyPercent() {
        assertEquals(0.3F, ETIMFishing.recoveryChanceByName("flint"));
        assertEquals(0.3F, ETIMFishing.recoveryChanceByName(""));
        assertEquals(0.3F, ETIMFishing.recoveryChanceByName("unobtainium"));
    }
}
