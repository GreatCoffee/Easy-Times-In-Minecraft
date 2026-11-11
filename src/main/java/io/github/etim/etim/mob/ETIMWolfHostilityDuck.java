package io.github.etim.etim.mob;

import java.util.Random;

/**
 * B-34 — the wolf hostility faces. R196 {@code EntityWolf :85-92} (the
 * {@code hostile_to_players} dataWatcher byte), {@code :184-195} (the
 * {@code target_countdown} timeout — 800±100 ticks ≈ 40 s, cleared target
 * at 0), {@code :104-105/:117} (the NBT persistence). The 1.12 wolf has no
 * such faces — this duck + the {@code MixinEntityWolf} @Unique fields carry
 * them. {@code is_witch_ally} is out of scope (the R196 summon mechanism
 * :617, ETIM never makes wolves witch-allies — C-note).
 */
public interface ETIMWolfHostilityDuck {

    boolean etim$isHostileToPlayers();

    void etim$setHostileToPlayers(boolean hostile);

    int etim$getTargetCountdown();

    void etim$setTargetCountdown(int countdown);

    /** R196 EntityWolf :305-307 — startTargetCountdown() = 800 + rand(100) - rand(100). */
    static int freshCountdown(Random rng) {
        return 800 + rng.nextInt(100) - rng.nextInt(100);
    }
}
