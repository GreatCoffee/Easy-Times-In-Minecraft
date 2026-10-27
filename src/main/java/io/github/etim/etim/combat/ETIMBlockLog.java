package io.github.etim.etim.combat;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import java.util.Locale;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.item.ItemStack;
import net.minecraft.item.Item;
import net.minecraft.item.EnumAction;
import net.minecraft.util.EnumHand;
import net.minecraft.util.DamageSource;
import net.minecraft.entity.player.EntityPlayer;

/**
 * The AD-10+SH judgment channel (D-3, audit20-97 planned): {@code [BlockLog]}
 * rows for the R196 sword/shield blocking face — shape copied from
 * {@code [DamageLog]} (combat/ETIMDamageLog.java:109-122): one dev switch
 * ({@code blockDebugLog}), server log only, {@code %%.3f} with {@code
 * Locale.ROW}, zero effect on the numbers when off.
 *
 * <p>Rows (M6-1 表, 控对照报告 §7):</p>
 * <ul>
 *   <li>{@code carrier item=<reg> class=<fqcn> block=<b>} — the W1 carrier table;</li>
 *   <li>{@code action item=<reg> action=<ENUM>} — the action face;</li>
 *   <li>{@code start player=<n>#<id> hand=<main|off> item=<reg> action=BLOCK
 *       dur=<n> count=<n>} — W2 起手 (count = remaining use ticks at start);</li>
 *   <li>{@code state player=… handActive=<b> active=<reg> held=<reg>
 *       same=<b>} — W2/M1-5 (emitted from the {@code blockprobe} probe, NOT
 *       per-tick — the use state lives 72000 ticks and a resident row would
 *       flood the log);</li>
 *   <li>{@code gate player=… active=<reg> src=<type> suppressed=true} — W11
 *       门控 (the canBlockDamageSource suppression marker);</li>
 *   <li>{@code block player=… src=<type> raw=<%.3f> blocked=<%.3f>
 *       factor=<%.3f> min=<%.3f> carrier=<reg>} — W3/W4/W5/W9/W10;</li>
 *   <li>{@code wear player=… item=<reg> rate=<%.3f> decay=<n|na> raw=<%.3f>
 *       blocked=<%.3f> wear=<n> dur=<a>-><b>} — W6/W7/W12/W14 (B-10: {@code
 *       rate=} always carries {@code shieldWearRate} — the future material
 *       table column slot;{@code decay=} is the TOOL's real rate, {@code na}
 *       on the shield row);</li>
 *   <li>{@code probe player=… held=<reg> dur=<cur>/<max>} and
 *       {@code probe player=… cfg blockModel=<b> factor=<%.3f> min=<%.3f>
 *       shieldRate=<%.3f>} — W14 config re-read + W6's pre-read of the stack
 *       durability.</li>
 * </ul>
 */
public final class ETIMBlockLog {

    private ETIMBlockLog() {
    }

    /** W1 carrier face — one row per {@code blockprobe} arm. */
    public static void carrier(ItemStack stack, boolean block) {
        if (!ETIMConfig.blockDebugLog) {
            return;
        }
        row("carrier item=" + itemKey(stack)
                + " class=" + (stack.isEmpty() ? "-" : stack.getItem().getClass().getName())
                + " block=" + block);
    }

    /** The action face of the same stack (W1 ②). */
    public static void action(ItemStack stack, EnumAction resolved) {
        if (!ETIMConfig.blockDebugLog) {
            return;
        }
        row("action item=" + itemKey(stack) + " action=" + resolved);
    }

    /** W2 起手 — emitted from the MixinItem right-click branch. */
    public static void start(EntityPlayer player, EnumHand hand, ItemStack stack, int duration, int count) {
        if (!ETIMConfig.blockDebugLog) {
            return;
        }
        row("start player=" + nameOf(player) + " hand=" + handName(hand)
                + " item=" + itemKey(stack) + " action=BLOCK dur=" + duration + " count=" + count);
    }

