package io.github.etim.etim.hunger;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMEnchantments;
import net.minecraft.block.material.Material;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemBow;
import net.minecraft.util.math.MathHelper;

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
 *
 * <p>Movement five-branch drain (R196 EntityPlayer.addMovementStat
 * :1680-1730, the movement product line): hooked at the same vanilla stats
 * method via {@code MixinEntityPlayer} (TAIL) — 1.12.2 runs it server-side
 * from NetHandlerPlayServer:411/:589 (movement packets) and travel :1989, so
 * the drain inherits the vanilla counting semantics by construction. Branch
 * classification re-evaluates the vanilla conditions in the same order (终审
 * movement-drain G-M1..M4 = A; boat :1727-1728 and water jump
 * EntityLivingBase:2153-2168 are client-only in R196 — ported server-side by
 * the relocation line, 终审 boat-waterjump G-B1=α/G-B4=A: the boat face via
 * MixinNetHandlerPlayServer, the water-jump face as the proxy below).</p>
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
        charge(player, ETIMConfig.digHungerPerTick, getEnduranceModifier(player), "digDrain");
    }

    /** R196 EntityPlayer:1313-1315 (per landed swing, no harmed gate). */
    public static void chargeAttack(EntityPlayer player) {
        charge(player, ETIMConfig.attackHungerPerHit, getEnduranceModifier(player), "attackDrain");
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
                getEnduranceModifier(player), "placeDrain hardness=" + hardness);
    }

    /** R196 ItemHoe:75-77 (successful till, hardness / 2). */
    public static void chargeHoe(EntityPlayer player, float hardness) {
        charge(player, hardness / ETIMConfig.hoeHungerDivisor,
                getEnduranceModifier(player), "hoeDrain hardness=" + hardness);
        lastTillChargeTick = player.world.getTotalWorldTime();
    }

    /** R196 ServerPlayer:641-643 (per active tick while drawing a bow). */
    public static void tickBowDraw(EntityPlayer player) {
        if (player.isHandActive() && player.getActiveItemStack().getItem() instanceof ItemBow) {
            charge(player, ETIMConfig.bowDrawHungerPerTick, getEnduranceModifier(player), "bowDrain");
        }
    }

    /**
     * R196 EntityPlayer:1727-1728 boat paddle — per steering-input tick,
     * × |moveForward|, bare (no endurance modifier). Called from the α hook
     * (MixinNetHandlerPlayServer processInput TAIL, ExactlyOnce per riding
     * tick; 终审 boat-waterjump G-B1 = A). The +2% raw-vs-0.98 angle is
     * D-B1, accepted.
     */
    public static void chargeBoat(EntityPlayer player, float moveForward) {
        charge(player, ETIMConfig.boatHungerPerTick * Math.abs(moveForward), 1.0F, "boatDrain");
    }

    /**
     * R196 EntityPlayer:1680-1730 five-branch movement drain — bare (no
     * endurance modifier, mod = 1.0). Branch order mirrors the vanilla stats
     * method (rfg :2005-2070); the 1.12 walk branch splits crouch stats the
     * 1.5.2 method lacks — both drain as walk (D-M1). Sleeping zeroes the
     * walk face (R196 :1707-1709 inBed → var7=0; G-M3), spectator is the
     * 1.12 superset face R196 lacks (G-M2), airborne/elytra stay free of
     * charge (R196 :1721-1726 else face).
     */
    public static void chargeMovement(EntityPlayer player, double dx, double dy, double dz) {
        if (player.world.isRemote || player.isRiding() || player.isSpectator()) {
            return;
        }
        if (player.isInsideOfMaterial(Material.WATER)) {
            int cm = Math.round(MathHelper.sqrt(dx * dx + dy * dy + dz * dz) * 100.0F);
            if (cm > 0) {
                charge(player, ETIMConfig.swimHungerPerMeter * cm * 0.01F, 1.0F, "diveDrain cm=" + cm);
            }
        } else if (player.isInWater()) {
            int cm = Math.round(MathHelper.sqrt(dx * dx + dz * dz) * 100.0F);
            if (cm > 0) {
                charge(player, ETIMConfig.swimHungerPerMeter * cm * 0.01F, 1.0F, "swimDrain cm=" + cm);
            }
        } else if (player.isOnLadder()) {
            if (dy > 0.0D) {
                charge(player, (float) dy / ETIMConfig.ladderHungerDivisor, 1.0F, "ladderDrain dy=" + dy);
            }
        } else if (player.onGround) {
            int cm = Math.round(MathHelper.sqrt(dx * dx + dz * dz) * 100.0F);
            if (player.isPlayerSleeping()) {
                cm = 0;
            }
            if (cm > 0) {
                if (player.isSprinting()) {
                    charge(player, ETIMConfig.sprintHungerPerMeter * cm * 0.01F, 1.0F, "sprintDrain cm=" + cm);
                } else {
                    charge(player, ETIMConfig.walkHungerPerMeter * cm * 0.01F, 1.0F, "walkDrain cm=" + cm);
                }
            }
        }
        // else: airborne / elytra — stats only, no drain (R196 :1721-1726 same face).

        // Water/lava jump drain, the R196 client-only face relocated (终审
        // boat-waterjump G-B4 = A, 位移代理). R196 EntityLivingBase:2153-2168
        // charges 0.01/tick while isJumping in water||lava, non-riding — the
        // intent bit is unobservable server-side for non-riding players (C0C
        // ships only while riding; G-B3 = C), so the proxy keys on the
        // upward C03 displacement packet instead: same rate, D-B3 drift both
        // ways (surface push/bubble over-charge ≤0.01/packet, hover-paddle
        // under-charge). Parallel to the chain above on purpose: the R196
        // jump section and addMovementStat are two independent event faces
        // and double-charge on the same packet by construction.
        if ((player.isInWater() || player.isInLava()) && dy > 0.0D) {
            charge(player, ETIMConfig.waterJumpHungerPerTick, 1.0F, "waterJumpDrain dy=" + dy);
        }
    }

    /**
     * Shared charge funnel: R196 FoodStats.addHunger (:122-134) guards +
     * cap, with the foodModel master switch. The [FoodLog] row carries the
     * base/mod/amount decomposition for the harness judgment. Movement
     * branches pass mod = 1.0 (bare addHunger, no endurance coupling).
     * The disableDamage gate mirrors R196 addHungerClientSide/addHungerServerSide
     * :1875/:1881 (终审 boat-waterjump D-B5, 全站八支生效面).
     */
    private static void charge(EntityPlayer player, float base, float mod, String tag) {
        if (player.world.isRemote || !ETIMConfig.foodModel || player.capabilities.isCreativeMode
                || player.capabilities.disableDamage) {
            return;
        }
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
