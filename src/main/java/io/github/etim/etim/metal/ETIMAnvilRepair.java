package io.github.etim.etim.metal;

import java.util.HashMap;
import java.util.Map;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.crafting.CraftingDifficulty;
import io.github.etim.etim.quality.ETIMQuality;
import io.github.etim.etim.quality.EnumQuality;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemArmor;
import net.minecraft.item.ItemStack;
import net.minecraft.item.crafting.IRecipe;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.event.entity.player.AnvilRepairEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * 批三修理面（砧修链）— the R196 anvil-repair semantics ported onto the
 * vanilla 1.12 anvil, ETIM gear only (裁点 T4①). 判据正本:
 *
 * <ul>
 *   <li>R196 ContainerRepair :52-119 — the dual repair paths (consumable /
 *       combination) + the three gates (anvil metal, quality, skillsets);
 *       :121-269 — the repair-amount loop and output faces.</li>
 *   <li>CraftingManager :309-319 — combination = pure remaining-durability
 *       sum capped at max (NO vanilla 12% bonus).</li>
 *   <li>Item :1229-1246 — the per-metal nugget map; :1237 iron and
 *       rusted_iron share the ironNugget (铁珠).</li>
 *   <li>ItemTool :290-292 / ItemArmor :342-348 — repair cost = components × 2
 *       (armor chain halved); per-nugget repair = maxDamage / cost.</li>
 *   <li>BlockAnvil :191-208 — the iron-anvil durability 1600 × 31 × 8.0 =
 *       396,800 wear units; wear stages ≥0.5/0.8/1.0 → damage metadata
 *       1/2/broken (TileEntityAnvil :23-34 对位).</li>
 *   <li>ContainerRepairINNER2 :30-77 — the take face: proportional anvil
 *       wear (tool ×1 / armor ×200, 终审补-4), NO wear on the combination
 *       path (:31), nugget consumption, aux SFX 1021.</li>
 * </ul>
 *
 * <p>裁点 (2026-10-24): T1① XP 0 级 (maximumCost=0 + the canTakeStack bypass,
 * 终审 A-1); T2① proportional anvil wear on a WorldSavedData accumulator
 * (载体 b, B-6 修正案) + AnvilRepairEvent.setBreakChance(0); T3① both paths
 * in one port; T4① vanilla items keep the vanilla anvil flow; T8① the
 * quality-gate difficulty = Σ component difficulties of the cheapest
 * producing recipe (R196 getLowestCraftingDifficultyToProduce, Item
 * :1622-1640 对位). The R196 skillset gate is a no-op (ETIM has no
 * skillsets — the areSkillsEnabled()=false branch, ContainerRepair :109).</p>
 *
 * <p>fail-2 (anvil too soft) outranks fail-1 (quality over budget) — the
 * R196 container flag order (材料门先行, javap @329-338 定谳).</p>
 */
public final class ETIMAnvilRepair {

    /** The vanilla-iron-anvil metal gate (R196 :74-76/:88-92 strict >; EnumEquipmentMaterial :12 iron 8.0F). */
    public static final float ANVIL_METAL_DURABILITY = 8.0F;

    /** The iron-anvil wear capacity: 1600 × 31 × 8.0 (R196 BlockAnvil :191-197). */
    public static final int ANVIL_WEAR_CAPACITY = (int) (1600F * 31F * ANVIL_METAL_DURABILITY);

    /** R196 ContainerRepairINNER2 :35 armor ratio (mattockIron 12800 ÷ bootsIron 64, 终审补-4). */
    private static final int ARMOR_WEAR_RATIO = 200;

    /** T8① cache: item → min producing-recipe difficulty (recipes are static after boot). */
    private static final Map<Item, Float> PRODUCE_DIFFICULTY = new HashMap<>();

