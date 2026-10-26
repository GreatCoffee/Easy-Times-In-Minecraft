package io.github.etim.etim.combat;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMMetalArmor;

import net.minecraft.init.Enchantments;
import net.minecraft.init.MobEffects;
import net.minecraft.enchantment.Enchantment;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemArmor;
import net.minecraft.item.ItemStack;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.DamageSource;

/**
 * The batch-D armor body — R196 {@code Damage.applyTargetDefenseModifiers}
 * ({@code mite-src/decompile/src/net/minecraft/Damage.java}:182-232) landed on
 * the 1.12.2 RFG tree ({@code build/rfg/minecraft-src}; version pin: 1.12.2,
 * mappings mcp_stable 39). Single computation body for both armor exits
 * (A-1①/audit20-89):
 *
 * <ul>
 *   <li>mob exit: {@code entity/EntityLivingBase.java:1509}
 *       {@code applyArmorCalculations} — the ONLY numeric writer;</li>
 *   <li>player exit: {@code common/ISpecialArmor.java:132}
 *       {@code ArmorProperties.applyArmor} — same body;</li>
 *   <li>magic/resistance steps are REPLACED (A-6①): {@code
 *       applyPotionDamageCalculations} (:1523-1554) must return the incoming
 *       value untouched, else every R196 face double-counts.</li>
 * </ul>
 *
 * <p>Judged values (照抄, no clamp): reduce = subtraction
 * {@code max(amount - effective_protection, 1.0F)} (Damage.java:231, javap op
 * 289-293); the 20%-full-block dice = player only, {@code effective >= amount},
 * {@code delta+1} throws of {@code < 0.2F} (Damage.:221-229 — javap
 * iconst_m1@250/if_icmpge@257); the R196 total has NO upper bound (the 1.12
 * 0-20/EPF-20 clamps are dropped); rounding = nearest-integer with 1.0E-4
 * tolerance (ItemArmor.:334, MathHelper.:227-235) applied to the armor subtotal
 * only (natural/potion added after); the specialized feather-falling face is an
 * early {@code return 15.0F × L/4 × wearFactor} (EnchantmentProtection.:118-120,
 * javap @187), not an additive term.</p>
 *
 * <p>Pinned judgments carried into this batch (audit20-89/90): A-3① vanilla
 * mapping = P (damageReduceAmount) / 2 (leather 3.5 / iron 7.5 / gold 5.5 —
 * hammer verdict T-2, an arithmetic identity); A-4① the wear factor rides the
 * R196 :226-241 body; A-5/AD-9 the player wear = integer-point random split
 * ({@code InventoryPlayer.java:681-720}) replacing the 1.12 per-piece
 * {@code max(1, damage/4)}; D-34 the 1.12 wear is suppressed
 * ({@code @Redirect ordinal=1} on ISpecialArmor.:234) so the R196 split inside
 * {@code finalDamage} stays the only wear writer. Natural defense (AD-6) does
 * NOT multiply by the wear factor. RNG via public {@code getRNG()} (1.12 :492,
 * E-D-4 — the accessor face is retired).</p>
 */
public final class R196ArmorModel {

    private static final float DICE_CHANCE = 0.2F;        // Damage.java:225
    private static final float DAMAGE_FLOOR = 1.0F;       // Damage.java:231
    private static final float ROUND_TOLERANCE = 1.0E-4F; // ItemArmor.java:334
    private static final float PIERCING_POINTS = 5.0F;    // Damage.java:218 (AD-7 registered only, constant 0)
    private static final float FEATHER_FALLING_POINTS = 15.0F; // EnchantmentProtection.java:119

    private R196ArmorModel() {
    }

