package io.github.etim.etim.combat;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMEnchantments;

import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.MobEffects;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.ItemStack;
import net.minecraft.potion.PotionEffect;

/**
 * The melee1 (batch B2, audit20 条 249-251) attr helper: the three
 * row-C enchantment faces share this one class so the two mixins
 * (player/mob) stay single-call-site thin.
 *
 * <p>Faces (R196 first-hand, 终审 T-1/T-3 亲钉):</p>
 * <ul>
 *   <li><b>stun</b> — {@code EntityPlayer:1249-1252} + {@code EntityMob:96-99}
 *       /:168-171 roll {@code level > Math.random()*10} (P=L/divisor) then
 *       {@code PotionEffect(SLOWNESS, L×50, 5×L)}. D-1 (条 250): the
 *       amplifier key defaults to <b>6</b> so the 1.12 attribute face lands
 *       ×0 already at L1 — the same player-perceivable exit as R196's
 *       clamp(1+(amp+1)×−0.2, 0, 4) ×(1−paralysis) face (电阻 face out of
 *       scope, C-6 zero-paralysis-resistance lane).</li>
 *   <li><b>vampiric</b> — {@code EnchantmentHelper:369-385}: gate
 *       {@code Math.random()*divisor > level ⇒ 0} (P=L/divisor), then
 *       {@code transfer = (int)(dmg × factor × Math.random())},
 *       {@code < min ⇒ min}, {@code attacker.heal(transfer)}. The
 *       biological gate maps to 1.12 {@code isEntityUndead()}
 *       (F5 同谱; T6 亡灵负证). Damage basis = the redirect's {@code amount}
 *       param — B-5: 1.12 的 f 含 cooldown/crit 系数而 R196 damage 不含，
 *       逐值对账声明，不改判值。</li>
 *   <li><b>disarming</b> — {@code EntityPlayer:1231-1242} 伤前支:
 *       {@code rand.nextFloat() < level/maxLevel}, requires
 *       {@code target instanceof EntityLiving} (C-1: PvP 缴械两代皆无),
 *       then {@code掉落 held}＋{@code clear mainhand}＋
 *       {@code ticks_disarmed → etimDisarmTicks (B-3, MixinEntityLiving
 *       Disarm: NBT 持窗 40t + 拾取门)}. Roll source = {@code getRNG()}
 *       (R196 {@code this.rand}).</li>
 * </ul>
 *
 * <p>Probability faces use {@code Math.random()} — B-4: 不可播种 ⇒ the
 * verdict window runs frequency statistics (N=200); every row logs BOTH the
 * roll and its need inside one line.</p>
 */
public final class ETIMMelee {

    private ETIMMelee() {
    }

    /**
     * The B-3 disarm timer carrier: R196's {@code EntityLiving.ticks_disarmed}
     * has no 1.12 field and the mixin AP refuses an {@code @Accessor} onto
     * another mixin's {@code @Unique} field — so the timer lives as a per
     * entity weak map (dead entities release their entry on GC; the NBT
     * faces in MixinEntityLivingDisarm rehydrate on load). Keyed by identity,
     * one entry per disarmed mob.
     */
    private static final java.util.Map<EntityLiving, Integer> DISARM_TICKS = new java.util.WeakHashMap<>();

    /** Current lock remaining (0 = unlocked) — mixim-side read face. */
    public static int getDisarmTicks(EntityLiving mob) {
        Integer v = DISARM_TICKS.get(mob);
        return v == null ? 0 : v;
    }

    /** Set (or clear at 0) the lock — mixim-side write face. */
    public static void setDisarmTicks(EntityLiving mob, int ticks) {
        if (ticks <= 0) {
            DISARM_TICKS.remove(mob);
        } else {
            DISARM_TICKS.put(mob, ticks);
        }
    }

    /** One-tick decrement face (MixinEntityLivingDisarm onLivingUpdate TAIL). */
    public static void tickDisarm(EntityLiving mob) {
        int v = getDisarmTicks(mob);
        if (v > 1) {
            DISARM_TICKS.put(mob, v - 1);
        } else {
            DISARM_TICKS.remove(mob);
        }
    }

    /**
     * [MeleeLog] melee1 judgment channel (纪律 9 — created BEFORE the batch
     * ships; D-6, separate from [DamageLog]'s armor face). Shape copied from
     * ETIMArrowLog / ETIMMobEquip.mobLog. Never called on the client (all
     * callers gate {@code world.isRemote} themselves).
     */
    public static void row(String line) {
        if (ETIMConfig.meleeDebugLog) {
            ETIM.LOGGER.info("[MeleeLog] " + line + " [server]");
        }
    }

