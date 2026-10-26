package io.github.etim.etim.combat;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import java.util.Locale;
import java.util.WeakHashMap;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.util.DamageSource;

/**
 * The batch-D judgment channel (A-5①, audit20-89): {@code [DamageLog]} rows
 * for the REPLACED global armor steps — the five-segment row A (`dmg`) and the
 * composition row B (`prot`, D-33①). Shape copied from [ArrowLog]
 * (mob/ETIMArrowLog.java:21-25): one dev switch, server log only.
 *
 * <p>Two pinned toggle faces (D-36①): the numeric master switch
 * {@code armorModelR196} and the judgment switch {@code damageDebugLog} are
 * separate — with the model off the channel still logs the vanilla values
 * (the A/B comparison face for the verification window W19). Closing
 * {@code damageDebugLog} makes everything here silent, with zero effect on
 * the numbers.</p>
 *
 * <p>Rows (§7, %.3f with [ArrowLog] final= in the same spec):</p>
 * <ul>
 *   <li>row A — {@code dmg target=…#<id> src=… raw= armorIn= armorOut= absorption= final=}</li>
 *   <li>row B — {@code prot target=…#<id> src=… natural= armor= potion= total= piercing= wear=}</li>
 * </ul>
 *
 * <p>Starting parameters keep armorIn/armorOut on raw (the armor step not
 * reached, e.g. after the LivingHurt earlier exit — that row shows
 * "no subtraction"); the dice face turns armorOut on 0.000 (the差异化 anchor for
 * distinguishing dice-full-block and true-zero damage); absolute sources place armorOut=raw,
 * with no face row.</p>
 */
public final class ETIMDamageLog {

    private static final WeakHashMap<EntityLivingBase, Ctx> CTX = new WeakHashMap<>();

    private static class Ctx {
        String src;
        float raw;
        float armorIn;
        float armorOut;
        float health;
    }

    private ETIMDamageLog() {
    }

    /** entry — damageEntity HEAD: preset the five segments on raw. */
    public static void begin(EntityLivingBase target, DamageSource source, float amount) {
        if (!ETIMConfig.damageDebugLog) {
            return;
        }
        Ctx c = new Ctx();
        c.src = source == null ? "-" : source.getDamageType();
        c.raw = c.armorIn = c.armorOut = amount;
        c.health = target.getHealth();
        CTX.put(target, c);
    }

    /** armor-step return — the plain (raw, out) face: absolute sources, model off, no composition. */
    public static void armor(EntityLivingBase target, float armorIn, float armorOut) {
        armorFull(target, 0.0F, 0.0F, 0.0F, 0.0F, 0.0F, armorIn, armorOut);
    }

    /** armor-step return — the composition face computed inside finalDamage (structure = §7.2). */
    public static void armor(EntityLivingBase target, R196ArmorModel.Face faces, float armorIn, float armorOut) {
        armorFull(target, faces.natural, faces.armor, faces.potion, faces.piercing,
                playerWearOf(faces), armorIn, armorOut);
    }

    private static void armorFull(EntityLivingBase target, float natural, float armor, float potion,
            float piercing, float wear, float armorIn, float armorOut) {
        Ctx c = CTX.get(target);
        if (c == null || !ETIMConfig.damageDebugLog) {
            return;
        }
        c.armorIn = armorIn;
        c.armorOut = armorOut;
        // absolute = (armorIn == armorOut && wears nothing) — guaranteed raw>0 by the first step
        row("prot target=" + nameOf(target)
                + " src=" + c.src
                + " natural=" + f3(natural) + " armor=" + f3(armor)
                + " potion=" + f3(potion) + " total=" + f3(natural + armor + potion)
                + " piercing=" + f3(piercing) + " wear=" + f3(wear));
    }

    private static float playerWearOf(R196ArmorModel.Face faces) {
        return faces.wear;
    }

    /** exit — damageEntity RETURN: compute the five segments and remove. */
    public static void end(EntityLivingBase target, DamageSource source) {
        Ctx c = CTX.remove(target);
        if (c == null || !ETIMConfig.damageDebugLog) {
            return;
        }
        float after = target.getHealth();
        float finalDamage = c.health - after;
        float absorption = c.armorOut - finalDamage;
        row("dmg target=" + nameOf(target)
                + " src=" + c.src
                + " raw=" + f3(c.raw) + " armorIn=" + f3(c.armorIn)
                + " armorOut=" + f3(c.armorOut) + " absorption=" + f3(absorption)
                + " final=" + f3(finalDamage));
    }

    // ==================== channels ====================

    /** [DamageLog] launcher — the [ArrowLog] row (:21-25) spec. */
    private static void row(String line) {
        if (ETIMConfig.damageDebugLog) {
            ETIM.LOGGER.info(String.format(Locale.ROOT, "[DamageLog] %s [server]", line));
        }
    }

    private static String nameOf(EntityLivingBase target) {
        return target.getName() + "#" + target.getEntityId();
    }

    /** %.3f — otherwise 8.7 and 9 are indistinguishable ([ArrowLog] final= spec). */
    private static String f3(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }
}