    /** The only entry: both armor exits take their return value here. */
    public static float finalDamage(EntityLivingBase target, DamageSource source, float raw) {
        // 1) Damage.java:187-189
        if (raw <= 0.0F) {
            return 0.0F;
        }
        // 2) Damage.java:191-193 (+ AD-11 = 1.12 isDamageAbsolute; 1.12
        //    OUT_OF_WORLD carries only the bypass bit, R196 is absolute,
        //    util/DamageSource.:29).
        if (isR196Absolute(source)) {
            ETIMDamageLog.armor(target, raw, raw); // row: armorOut=raw, no prot face row
            return raw;
        }
        // 3) AD-10 sword blocking — registered only (C-2), no landing point.
        // 4) Damage.java:213 (flat sum, natural goes straight in — hard finding 4)
        Face faces = new Face(
                naturalDefense(target, source),          // :1191
                armorPoints(target, source, true),       // :1195 (inner :334 fit)
                potionProtection(target, source),        // :1199
                0.0F);                                   // piercing placeholder (AD-7)
        float total = faces.natural + faces.armor + faces.potion;
        // 5) Damage.java:215-216 — wear BEFORE the dice (R196 :215-216 < :221-229)
        float wearBase = armorPoints(target, source, false); // no specialized
        float wearAmount = Math.min(wearBase, raw);
        if (target instanceof EntityPlayer) {
            EntityPlayer player = (EntityPlayer) target;
            if (!player.capabilities.isCreativeMode) {
                damageArmorR196(player, source, wearAmount);
            }
        }
        // 6) Damage.java:218-219 — AD-7 registered only, piercing constant 0
        float effective = Math.max(total - 0.0F, 0.0F);
        // 7) Damage.java:221-229 — player dice, delta+1 throws of <0.2F
        if (target instanceof EntityPlayer && effective >= raw) {
            int delta = (int) (effective - raw);
            for (int i = -1; i < delta; i++) {           // javap final-range pin
                if (target.getRNG().nextFloat() < DICE_CHANCE) {
                    ETIMDamageLog.armor(target, faces, raw, 0.0F);
                    return 0.0F;
                }
            }
        }
        // 8) Damage.java:231
        float out = Math.max(raw - effective, DAMAGE_FLOOR);
        ETIMDamageLog.armor(target, faces, raw, out);
        return out;
    }

    /** AD-6: the natural defense of ETIM classes only (vanilla mobs = 0.0F → C-3). */
    static float naturalDefense(EntityLivingBase target, DamageSource source) {
        return target instanceof ETIMNaturalDefense
                ? ((ETIMNaturalDefense) target).etimNaturalDefense(source)
                : 0.0F;
    }

    /** AD-2/AD-3/AD-13: the worn-armor subtotal, structure = ItemArmor.:308-335. */
    static float armorPoints(EntityLivingBase target, DamageSource source, boolean includeSpecialized) {
        if (isR196Unblockable(source)) {          // ItemArmor.:310-312 (R196 isUnblockable = 1.12 absolute, folded B-1)
            return 0.0F;
        }
        float total = 0.0F;
        if (!r196ArmorBypassed(source)) {         // :314 + fire bit (H1 = R196 :156-161 vs 1.12 :17/:20)
            for (ItemStack stack : target.getArmorInventoryList()) {
                if (stack.isEmpty() || !(stack.getItem() instanceof ItemArmor)) {
                    continue;                     // :317-322 (barding ✗-46 → C-4)
                }
                total += pieceBase(stack)
                        * (1.0F + 0.5F * fraction(stack, Enchantments.PROTECTION)) // :78-80
                        * wearFactor(stack, target);                               // :243-245
            }
        }
        if (includeSpecialized) {
            total += specialized(target, source); // :330-332 (outside the gate)
        }
        return tryFitToNearestInteger(total, ROUND_TOLERANCE); // :334
    }

    /** AD-2: the R196 protection points of one piece (unenchanted, unworn). */
    static double pieceBase(ItemStack stack) {
        net.minecraft.item.Item item = stack.getItem();
        if (item instanceof ETIMMetalArmor) {
            return ((ETIMMetalArmor) item).etimArmorPoints(); // metal/ETIMMetalArmor.java:134
        }
        return ((ItemArmor) item).damageReduceAmount / 2.0D; // A-3① (T-2 arithmetic pin)
    }

