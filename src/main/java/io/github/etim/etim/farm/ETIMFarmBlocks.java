package io.github.etim.etim.farm;

import io.github.etim.etim.ETIM;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * Drought-death batch (B-8): the two dead-plant carriers — one class, two
 * instances (ETIMBlockOre multi-instance precedent). No ItemBlock either
 * (R196 canBeCarried false; portal NA-28 precedent).
 */
public final class ETIMFarmBlocks {

    private ETIMFarmBlocks() {
    }

    public static void register() {
        ETIMBlockDeadPlant.DEAD_CROP = new ETIMBlockDeadPlant("dead_crop", false);
        ETIMBlockDeadPlant.DEAD_STEM = new ETIMBlockDeadPlant("dead_stem", true);
        ForgeRegistries.BLOCKS.register(ETIMBlockDeadPlant.DEAD_CROP);
        ForgeRegistries.BLOCKS.register(ETIMBlockDeadPlant.DEAD_STEM);
        ETIM.LOGGER.info("[FarmLog] dead-plant carriers registered (dead_crop/dead_stem, no ItemBlock) [server]");
    }
}