    /** Plan kinds for the container takeover (R196 isRepairing faces). */
    public enum Kind {
        /** Not a repair context — the vanilla flow runs untouched (T4①). */
        NONE,
        /** The nugget consumable path (R196 :81-84). */
        CONSUMABLE,
        /** The same-item combination path (R196 :63-71). */
        COMBO,
        /** A gated repair: fail 1 = quality over budget, fail 2 = anvil too soft. */
        FAIL,
        /**
         * The clean-twin denial (R196 :67-71): a same-item pair the takeover
         * claims but refuses — the vanilla combination branch (:228+ the 12%
         * bonus) would otherwise repair it. Silent empty output, no fail flag
         * (R196 :95 is_repairing=false → the null-output face, but CLAIMED —
         * the vanilla flow must not see it).
         */
        DENIED
    }

    /** The computed repair outcome for one container recompute. */
    public static final class Plan {
        public Kind kind = Kind.NONE;
        /** 1 = quality over budget, 2 = anvil too soft (only when kind == FAIL). */
        public int fail = 0;
        /** The output stack (EMPTY on FAIL). */
        public ItemStack output = ItemStack.EMPTY;
        /** Nuggets consumed on take (R196 stackSizeToBeUsedInRepair). */
        public int nuggetsUsed = 0;
    }

    private ETIMAnvilRepair() {
    }

    /** R196 Item.getRepairItem :1229-1246 — the per-metal nugget map. */
    public static Item nuggetOf(ETIMMetals metal) {
        if (metal == null) {
            return null;
        }
        switch (metal) {
            case COPPER: return ETIMItems.nuggetCopper;
            case SILVER: return ETIMItems.nuggetSilver;
            case MITHRIL: return ETIMItems.nuggetMithril;
            case ADAMANTIUM: return ETIMItems.nuggetAdamantium;
            case ANCIENT_METAL: return ETIMItems.nuggetAncientMetal;
            // R196 Item.java:1237 — iron and rusted_iron share the ironNugget (铁珠).
            case RUSTED_IRON: return Items.IRON_NUGGET;
            default: return null;
        }
    }

    /** The nugget's own material durability (R196 :87 reads the SECOND slot's material; EnumEquipmentMaterial :4-20). */
    public static float repairMaterialDurability(ItemStack nugget) {
        Item item = nugget.getItem();
        if (item == Items.IRON_NUGGET) {
            return 8.0F; // :1237 — the shared iron/rusted carrier, iron column
        }
        if (item == ETIMItems.nuggetCopper || item == ETIMItems.nuggetSilver) {
            return 4.0F;
        }
        if (item == ETIMItems.nuggetMithril) {
            return 64.0F;
        }
        if (item == ETIMItems.nuggetAdamantium) {
            return 256.0F;
        }
        if (item == ETIMItems.nuggetAncientMetal) {
            return 16.0F;
        }
        return Float.MAX_VALUE;
    }

    /**
     * T8① — R196 getLowestCraftingDifficultyToProduce (Item :1622-1640) 对位:
     * the min Σ component difficulties over every recipe producing this item;
     * unproducible items (rusted loot gear) keep the R196 MAX face (the
     * quality budget then floors out — sub-average loot quality passes).
     */
    public static float lowestCraftingDifficultyToProduce(Item item) {
        return PRODUCE_DIFFICULTY.computeIfAbsent(item, it -> {
            float min = Float.MAX_VALUE;
            for (ResourceLocation key : net.minecraft.item.crafting.CraftingManager.REGISTRY.getKeys()) {
                IRecipe recipe = net.minecraft.item.crafting.CraftingManager.REGISTRY.getObject(key);
                // The map iteration face (R196 :1622-1640): compare output ITEMS.
                if (recipe == null || recipe.getRecipeOutput().getItem() != it) {
                    continue;
                }
                float sum = 0.0F;
                for (net.minecraft.item.crafting.Ingredient ingredient : recipe.getIngredients()) {
                    ItemStack[] candidates = ingredient.getMatchingStacks();
                    if (candidates.length > 0) {
                        // ETIM recipes carry single-stack ingredients (fromStacks / vanilla items).
                        sum += CraftingDifficulty.difficultyOf(candidates[0]);
                    }
                }
                min = Math.min(min, sum);
            }
            return min;
        });
    }

