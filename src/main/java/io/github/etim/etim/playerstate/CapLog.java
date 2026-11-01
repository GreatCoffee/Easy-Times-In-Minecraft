package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.player.EntityPlayer;

/**
 * capend D-2: the [CapLog] dev channel (same family as [FoodLog]).
 * One server-side row per {@link PlayerCapApplier#applyCaps} call:
 *
 * <pre>[CapLog] lvl=&lt;level&gt; cap=&lt;cap&gt; prevBase=&lt;attr base before&gt;
 * healthBefore=&lt;hp before&gt; heal=&lt;hp granted&gt; healthAfter=&lt;hp after&gt;</pre>
 *
 * <p>The W-49 window reads lvl/cap (W1-W4), heal (W5, D-1 true arm) and
 * healthAfter (W6, the level-drop clamp) off these frames. Float values
 * print via {@code Float.toString} so the bit-accurate float32 digits
 * survive into the log.</p>
 *
 * <p>Server log only — guarded by {@code playerCapDebugLog} (default off),
 * silently skipped on the client side.</p>
 */
final class CapLog {

    private CapLog() {
    }

    static void log(EntityPlayer player, int cap, double previous, float healthBefore) {
        if (ETIMConfig.playerCapDebugLog && !player.world.isRemote) {
            boolean healedArm = ETIMConfig.playerHealOnLevelUp && cap > previous;
            float heal = healedArm ? (float) (cap - previous) : 0.0F;
            ETIM.LOGGER.info("[CapLog] lvl=" + player.experienceLevel
                    + " cap=" + cap
                    + " prevBase=" + (float) previous
                    + " healthBefore=" + healthBefore
                    + " heal=" + heal
                    + " healthAfter=" + player.getHealth());
        }
    }
}
