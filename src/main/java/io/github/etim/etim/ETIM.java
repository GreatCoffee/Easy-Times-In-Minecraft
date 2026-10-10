package io.github.etim.etim;

import io.github.etim.etim.commands.CommandDevTest;
import io.github.etim.etim.commands.CommandState;
import io.github.etim.etim.hunger.ETIMFoodStats;
import io.github.etim.etim.hunger.ETIMFoodStatsEvents;
import io.github.etim.etim.mining.ETIMEnchantments;
import io.github.etim.etim.mining.ETIMToolDurability;
import io.github.etim.etim.nutrition.NutritionNetwork;
import io.github.etim.etim.nutrition.NutritionSystem;
import io.github.etim.etim.playerstate.FoodDebugNetwork;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.event.FMLInitializationEvent;
import net.minecraftforge.fml.common.event.FMLPreInitializationEvent;
import net.minecraftforge.fml.common.event.FMLServerStartingEvent;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

/**
 * The main @Mod class of ETIM (Easy Times In Minecraft / 轻松时光).
 *
 * <p>ETIM reimplements the core gameplay mechanics of MITE
 * (Minecraft Is Too Easy) on Minecraft 1.12.2 Forge.</p>
 */
@Mod(modid = Tags.MOD_ID, name = Tags.MOD_NAME, version = Tags.VERSION)
public final class ETIM {

    /** Value of the {@code mod_id} gradle property at build time. */
    public static final String MOD_ID = Tags.MOD_ID;
    /** Value of the {@code mod_name} gradle property at build time. */
    public static final String MOD_NAME = Tags.MOD_NAME;
    /** Value of the {@code mod_version} gradle property at build time. */
    public static final String VERSION = Tags.VERSION;

    public static final Logger LOGGER = LogManager.getLogger(Tags.MOD_NAME);

    /**
     * <a href="https://cleanroommc.com/wiki/forge-mod-development/event#overview">
     *     Take a look at how many FMLStateEvents you can listen to via the @Mod.EventHandler annotation here
     * </a>
     */
    @Mod.EventHandler
    public void preInit(FMLPreInitializationEvent event) {
        NutritionSystem.register();
        NutritionNetwork.registerMessages();
        io.github.etim.etim.ingest.ETIMIngestNetwork.registerMessages();
        FoodDebugNetwork.registerMessages();
        ETIMFoodStats.register();
        ETIMEnchantments.register();
        ETIMConfig.init(event);
        // Manual registration for deterministic order against the 1.4 tick
        // drain (see ETIMFoodStatsEvents' class javadoc).
        MinecraftForge.EVENT_BUS.register(ETIMFoodStatsEvents.class);
        LOGGER.info("Hello From {}!", Tags.MOD_NAME);
    }

    @Mod.EventHandler
    public void init(FMLInitializationEvent event) {
        // Vanilla tools carry R196 material durability (task 2.2 ToolSuite).
        ETIMToolDurability.apply();
    }

    @Mod.EventHandler
    public void serverStarting(FMLServerStartingEvent event) {
        event.registerServerCommand(new CommandState());
        event.registerServerCommand(new CommandDevTest());
    }

}
