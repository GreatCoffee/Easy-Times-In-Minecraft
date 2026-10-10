package io.github.etim.etim.ingest;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMFoodStats;
import io.github.etim.etim.nutrition.NutritionSystem;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumHand;
import net.minecraft.util.ResourceLocation;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Task 2.4: the R196 ingestion routing (audit {@code mite-src\
 * R196 食物可食化机关终审.md}), the 1.12.2 shape of the three-segment right-
 * click pipeline (R196 {@code EntityPlayer.onPlayerRightClick:2562-2579}):
 *
 * <ol>
 *   <li>segment 1 / ingestion priority — {@code hasIngestionPriority(ctrl)}
 *       {@code && checkForIngestion()} → the eating path owns the click;</li>
 *   <li>segment 2 / use — {@code onItemRightClick(...)};</li>
 *   <li>segment 3 / fallback ingestion — same as 1 without priority.</li>
 * </ol>
 *
 * <p>Per the audit verdicts for the 7-items set:</p>
 * <ul>
 *   <li>sugar 97, mushrooms (block-挂值 1/1, Block.java:3399-3400) — plain
 *       eats started on base {@code Item} (mirroring vanilla
 *       {@code ItemFood.onItemRightClick}: gate → {@code setActiveHand} →
 *       SUCCESS); values sit in the 1.4 registry.</li>
 *   <li>egg 88 (1/3/protein, ItemEgg.java:5) — DUAL use, R196 semantics
 *       (vanilla-inverted): by default the click eats, holding the control
 *       key throws ({@code ItemEgg.hasIngestionPriority = !ctrl}).</li>
 *   <li>seeds 39/105/106/116 — eating path closed by R196 itself
 *       ({@code hasIngestionPriority=false} + plant-only
 *       {@code onItemRightClick}); vanilla 1.12 seeds never reach the food
 *       pipeline either, so there is nothing to wire.</li>
 *   <li>cake — slices already gated by task 1.4 (R196 BlockCake:80).</li>
 *   <li>milk bucket — always-edible and returns the empty bucket natively in
 *       1.12, same as R196 §四.</li>
 * </ul>
 *
 * <p>The {@code ctrl} state is the client's left-control key; the server
 * mirror is fed by {@link ETIMIngestNetwork} (client → server on change, plus
 * an initial report on the first tick after login). The expiry default of a
 * player without a report is "not held" = the R196 default (eat).</p>
 *
 * <p>[IngestLog] is the judgment channel for every routing decision
 * (config {@code food.ingestDebugLog}); value application on completion stays
 * on the [FoodLog] channel of the task-1.5 finish hook.</p>
 */
public final class ETIMIngestibles {

    /**
     * Items that start eating from the base {@code Item} pipeline (R196
     * block-挂值 foods + sugar + the egg's eating half). The egg is in the set
     * so the action/duration/shrink injections apply while eating; its
     * right-click fork lives in {@code MixinItemEgg} because vanilla's
     * {@code ItemEgg.onItemRightClick} override bypasses base.
     */
    private static final Set<Item> INGESTIBLE = new HashSet<Item>();

    /** Server mirror of the client control key, keyed by player UUID. */
    private static final Map<UUID, Boolean> CTRL_HELD = new HashMap<UUID, Boolean>();

    static {
        INGESTIBLE.add(Items.SUGAR);
        INGESTIBLE.add(Item.getItemFromBlock(net.minecraft.init.Blocks.BROWN_MUSHROOM));
        INGESTIBLE.add(Item.getItemFromBlock(net.minecraft.init.Blocks.RED_MUSHROOM));
        INGESTIBLE.add(Items.EGG);
    }

    private ETIMIngestibles() {
    }

    public static boolean isIngestible(ItemStack stack) {
        return !stack.isEmpty() && INGESTIBLE.contains(stack.getItem());
    }

    /** Ident + gate + mirror of vanilla ItemFood's start branch (ClientTick 1.12.2 ItemFood.onItemRightClick:99-102). */
    public static boolean tryStartEating(EntityPlayer player, EnumHand hand, ItemStack stack, String item) {
        NutritionSystem.FoodValue value = NutritionSystem.getFoodValue(stack);
        if (!ETIMFoodStats.canIngest(player, value)) {
            logIngest(player, item + " right-click refused by canIngest");
            return false;
        }
        player.setActiveHand(hand);
        logIngest(player, item + " start eating (" + ETIMConfig.ingestUseDurationTicks + " ticks)");
        return true;
    }

    /** Item display key for logs. */
    public static String itemKey(ItemStack stack) {
        ResourceLocation name = stack.getItem().getRegistryName();
        return name == null ? stack.getItem().getClass().getSimpleName() : name.toString();
    }

    /** Server mirror setter ({@link ETIMIngestNetwork} handler). */
    public static void setCtrlHeld(UUID playerId, boolean held) {
        CTRL_HELD.put(playerId, held);
    }

    /** Server mirror cleanup on logout. */
    public static void forgetCtrl(UUID playerId) {
        CTRL_HELD.remove(playerId);
    }

    /**
     * The control state of the click. Client side reads the real key state
     * (the tick watcher also uses this), the server reads the mirror fed by
     * {@link ETIMIngestNetwork}; a missing report means "not held" — the R196
     * default (eat).
     */
    public static boolean isCtrlHeld(EntityPlayer player) {
        if (player.world.isRemote) {
            return ClientKeys.isControlDown();
        }
        Boolean held = CTRL_HELD.get(player.getUniqueID());
        return held != null && held;
    }

    /** [IngestLog] channel entry (same logger, different tag than [FoodLog]). */
    public static void logIngest(EntityPlayer player, String line) {
        if (ETIMConfig.ingestDebugLog) {
            ETIM.LOGGER.info("[IngestLog] {} ({}) {}", player.getName(), player.getEntityId(), line);
        }
    }

    /**
     * Side-separated key reader; the nested class only loads when the client
     * branch executes, so the dedicated server never links LWJGL keyboard
     * classes.
     */
    private static final class ClientKeys {
        private static boolean isControlDown() {
            return org.lwjgl.input.Keyboard.isKeyDown(org.lwjgl.input.Keyboard.KEY_LCONTROL);
        }
    }
}