    /**
     * The takeover brain (R196 isRepairing :52-119 + the updateRepairOutput
     * repair faces :121-269). Pure — both sides run it; the vanilla flow
     * stays untouched unless a repair context exists (T4①).
     */
    public static Plan plan(EntityPlayer player, ItemStack first, ItemStack second) {
        Plan plan = new Plan();
        if (first == null || first.isEmpty() || !(first.getItem() instanceof ETIMMetalGear)) {
            return plan;
        }
        ETIMMetalGear gear = (ETIMMetalGear) first.getItem();
        boolean secondThere = second != null && !second.isEmpty();

        boolean combo = false;
        boolean consumable = false;
        boolean deniedPair = false;
        int fail = 0;

        // --- the CLAIMED same-item pair face: when slot 1 holds the same ETIM
        //     item and slot 1 is damaged, the takeover owns the face even if
        //     the R196 combination rule then DENIES it — the vanilla
        //     combination branch (+12% bonus, 2 XP, no clean-twin denial)
        //     must never see an ETIM pair (smoke 18:13 round: a damaged +
        //     pristine pair repaired to full through the vanilla branch).
        if (secondThere
                && second.getItem() == first.getItem()
                && first.isItemDamaged()
                && first.getCount() == 1 && second.getCount() == 1) {
            // combination (R196 :63-71): same quality (size/damage ignored) +
            // second NOT enchanted; the clean-twin denial — both unenchanted
            // and slot 2 undamaged → refused.
            if (ETIMQuality.get(second) != ETIMQuality.get(first)) {
                return plan; // different carried quality — not an R196 pair; vanilla face
            }
            if (first.isItemEnchanted() || second.isItemDamaged()) {
                combo = true;
                if (gear.etimMaterialDurability() > ANVIL_METAL_DURABILITY) {
                    fail = 2; // :73-78 — the TOOL's material vs the anvil
                }
            } else {
                deniedPair = true; // :67-71 — the clean-twin denial, claimed
            }
        }

        // --- consumable (R196 :81-84 + :86-92): damaged + repair-cost carrier
        //     + the mapped nugget in slot 2 + the anvil accepts it.
        int divisor = gear.etimRepairCost();
        if (first.isItemDamaged() && divisor > 0
                && secondThere && second.getItem() == gear.etimRepairItem()) {
            consumable = true;
            if (repairMaterialDurability(second) > ANVIL_METAL_DURABILITY) {
                fail = 2; // :86-92 — the NUGGET's material vs the anvil
            }
        }

        boolean repairing = combo || consumable || deniedPair;
        if (!repairing) {
            return plan; // NONE — vanilla flow (empty output / book / rename faces)
        }

        if (deniedPair) {
            plan.kind = Kind.DENIED; // silent empty — no gates ran, no fail flag
            return plan;
        }

        // --- quality gate (R196 :95-108): fail 2 keeps priority (fail 1 only
        //     lands on a clean flag, :106-108). The skillset gate (:109-115)
        //     is a no-op — ETIM runs areSkillsEnabled()=false.
        if (fail == 0) {
            EnumQuality carried = ETIMQuality.get(first);
            if (carried != null && carried.ordinal() > ETIMQuality.getMaxOrdinal(
                    player, lowestCraftingDifficultyToProduce(first.getItem()), first)) {
                fail = 1;
            }
        }

        if (fail != 0) {
            plan.kind = Kind.FAIL;
            plan.fail = fail;
            return plan;
        }

        if (combo) {
            // CraftingManager :309-319 — pure remaining-durability sum, capped.
            int max = first.getMaxDamage();
            int remaining = (max - first.getItemDamage()) + (max - second.getItemDamage());
            ItemStack out = first.copy();
            out.setItemDamage(Math.max(0, max - Math.min(remaining, max)));
            plan.kind = Kind.COMBO;
            plan.output = out;
            plan.nuggetsUsed = 0; // INNER2 :70-72 — combination clears slot 2, no nuggets
            return plan;
        }

        // --- consumable loop (R196 :178-199 verbatim): per-nugget chunks of
        //     maxDamage/divisor; the loop continues only while a FULL initial
        //     chunk still applies — the tail chunk is NOT spread (终审补-3),
        //     but a sub-chunk entry damage is cleared by one nugget.
        int chunk = first.getMaxDamage() / divisor;
        int damage0 = first.getItemDamage();
        int initial = Math.min(damage0, chunk);
        if (initial <= 0) {
            return plan; // R196 :173-175 — degenerate face, no output
        }
        ItemStack out = first.copy();
        int damage = damage0;
        int repairAmount = initial;
        int consumed = 0;
        while (repairAmount > 0 && repairAmount == initial && consumed < second.getCount()) {
            damage -= repairAmount;
            consumed++;
            repairAmount = Math.min(damage, chunk);
        }
        out.setItemDamage(damage);
        plan.kind = Kind.CONSUMABLE;
        plan.output = out;
        plan.nuggetsUsed = consumed;
        return plan;
    }

