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
 * hatchet / mattock all drift in through subclasses) plus the shield arm.</p>
 *
 * <p>盾面削弱批（2026-10-29 终审放行，审件钉 `d524d41`/派修单 10 要件）——盾两臂
 * 走三支分发：<b>① {@code getItem() instanceof ETIMShield} 先于</b> ② vanilla
 * {@code ItemShield}（木盾常量 {@code shieldWoodReduction}/1.0 = 现行 ÷2 逐位）；
 * ③ sward arm 的阻减照旧 {@code blockDamageFactor}（R196 剑语义一字不动）。盾
 * 磨损臂带 <b>A-2 epsilon</b>：{@code wear = (int)Math.floor(blocked*(double)rate
 * + 1.0E-4)}（先例 {@code R196ArmorModel:62}）——裸 (int) 下铜 8 伤 8.9999998 与
 * 艾德曼 8 伤 3.9999998 两格翻转（JVM 实测，会话五探针卷复验）；工具臂不加
 * epsilon（R196 Damage.java:203-208 整数语义）；磨损仍打
 * {@code damageItem}（vanilla unbreaking 面，不重推）。</p>
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
        float blocked;
        boolean spectral;
        if (isShieldStack(active)) {
            // 盾面削弱批三支（M-3;① instanceof ETIMShield 先于 ② vanilla ItemShield）:
            // 减伤比例 r（0..1 clamp）→ net = max(1.0, raw×(1−r)),1.0 地板照旧。
            float r = active.getItem() instanceof ETIMShield
                    ? ((ETIMShield) active.getItem()).getBlockReduction(source)
                    : ETIMConfig.shieldWoodReduction;   // ② 木盾常量 = 现行 ÷2 逐位
            r = Math.max(0.0F, Math.min(1.0F, r));      // 封顶永不满免
            spectral = io.github.etim.etim.combat.ETIMGhost.isSpectral(source);
            blocked = Math.max(raw * (1.0F - r),
                    ETIMConfig.blockMinDamage);         // :199-201 first floor (D-10)
        } else {
            spectral = false;                           // 支②剑臂:R196 ÷2 语义一字不动
            blocked = Math.max(raw * ETIMConfig.blockDamageFactor,
                    ETIMConfig.blockMinDamage);         // :198-201 first floor (D-10)
        }
        wearShieldOrTool(player, active, source, raw, blocked); // M2-3: wear FIRST, crush-current-still-blocks (D-6)
        ETIMBlockLog.block(player, source, raw, blocked, spectral, active);
        event.setAmount(blocked);                       // :213-231 all read the halved value
    }

    /**
     * M2-3 wear fork（盾面削弱批裁后）：盾臂 = 三支读值（接口实现 / 木盾常量）
     * × 全局 {@code shieldWearRateBase}，带 A-2 epsilon；剑臂 = R196
     * Damage.java:203-208 = (int)(amount × getToolDecayFromAttackingEntity)，
     * **一字不动**（epsilon 不给工具——会话五字节钉）。
     * The durability-unbreaking face (unbreaking etc.) is vanilla
     * {@code damageItem} — never re-derived here. After a break
     * ({@code damageItem → shrink}) the current hit still settles at
     * {@code blocked} (D-6) and the next one finds an empty use stack.
     */
    static void wearShieldOrTool(EntityPlayer player, ItemStack active, DamageSource source,
            float raw, float blocked) {
        int wear;
        int decay = -1;                                 // tool row only (要件 6 行形:盾行 decay=na)
        float rate = -1.0F;                             // tool row = na
        float mult = -1.0F;                             // tool row = na
        boolean shield = isShieldStack(active);
        if (shield) {
            float m = active.getItem() instanceof ETIMShield
                    ? ((ETIMShield) active.getItem()).getWearMultiplier(source)
                    : 1.0F;                             // vanilla ItemShield:无差分
            rate = ETIMConfig.shieldWearRateBase;
            mult = m;
            // A-2 epsilon（盾两臂专用）：裸 (int) 下铜 8 伤 8.9999998→8、
            // 艾德曼 8 伤 3.9999998→3 两格翻转（JVM 实测）;1e-4 后 21/21 表值。
            double x = blocked * (double) rate * (double) m;
            wear = (int) Math.floor(x + 1.0E-4);
        } else {
            decay = ETIMMining.getToolDecayFromAttackingEntity(active, player); // sword = 50; creative → 0 row (D-1(a))
            wear = (int) (blocked * decay);             // Damage.java:203-208 (int) truncation — 不动
        }
        int before = active.getItemDamage();
        if (wear > 0 && !player.capabilities.isCreativeMode) {
            active.damageItem(wear, player);            // R196 = tryDamageItem; vanilla unbreaking face
        }
        ETIMBlockLog.wear(player, active, shield, rate, mult, decay, raw, blocked,
                wear, before, active.getItemDamage());
    }
}
