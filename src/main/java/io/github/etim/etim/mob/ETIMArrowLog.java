package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

/**
 * The batch-B arrow identity judgment channel (userIdentity face D-20):
 * {@code [ArrowLog]} rows for the register/spawn/pickup/nbt/skeleton/dispense
 * steps. Shape copied from the [MobLog] gate (mob/ETIMMobEquip.java:75-79) —
 * one config switch, server log only.
 *
 * <p>Unified toggle arrowDebugLog (category "mobs", default false — Batch B
 * task brief §9.5 / report §7; when closed it stays silent, W1~W7 gating channel).</p>
 */
public final class ETIMArrowLog {

    private ETIMArrowLog() {
    }

    /** [ArrowLog] launcher — mirrors ETIMMobEquip.mobLog (:75-79). */
    public static void row(String line) {
        if (ETIMConfig.arrowDebugLog) {
            ETIM.LOGGER.info("[ArrowLog] " + line + " [server]");
        }
    }
}