    /** R196 stun face (above). Callers: MixinEntityPlayerMelee (harmed) / MixinEntityMobMelee (flag). */
    public static void applyStun(EntityLivingBase attacker, EntityLivingBase target) {
        if (attacker.world.isRemote || target == null) {
            return;
        }
        int level = EnchantmentHelper.getEnchantmentLevel(
                ETIMEnchantments.STUN, attacker.getHeldItemMainhand());
        if (level <= 0) {
            return;
        }
        float roll = (float) (Math.random() * ETIMConfig.stunChanceDivisor);
        if (!(level > roll)) {
            row("stun lvl=" + level + " roll=" + String.format("%.3f", roll)
                    + " need=" + level + " amp=0 dur=0");
            return;
        }
        int amp = ETIMConfig.stunAmplifierPerLevel * level;
        int dur = ETIMConfig.stunDurationPerLevel * level;
        target.addPotionEffect(new PotionEffect(MobEffects.SLOWNESS, dur, amp));
        row("stun lvl=" + level + " roll=" + String.format("%.3f", roll)
                + " need=" + level + " amp=" + amp + " dur=" + dur);
    }

    /** R196 vampiric face (above) — heal rides inside (both R196 callers heal with the return). */
    public static void applyVampiric(EntityLivingBase attacker, EntityLivingBase target, float damage) {
        if (attacker.world.isRemote || target == null || damage <= 0.0F || target.isEntityUndead()) {
            return;
        }
        int level = EnchantmentHelper.getEnchantmentLevel(
                ETIMEnchantments.VAMPIRIC, attacker.getHeldItemMainhand());
        if (level <= 0) {
            return;
        }
        float gateRoll = (float) (Math.random() * ETIMConfig.vampiricChanceDivisor);
        if (gateRoll > level) {
            row("vampiric lvl=" + level + " gate=" + String.format("%.3f", gateRoll)
                    + " dmg=" + String.format("%.3f", damage) + " transfer=0");
            return;
        }
        int transfer = (int) (damage * ETIMConfig.vampiricTransferFactor * Math.random());
        if (transfer < ETIMConfig.vampiricMinTransfer) {
            transfer = ETIMConfig.vampiricMinTransfer;
        }
        attacker.heal(transfer);
        row("vampiric lvl=" + level + " gate=" + String.format("%.3f", gateRoll)
                + " dmg=" + String.format("%.3f", damage)
                + " transfer=" + transfer + " hp=" + String.format("%.2f", attacker.getHealth()));
    }

    /** R196 disarming 伤前 face (above). Called from the player redirect BEFORE the vanilla damage call. */
    public static void applyDisarming(EntityPlayer attacker, Entity target) {
        if (attacker.world.isRemote || !(target instanceof EntityLiving)) {
            return;
        }
        int level = EnchantmentHelper.getEnchantmentLevel(
                ETIMEnchantments.DISARMING, attacker.getHeldItemMainhand());
        if (level <= 0) {
            return;
        }
        EntityLiving living = (EntityLiving) target;
        ItemStack held = living.getHeldItemMainhand(); // R196 getHeldItemStack :1233
        if (held.isEmpty()) {
            row("disarm lvl=" + level + " held=none dropped=false");
            return;
        }
        float roll = attacker.getRNG().nextFloat(); // R196 this.rand.nextFloat() :1235
        float threshold = (float) level / ETIMConfig.disarmingMaxLevel; // C-注4: divisor 复用 maxLevel
        if (roll >= threshold) {
            row("disarm lvl=" + level + " roll=" + String.format("%.3f", roll)
                    + " held=" + held.getItem().getRegistryName() + " dropped=false");
            return;
        }
        living.entityDropItem(held, living.height / 2.0F); // R196 dropItemStack :1238 (F7 Entity.entityDropItem 对位)
        living.setItemStackToSlot(EntityEquipmentSlot.MAINHAND, ItemStack.EMPTY); // R196 clearMatchingEquipmentSlot :1239
        setDisarmTicks(living, ETIMConfig.disarmLockTicks); // R196 ticks_disarmed :1240
        row("disarm lvl=" + level + " roll=" + String.format("%.3f", roll)
                + " held=" + held.getItem().getRegistryName()
                + " dropped=true cleared=true lock=" + ETIMConfig.disarmLockTicks);
    }
}