    /** AD-3: the durability wear factor (ItemArmor.:226-241, one hand). */
    static float wearFactor(ItemStack stack, EntityLivingBase owner) {
        if (owner != null && !(owner instanceof EntityPlayer)) {
            return 0.5F;                          // :227-229
        }
        if (owner instanceof EntityPlayer && stack.getMaxDamage() > 1
                && stack.getItemDamage() >= stack.getMaxDamage() - 1) {
            return 0.0F;                          // :231-233
        }
        float factor = 2.0F - (float) stack.getItemDamage()
                / stack.getItem().getMaxDamage(stack) * 2.0F; // :235
        return Math.min(factor, 1.0F);            // :236-238
    }

    /** AD-4: the fractional specialized influx (EnchantmentProtection.:96-133). */
    static float specialized(EntityLivingBase target, DamageSource source) {
        float total = 0.0F;
        Enchantment[] types = {Enchantments.FIRE_PROTECTION, Enchantments.FEATHER_FALLING,
                Enchantments.BLAST_PROTECTION, Enchantments.PROJECTILE_PROTECTION}; // R196 :97-99 order
        for (Enchantment type : types) {
            if (!canReduce(type, source)) {       // EnchantmentProtection.:38-69
                continue;
            }
            for (ItemStack stack : target.getArmorInventoryList()) {
                if (stack.isEmpty() || !(stack.getItem() instanceof ItemArmor)) {
                    continue;
                }
                float fraction = fraction(stack, type); // level / 4.0F
                if (fraction <= 0.0F) {
                    continue;
                }
                if (type == Enchantments.FEATHER_FALLING) {
                    return FEATHER_FALLING_POINTS * fraction
                            * wearFactor(stack, target);    // :118-120 — whole-face early return, everyone else is dropped
                }
                total += pieceBase(stack)
                        * (1.0F + 0.5F * fraction(stack, Enchantments.PROTECTION))
                        * wearFactor(stack, target) * fraction; // :122 (afterWear × L/4)
            }
        }
        return total;
    }

    /** AD-4: the fractional specialized gate (EnchantmentProtection.:38-69 + 1.12 :55-81). */
    static boolean canReduce(Enchantment type, DamageSource source) {
        if (source != null && source.canHarmInCreative()) {
            return false;                         // :43-45
        }
        if (type == Enchantments.PROTECTION) {
            return true;                          // :47-49 — general protection always true
        }
        if (type == Enchantments.FIRE_PROTECTION) {
            return source != null && source.isFireDamage();
        }
        if (type == Enchantments.FEATHER_FALLING) {
            return source == net.minecraft.util.DamageSource.FALL;
        }
        if (type == Enchantments.BLAST_PROTECTION) {
            return source != null && source.isExplosion();
        }
        return source != null && source.isProjectile(); // PROJECTILE_PROTECTION
    }

    /** AD-5: the flat potion protection (EntityLivingBase.:1209-1224). */
    static float potionProtection(EntityLivingBase target, DamageSource source) {
        if (isR196Absolute(source)) {             // :1211-1213
            return 0.0F;
        }
        float total = 0.0F;
        PotionEffect resistance = target.getActivePotionEffect(MobEffects.RESISTANCE);
        if (resistance != null) {
            total += (resistance.getAmplifier() + 1) * 5.0F; // :1215-1217
        }
        PotionEffect fireResistance = target.getActivePotionEffect(MobEffects.FIRE_RESISTANCE);
        if (fireResistance != null && source != null && source.isFireDamage()) {
            total += (fireResistance.getAmplifier() + 1) * 5.0F; // :1219-1221
        }
        return total;
    }

