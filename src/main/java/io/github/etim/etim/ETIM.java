package io.github.etim.etim;

import io.github.etim.etim.commands.CommandDevTest;
import io.github.etim.etim.commands.CommandState;
import io.github.etim.etim.commands.CommandXpPool;
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

    /** Forge-injected mod instance (entity registration carrier). */
    @Mod.Instance(Tags.MOD_ID)
    private static ETIM instance;

    /** Value of the {@code mod_id} gradle property at build time. */
    public static final String MOD_ID = Tags.MOD_ID;
    /** Value of the {@code mod_name} gradle property at build time. */
    public static final String MOD_NAME = Tags.MOD_NAME;
    /** Value of the {@code mod_version} gradle property at build time. */
    public static final String VERSION = Tags.VERSION;

    public static final Logger LOGGER = LogManager.getLogger(Tags.MOD_NAME);

    /** Mod-instance accessor for the Forge registries. */
    public static ETIM instance() {
        return instance;
    }

    /**
     * <a href="https://cleanroommc.com/wiki/forge-mod-development/event#overview">
     *     Take a look at how many FMLStateEvents you can listen to via the @Mod.EventHandler annotation here
     * </a>
     */
    @Mod.EventHandler
    public void preInit(FMLPreInitializationEvent event) {
        NutritionSystem.register();
        io.github.etim.etim.ingest.ETIMIngestNetwork.registerMessages();
        FoodDebugNetwork.registerMessages();
        io.github.etim.etim.crafting.CraftingProgressNetwork.registerServerShard();
        io.github.etim.etim.nutrition.NutritionNetwork.registerMessages();
        ETIMFoodStats.register();
        io.github.etim.etim.death.ETIMDeathXp.register();
        io.github.etim.etim.mob.ETIMLivestock.register();
        io.github.etim.etim.mob.ETIMDigging.register();
        io.github.etim.etim.mob.ETIMSpiderEntities.register();
        // Batch B1 metal content: items first (XP rows), blocks + recipes second.
        io.github.etim.etim.metal.ETIMItems.register();
        io.github.etim.etim.metal.ETIMBlocks.register();
        // Batch B2 metal gear: 50 tools + 40 armor + 5 chains, recipes + [EquipLog] dump.
        io.github.etim.etim.metal.ETIMGear.register();
        io.github.etim.etim.furnace.FurnaceHeat.addJudgedRecipes();
        // Batch B1: ETIM's first GuiHandler (批文项2) + the dungeon-chest loot hook (B-2(a)).
        net.minecraftforge.fml.common.network.NetworkRegistry.INSTANCE.registerGuiHandler(
                ETIM.instance(), new io.github.etim.etim.fml.ETIMGuiHandler());
        MinecraftForge.EVENT_BUS.register(io.github.etim.etim.metal.ETIMMetalLoot.class);
        // 批三修理面 (anvil-repair chain): the take face — breakChance 0 +
        // proportional anvil wear + the [CraftingLog] judgment row.
        io.github.etim.etim.metal.ETIMAnvilRepair.register();
        ETIMEnchantments.register();
        ETIMConfig.init(event);
        // The nutrition-mirror and crafting-progress handlers carry
        // net.minecraft.client.* bodies; the 1.12 registerMessage path
        // instantiates the handler class, so those two register ONLY on the
        // CLIENT side (see client/ClientNetworkHooks for both sides' story).
        if (event.getSide().isClient()) {
            io.github.etim.etim.client.ClientNetworkHooks.register();
        }
        // Manual registration for deterministic order against the 1.4 tick
        // drain (see ETIMFoodStatsEvents' class javadoc).
        MinecraftForge.EVENT_BUS.register(ETIMFoodStatsEvents.class);
        // Stage 5: R196 despawn chain + per-class attribute rows (+ livestock
        // wellness v1) — all judged from [AILog].
        MinecraftForge.EVENT_BUS.register(io.github.etim.etim.mob.ETIMMobStats.class);
        io.github.etim.etim.mob.ETIMLivestockEvents.register();
        io.github.etim.etim.mob.ETIMDiggingEvents.register();
        if (event.getSide().isClient()) {
            // Furnace slot heat tooltip row (top-of-tips prepend, F round):
            // ItemTooltipEvent originates client-side only; the handler reads
            // client API (uses I18n) so keep it off the server bus entirely.
            MinecraftForge.EVENT_BUS.register(io.github.etim.etim.client.FurnaceTooltipHints.class);
        }
        LOGGER.info("Hello From {}!", Tags.MOD_NAME);
    }

    @Mod.EventHandler
    public void init(FMLInitializationEvent event) {
        // Vanilla tools carry R196 material durability (task 2.2 ToolSuite).
        ETIMToolDurability.apply();
        // B3 A-1: fail-fast — gear rows must still carry their judged maxDamage.
        io.github.etim.etim.metal.ETIMGear.reassertJudgedDurability();
        // All preInits complete by here: CT's config load covered (compat fix).
        io.github.etim.etim.compat.CraftingTweaksCompat.apply();
    }

    @Mod.EventHandler
    public void serverStarting(FMLServerStartingEvent event) {
        event.registerServerCommand(new CommandState());
        if (ETIMConfig.devTools) {
            event.registerServerCommand(new CommandDevTest());
        }
        // ❗F-4-30（第二批裁点3=A）：replace the vanilla /xp registration with
        // the R196 pool-absolut set (CommandHandler.getCommands() is the live
        // registry map; same-name put = swap). The L-face keeps vanilla syntax
        // but carries the R196 level-curve pool delta.
        event.getServer().getCommandManager().getCommands().put("xp", new CommandXpPool());
    }

}
