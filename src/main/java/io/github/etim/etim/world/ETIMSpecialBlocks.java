package io.github.etim.etim.world;

import net.minecraftforge.fml.common.registry.ForgeRegistries;

import io.github.etim.etim.ETIM;

/**
 * R196 non-material block carriers that have no item form (census F :126).
 * At present only {@link #SPARK}: R196 {@code Block.java:917-923} registers it
 * with {@code disableStats()} and the invisible texture, so there is nothing
 * to put in a creative tab or an item model.
 */
public final class ETIMSpecialBlocks {

    public static final ETIMBlockSpark SPARK = new ETIMBlockSpark();

    private ETIMSpecialBlocks() {
    }

    public static void register() {
        ForgeRegistries.BLOCKS.register(SPARK);
        ETIM.LOGGER.info("[SparkLog] registered {} hardness=0 light=1.0 render=invisible item=none [server]",
                SPARK.getRegistryName());
    }
}