    /** AD-9: R196 player armor wear — integer-point random split (InventoryPlayer.:681-720 one hand). */
    static void damageArmorR196(EntityPlayer player, DamageSource source, float amount) {
        if (player.capabilities.isCreativeMode) {                       // :686
            return;
        }
        if (source != null && isR196Unblockable(source)) {              // :687 (folded face)
            return;
        }
        if (!wearingDamageable(player)) {
            return;
        }
        int remaining = (int) amount;                                   // :692
        if (remaining < 1) {
            remaining = 1;                                              // :693-695
        }
        while (remaining > 0 && wearingDamageable(player)) {            // :697
            int index = player.getRNG().nextInt(4);                     // :698 (armorInventory.length)
            ItemStack stack = player.inventory.armorInventory.get(index);
            if (!stack.isEmpty() && stack.getItem() instanceof ItemArmor) {
                int portion = piecesEquipped(player) == 1
                        ? remaining
                        : player.getRNG().nextInt(remaining) + 1;      // :702-706
                stack.damageItem(portion, player);                      // :708 (R196 = tryDamageItem; fire rules ✗ → B)
                if (stack.getCount() == 0) {
                    player.inventory.armorInventory.set(index, ItemStack.EMPTY);
                }
                remaining -= portion;                                   // :713
            } else {
                remaining -= player.getRNG().nextInt(remaining) + 1;    // :715 (empty slot consumes budget)
            }
        }
    }

    /** :686 — any wearable, damageable piece. */
    private static boolean wearingDamageable(EntityPlayer player) {
        for (ItemStack stack : player.inventory.armorInventory) {
            if (!stack.isEmpty() && stack.getItem() instanceof ItemArmor) {
                return true;
            }
        }
        return false;
    }

    /** InventoryPlayer.:669-679. */
    private static int piecesEquipped(EntityPlayer player) {
        int count = 0;
        for (ItemStack stack : player.inventory.armorInventory) {
            if (!stack.isEmpty() && stack.getItem() instanceof ItemArmor) {
                ++count;
            }
        }
        return count;
    }

    // ==================== source-class folding (§6.1) ====================

    /** EPF 分数 = level / numLevels（numLevels=4，EnchantmentProtection.:9-11）。 */
    static float fraction(ItemStack stack, Enchantment ench) {
        return EnchantmentHelper.getEnchantmentLevel(ench, stack) / 4.0F;
    }

    /** 取整容差（MathHelper.:227-235 逐句；1.12 无此 helper，✗-43）。 */
    static float tryFitToNearestInteger(float value, float tolerance) {
        float floor = value < 0.0F ? (int) value - 1 : (int) value;
        float fraction = value - floor;
        if (fraction < 0.5F) {
            return value - floor <= tolerance ? floor : value;
        }
        return floor + 1.0F - value <= tolerance ? floor + 1.0F : value;
    }

    /** absolute = damageAbsolute bit OR OUT_OF_WORLD (R196 DamageSource.:14). */
    static boolean isR196Absolute(DamageSource source) {
        return source.isDamageAbsolute() || source == net.minecraft.util.DamageSource.OUT_OF_WORLD;
    }

    /** 1.12 has no separate unblockable bit — folded to absolute (B-1). */
    static boolean isR196Unblockable(DamageSource source) {
        return isR196Absolute(source);
    }

    /** H1 (audit20-90): armor-mundane bypass bit + fire bit (R196 setFireDamage wraps its own bypass at :156-161). */
    static boolean r196ArmorBypassed(DamageSource source) {
        return source.isUnblockable() || source.isFireDamage();
    }

    // ==================== judged-row face (§7.2 interface) ====================

    /** The prot-row composition face — the per-entry four-player tuple + wear. */
    static final class Face {
        final float natural;
        final float armor;
        final float potion;
        final float piercing;
        final float wear;

        Face(float natural, float armor, float potion, float piercing) {
            this(natural, armor, potion, piercing, 0.0F);
        }

        Face(float natural, float armor, float potion, float piercing, float wear) {
            this.natural = natural;
            this.armor = armor;
            this.potion = potion;
            this.piercing = piercing;
            this.wear = wear;
        }
    }
}
