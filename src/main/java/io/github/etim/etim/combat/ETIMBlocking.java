package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItemAxe;
import io.github.etim.etim.metal.ETIMItemBattleAxe;
import io.github.etim.etim.metal.ETIMItemPickaxe;
import io.github.etim.etim.metal.ETIMItemScythe;
import io.github.etim.etim.metal.ETIMItemShovel;
import io.github.etim.etim.metal.ETIMItemSword;
import io.github.etim.etim.metal.ETIMItemWarHammer;
import io.github.etim.etim.mining.ETIMMining;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemAxe;
import net.minecraft.item.ItemPickaxe;
import net.minecraft.item.ItemSpade;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemStack;
import net.minecraft.util.DamageSource;
import net.minecraftforge.event.entity.living.LivingHurtEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * The AD-10+SH product body (audit20-97 planned; 批文 = ad10-落码批文.md).
 * R196 {@code Damage.applyTargetDefenseModifiers}:195-211 blocking face:
 *
 * <ul>
 *   <li>the halving ({@code :198} {@code amount /= 2}) runs BEFORE the armor
 *       step — landed on {@code LivingHurtEvent} (D-2: both exits,
 *       {@code entity/EntityLivingBase.java:1565} / {@code
 *       entity/player/EntityPlayer.java:1227} fire the event before their
 *       armor calls), so the halved value becomes the {@code raw} the whole
 *       batch-D R196 sequence reads;</li>
 *   <li>the first floor ({@code :199-201} {@code <1.0 → 1.0}) rides here; the
 *       second floor is the in-役 {@code R196ArmorModel:115} DAMAGE_FLOOR
 *       (M2-2, zero changes);</li>
 *   <li>no direction gate (M3-2 — the 1.12 {@code canBlockDamageSource}
 *       dotted-product body is dead via {@code MixinEntityLivingBaseBlock});</li>
 *   <li>player-only (M3-1); no knockback immunity (M3-3 — nothing touches
 *       velocity here);</li>
 *   <li>source gate = the batch-D predicate (A-8: {@code isUnblockable ‖
 *       isFireDamage ‖ absolute}).</li>
 * </ul>
 *
 * <p>The carrier faces are the R196 {@code ItemTool.canBlock()} exact-class
 * whitelist (M1-1 / D-5 — NO instanceof: the war hammer / battle axe / dagger /
 * hatchet / mattock all drift in through subclasses) plus the shield arm
 * (b+c, D-8: wear = (int)(blocked × shieldWearRate), decay rate 1.0 default →
 * D=16 → 8 durability, 336-dur shield = 42 hits).</p>
 *
 * <p>Registration = the one static-class line in {@code ETIM.preInit}
 * (A-AD10-2 — without it this handler is a silent no-op). The dead-code faces
 * of the vanilla shield body stay unregistered per §9.3 (只登记不删).</p>
 */
public final class ETIMBlocking {

    private ETIMBlocking() {
    }

    /** Static-class registration face played from {@code ETIM.preInit} (A-AD10-2). */
    public static void register() {
        net.minecraftforge.common.MinecraftForge.EVENT_BUS.register(ETIMBlocking.class);
    }

    // ==================== carrier faces (D-5 exact-class whitelist) ====================

    /**
     * R196 {@code ItemTool.canBlock()} (ItemTool.java:54-56 + the override
     * family Dagger/Hatchet/Hoe/Mattock/Shears/Cudgel:20-29) as an exact-class
     * whitelist — the 11 blocking classes of M1-1 ③, explicitly LESS the four
     * ETIM false subclasses (dagger / flint knife / hatchet / mattock) and the
     * hoe / shears faces. {@code instanceof} would sweep them all in.
     */
    public static boolean isBlockCarrier(ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        Class<?> c = stack.getItem().getClass();
        // vanilla arms (the 1.12 shovel face = ItemSpade, ItemTool has no instance)
        if (c == ItemSword.class || c == ItemPickaxe.class || c == ItemAxe.class
                || c == ItemSpade.class) {
            return true;
        }
        // ETIM arms
        return c == ETIMItemSword.class
                || c == ETIMItemPickaxe.class
                || c == ETIMItemAxe.class
                || c == ETIMItemBattleAxe.class
                || c == ETIMItemWarHammer.class
                || c == ETIMItemShovel.class
                || c == ETIMItemScythe.class;
    }

    /** The shield arm of the b+c ruling (Item.isShield — vanilla 1.12 shield face). */
    public static boolean isShieldStack(ItemStack stack) {
        return !stack.isEmpty() && stack.getItem().isShield(stack, null);
    }

    /** Anything that halves damage while being used (M2-1 gate; M1-5 single-use-state). */
    public static boolean isBlockingCarrier(ItemStack stack) {
        return isBlockCarrier(stack) || isShieldStack(stack);
    }

    // ==================== the halving event (D-2) ====================

    /** Two-armor-event exit: one handler covers both (A-2). */
    @SubscribeEvent
    public static void onLivingHurt(LivingHurtEvent event) {
        if (!ETIMConfig.blockModel || !(event.getEntityLiving() instanceof EntityPlayer)) {
            return;                                     // M3-1: player only
        }
        EntityPlayer player = (EntityPlayer) event.getEntityLiving();
        ItemStack active = player.getActiveItemStack();
        if (!player.isHandActive() || !isBlockingCarrier(active)) {
            return;                                     // not in use / not a carrier (M1-5)
        }
        DamageSource source = event.getSource();
        if (R196ArmorModel.r196ArmorBypassed(source) || R196ArmorModel.isR196Absolute(source)) {
            return;                                     // M3-4: fire / mundane bypass / absolute
        }
        float raw = event.getAmount();                  // == Damage.java:198 this.amount
        if (raw <= 0.0F) {
            return;                                     // Damage.java:187-189
        }
        float blocked = Math.max(raw * ETIMConfig.blockDamageFactor,
                ETIMConfig.blockMinDamage);             // :198-201 first floor (D-10)
        wearShieldOrTool(player, active, raw, blocked); // M2-3: wear FIRST, crush-current-still-blocks (D-6)
        ETIMBlockLog.block(player, source, raw, blocked, active);
        event.setAmount(blocked);                       // :213-231 all read the halved value
    }

    /**
     * M2-3 wear fork: tool = 25×raw (R196 Damage.java:203-208 = (int)(amount ×
     * getToolDecayFromAttackingEntity)), shield = D-8's shieldWearRate arm.
     * The durability-unbreaking face (unbreaking etc.) is vanilla
     * {@code damageItem} — never re-derived here. After a break
     * ({@code damageItem → shrink}) the current hit still settles at
     * {@code blocked} (D-6) and the next one finds an empty use stack.
     */
    static void wearShieldOrTool(EntityPlayer player, ItemStack active, float raw, float blocked) {
        int wear;
        int decay = -1;                                 // shield row = na (B-10)
        if (isShieldStack(active)) {
            wear = (int) (blocked * ETIMConfig.shieldWearRate); // D-8: rate default 1.0
        } else {
            decay = ETIMMining.getToolDecayFromAttackingEntity(active); // sword = 50
            wear = (int) (blocked * decay);             // Damage.java:203-208 (int) truncation
        }
        int before = active.getItemDamage();
        if (wear > 0 && !player.capabilities.isCreativeMode) {
            active.damageItem(wear, player);            // R196 = tryDamageItem; vanilla unbreaking face
        }
        ETIMBlockLog.wear(player, active, ETIMConfig.shieldWearRate, decay, raw, blocked,
                wear, before, active.getItemDamage());
    }
}
