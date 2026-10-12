package io.github.etim.etim.playerstate;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.network.play.server.SPacketSetExperience;

/**
 * The R196 XP curve (audit 13 —《R196 经验池一致性终审》§2.1, STRICT single
 * pool), replacing the vanilla 1.12 trio semantics everywhere ETIM touches
 * the pool.
 *
 * <p><b>Pool = {@code experience:int}, the ONLY storage.</b> Level and bar
 * are derived (no independent fields):</p>
 * <ul>
 *   <li>level cost ladder: per-step cost {@code 20 + 10·(level−1)}
 *       (increase=20 from level 0, then +10 per level; EntityPlayer:2901-2909
 *       static table) ⇒ closed form {@code total(level) = 5·L² + 15·L};</li>
 *   <li>derivation {@code getExperienceLevel(int experience)}:
 *       pool ≥ 0 → largest L with total(L) ≤ pool; pool &lt; 0 → debt levels
 *       {@code −((−exp−1)/20 + 1)} floored at −40 — the death-chain's
 *       −20/level &amp; −800-point floor (= −40·20) match this derivation;</li>
 *   <li>bar: {@code (pool − total(level)) / (total(level+1) − total(level))}
 *       (:611-613);</li>
 *   <li>level cap 200 via {@code getExperienceRequired(level>200) =
 *       Integer.MAX_VALUE} (:586-587) — matching ETIMConfig.levelCap.</li>
 * </ul>
 *
 * <p>Vanilla's trio is NOT the pool: {@link EntityPlayer#addExperience(int)}
 * carries no negative branch (run26 158-round: negative amounts push the bar
 * fraction negative and the level FREEZES), and the enchanting/anvil paths
 * mutate the level without touching the pool. Audit 13 §2.3: R196's
 * enchantment costs {@code levels × 100} POINTS via the same
 * {@code addExperience(−points)} (see MixinContainerEnchantment).</p>
 */
public final class ETIMXp {

    /** R196 derivation cap: required(level>200) = Integer.MAX_VALUE (EntityPlayer:586-587). */
    public static final int MAX_LEVEL = 200;

    private ETIMXp() {
    }

    /** Points needed to REACH {@code level} from 0 (closed form of the 20+10·(L−1) ladder). */
    public static int pointsForLevel(int level) {
        if (level <= 0) {
            return 0;
        }
        if (level > MAX_LEVEL) {
            return Integer.MAX_VALUE;   // getExperienceRequired(level>200)
        }
        return 5 * level * level + 15 * level;
    }

    /**
     * Inverse: the level owning exactly the given pool — R196
     * {@code getExperienceLevel(int experience)} (EntityPlayer:590-605).
     * Negative pools use the debt branch (floor −40; the death chain's
     * −800-point floor lives there).
     */
    public static int levelForPoints(int total) {
        if (total < 0) {
            long debtLevels = -((-(long) total - 1) / 20 + 1);
            return (int) Math.max(debtLevels, -40L);
        }
        int level = 0;
        while (level < MAX_LEVEL && pointsForLevel(level + 1) <= total) {
            level++;
        }
        return level;
    }

    /** Bar fraction: (pool − total(level)) / (total(level+1) − total(level)) (:611-613). */
    public static float barFor(int pool, int level) {
        if (level < 0) {
            return 0.0F;    // debt bars: no forward progress to fill
        }
        if (level >= MAX_LEVEL) {
            return 1.0F;
        }
        int span = pointsForLevel(level + 1) - pointsForLevel(level);
        float frac = (pool - pointsForLevel(level)) / (float) span;
        return Math.max(Math.min(frac, 1.0F), 0.0F);
    }

    /**
     * Writes the pool-consistent state (total/level/bar all derived from the
     * ONE R196 curve) and pushes the sync packet. NO clamping: a pool that
     * drops below zero survives as debt (level derived negative) — that is
     * how R196 renders the death chain.
     */
    public static void applyTotal(EntityPlayer player, int newTotal) {
        player.experienceTotal = newTotal;
        player.experienceLevel = levelForPoints(newTotal);
        player.experience = barFor(newTotal, player.experienceLevel);
        if (player instanceof EntityPlayerMP) {
            ((EntityPlayerMP) player).connection.sendPacket(
                    new SPacketSetExperience(player.experience, player.experienceTotal, player.experienceLevel));
        }
    }
}