    /**
     * The take face (R196 ContainerRepairINNER2 :30-58 对位): breakChance 0
     * (T1①/T2① — the vanilla 12% random face is replaced), proportional
     * wear on the consumable path only, the [CraftingLog] judgment row.
     */
    @SubscribeEvent
    public static void onAnvilRepair(AnvilRepairEvent event) {
        if (!ETIMConfig.metalAnvilRepair) {
            return;
        }
        ItemStack result = event.getItemResult();
        if (!(result.getItem() instanceof ETIMMetalGear)) {
            return; // T4① — vanilla outputs keep the vanilla wear face
        }
        event.setBreakChance(0.0F); // T2① — the proportional face replaces 12% random
        EntityPlayer player = event.getEntityPlayer();
        if (player.world.isRemote
                || !(player.openContainer instanceof net.minecraft.inventory.ContainerRepair)) {
            return;
        }
        io.github.etim.etim.mixins.ContainerRepairAccessor container =
                (io.github.etim.etim.mixins.ContainerRepairAccessor) player.openContainer;
        ETIMContainerRepairDuck duck = (ETIMContainerRepairDuck) player.openContainer;
        if (!duck.etimIsTakeover()) {
            return;
        }
        ItemStack input = event.getItemInput();
        int repaired = input.getItemDamage() - result.getItemDamage();
        int wear = 0;
        if (duck.etimLastKind() == Kind.CONSUMABLE.ordinal() && repaired > 0) {
            // INNER2 :31 — the combination path does NOT wear the anvil.
            wear = repaired * (result.getItem() instanceof ItemArmor ? ARMOR_WEAR_RATIO : 1);
            BlockPos pos = container.etimGetPos();
            ETIMAnvilDamageData.addDamage(player.world, pos, wear);
        }
        int nuggets = ((net.minecraft.inventory.ContainerRepair) player.openContainer).materialCost;
        ETIM.LOGGER.info("[CraftingLog] " + player.getName() + " (" + player.getEntityId()
                + ") repair take: tool=" + result.getItem().getRegistryName()
                + " repaired=" + repaired + " nuggets=" + nuggets
                + " kind=" + duck.etimLastKind() + " anvilWear=" + wear
                + " [server]");
    }

    /** Registers the event face (ETIM preInit). */
    public static void register() {
        net.minecraftforge.common.MinecraftForge.EVENT_BUS.register(ETIMAnvilRepair.class);
    }
}