    /** W2/M1-5 — the use-state face (probe-driven; see class javadoc). */
    public static void state(EntityPlayer player, ItemStack active, ItemStack held, boolean same) {
        if (!ETIMConfig.blockDebugLog) {
            return;
        }
        row("state player=" + nameOf(player)
                + " handActive=" + player.isHandActive()
                + " active=" + itemKey(active) + " held=" + itemKey(held) + " same=" + same);
    }

    /** W11 门控 — the canBlockDamageSource suppression marker (only logged with a live use stack). */
    public static void gate(EntityLivingBase self, DamageSource source, ItemStack active) {
        if (!ETIMConfig.blockDebugLog) {
            return;
        }
        row("gate player=" + nameOf(self) + " active=" + itemKey(active)
                + " src=" + (source == null ? "-" : source.getDamageType()) + " suppressed=true");
    }

    /** W3/W4/W5/W9/W10 — the halving event face. */
    public static void block(EntityPlayer player, DamageSource source, float raw, float blocked,
            ItemStack active) {
        if (!ETIMConfig.blockDebugLog) {
            return;
        }
        row("block player=" + nameOf(player)
                + " src=" + (source == null ? "-" : source.getDamageType())
                + " raw=" + f3(raw) + " blocked=" + f3(blocked)
                + " factor=" + f3(ETIMConfig.blockDamageFactor)
                + " min=" + f3(ETIMConfig.blockMinDamage)
                + " carrier=" + itemKey(active));
    }

    /** W6/W7/W12/W14 — the wear face (B-10: rate = shieldWearRate column slot, decay = the tool's real rate). */
    public static void wear(EntityPlayer player, ItemStack stack, float rate, int decay,
            float raw, float blocked, int wear, int durBefore, int durAfter) {
        if (!ETIMConfig.blockDebugLog) {
            return;
        }
        row("wear player=" + nameOf(player)
                + " item=" + itemKey(stack)
                + " rate=" + f3(rate)
                + " decay=" + (decay < 0 ? "na" : String.valueOf(decay))
                + " raw=" + f3(raw) + " blocked=" + f3(blocked)
                + " wear=" + wear + " dur=" + durBefore + "->" + durAfter);
    }

    /** W6 预读 — the stack durability of the active/held stack. */
    public static void probeDurability(EntityPlayer player, ItemStack stack) {
        if (!ETIMConfig.blockDebugLog) {
            return;
        }
        row("probe player=" + nameOf(player) + " held=" + itemKey(stack)
                + " dur=" + (stack.isEmpty() ? "-" : stack.getItemDamage() + "/" + stack.getMaxDamage()));
    }

    /** W14 — the five-key config re-read arm of {@code blockprobe}. */
    public static void probeConfig(EntityPlayer player) {
        if (!ETIMConfig.blockDebugLog) {
            return;
        }
        row("probe player=" + nameOf(player)
                + " cfg blockModel=" + ETIMConfig.blockModel
                + " factor=" + f3(ETIMConfig.blockDamageFactor)
                + " min=" + f3(ETIMConfig.blockMinDamage)
                + " shieldRate=" + f3(ETIMConfig.shieldWearRate));
    }

    // ==================== channel launcher (ETIMDamageLog:109-122 shape) ====================

    private static void row(String line) {
        if (ETIMConfig.blockDebugLog) {
            ETIM.LOGGER.info(String.format(Locale.ROOT, "[BlockLog] %s [server]", line));
        }
    }

    private static String nameOf(EntityLivingBase entity) {
        return entity.getName() + "#" + entity.getEntityId();
    }

    private static String handName(EnumHand hand) {
        return hand == EnumHand.OFF_HAND ? "off" : "main";
    }

    private static String itemKey(ItemStack stack) {
        if (stack.isEmpty()) {
            return "-";
        }
        Item item = stack.getItem();
        return item.getRegistryName() == null ? item.getClass().getSimpleName()
                : item.getRegistryName().toString();
    }

    /** %.3f — the [DamageLog]/[ArrowLog] spec (8.7 and 9 must stay distinguishable). */
    private static String f3(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }
}
