package io.github.etim.etim.hunger;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMEnchantments;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemBow;

/**
 * R196 Endurance machinery (v2+ Endurance product order, F-5-29 → 终审
 * playground/audit/endurance-终审回执.md). The R196 endurance enchantment
 * (Enchantment.java:45, id 95; four levels, chestpieces only) scales the
 * hunger-pool charge of every modifier-bearing drain site through
 * {@code getEnduranceModifier = 1.0F − level × 0.2F} (EnchantmentHelper.java:
 * 403-404; L0→1.0 / L1→0.8 / L2→0.6 / L3→0.4 / L4→0.2).
 *
 * <p>G2 = server-direct: the R196 client-prediction dig faces
 * (PlayerControllerMP:181/:222 plus the Packet82AddHunger flush,
 * FoodStats.java:129-132) map onto the 1.12 server dig loop — the pool is
 * server-authoritative and no client accumulator / add-hunger packet exists.
 * Every charge funnels through {@link #charge} with the pool-side guards
 * (server / foodModel / creative — the F-2-39 pre-gate shape) and the
 * hungerPoolCap clamp, mirroring R196 FoodStats.addHunger :122-134 with the
 * NetServerHandler:979-981 trusted-float entry.</p>
 *
 * <p>Movement/walking drains carry NO endurance modifier in R196
 * (EntityPlayer:1687/:1695/:1702/:1715/:1718 bare addHungerServerSide) and
 * stay a separate product line (终审边界判词).</p>
 */
public final class ETIMEndurance {

    /**
     * World time of the last hoe-till charge. The server till also posts a
     * PlaceEvent (ItemStack.java:200 wraps every server-side onItemUse in
     * ForgeHooks.onPlaceItemIntoWorld, and the till returns SUCCESS) — that
     * same-tick event is the till itself, not a placement. Server main
     * thread only; a plain stamp is safe.
     */
    private static long lastTillChargeTick = Long.MIN_VALUE;

    /** R196 {@code getEnduranceModifier} (EnchantmentHelper.java:403-404). */
    public static float getEnduranceModifier(EntityPlayer player) {
        int level = EnchantmentHelper.getMaxEnchantmentLevel(ETIMEnchantments.ENDURANCE, player);
        return 1.0F - level * ETIMConfig.enduranceModifierStep;
    }

    /**
     * R196 PlayerControllerMP:179-181 (instant break) + :221-222 (per dig
     * progress tick, failed digs included); charged from the server dig loop
     * per 终审 G2 (MixinPlayerInteractionManager).
     */
    public static void chargeDig(EntityPlayer player) {
        charge(player, ETIMConfig.digHungerPerTick, "digDrain");
    }

    /** R196 EntityPlayer:1313-1315 (per landed swing, no harmed gate). */
    public static void chargeAttack(EntityPlayer player) {
        charge(player, ETIMConfig.attackHungerPerHit, "attackDrain");
    }

    /**
     * R196 EntityPlayer:2654-2661 (successful placement, server,
     * non-creative): {@code min(blockHardness, 20.0F) × mod}.
     */
    public static void chargePlace(EntityPlayer player, float hardness) {
        if (lastTillChargeTick == player.world.getTotalWorldTime()) {
            return; // the same-tick PlaceEvent of a just-charged till
        }
        charge(player, Math.min(hardness, ETIMConfig.placeHungerHardnessCap),
                "placeDrain hardness=" + hardness);
    }

    /** R196 ItemHoe:75-77 (successful till, hardness / 2). */
    public static void chargeHoe(EntityPlayer player, float hardness) {
        charge(player, hardness / ETIMConfig.hoeHungerDivisor,
                "hoeDrain hardness=" + hardness);
        lastTillChargeTick = player.world.getTotalWorldTime();
    }

    /** R196 ServerPlayer:641-643 (per active tick while drawing a bow). */
    public static void tickBowDraw(EntityPlayer player) {
        if (player.isHandActive() && player.getActiveItemStack().getItem() instanceof ItemBow) {
            charge(player, ETIMConfig.bowDrawHungerPerTick, "bowDrain");
        }
    }

    /**
     * Shared charge funnel: R196 FoodStats.addHunger (:122-134) guards +
     * cap, with the foodModel master switch. The [FoodLog] row carries the
     * base/mod/amount decomposition for the harness judgment.
     */
    private static void charge(EntityPlayer player, float base, String tag) {
        if (player.world.isRemote || !ETIMConfig.foodModel || player.capabilities.isCreativeMode) {
            return;
        }
        float mod = getEnduranceModifier(player);
        float amount = base * mod;
        ETIMFoodStats.IFoodState state = ETIMFoodStats.get(player);
        if (state == null) {
            return;
        }
        float pool = Math.min(state.getHungerPool() + amount, ETIMConfig.hungerPoolCap);
        state.setHungerPool(pool);
        ETIMFoodStats.logFoodEntry(player, tag + " base=" + base + " mod=" + mod
                + " amount=" + amount + " pool=" + pool);
    }

    private ETIMEndurance() {
    }
}
