package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mixins.EntityAccessor;
import io.github.etim.etim.mixins.EntityLivingAccessor;
import io.github.etim.etim.mixins.EntityLivingBaseAccessor;
import net.minecraft.block.BlockFence;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.monster.EntityMob;
import net.minecraft.entity.monster.EntityZombieVillager;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.entity.passive.EntityWaterMob;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

import java.util.List;
import java.util.WeakHashMap;

/**
 * Stage 5 slice 1: the R196 despawn chain (audit 11 §2.1, A-grade judged),
 * replacing vanilla 1.12 {@code EntityLiving.despawnEntity} / {@code canDespawn}.
 *
 * <p>Every rule below is a first-hand transcription — nothing invented:</p>
 * <ul>
 *   <li><b>Main loop</b> (MITE EntityLiving.tryDespawnEntity :761-783):
 *       {@code persistenceRequired → counter = 0}; otherwise the gate is
 *       {@code counter >= 200}; when the gate opens: nearest player (no
 *       distance cap), {@code dy *= 2} outside the hour-of-grace
 *       {@code hourOfDay == 5} (MITE World.getHourOfDay =
 *       {@code ((timeOfDay % 24000) + 6000) % 24000 / 1000}), then
 *       {@code dist² > 256 && canDespawn() → setDead}, else
 *       {@code counter = (int)(Math.random()*100) - 50}.</li>
 *   <li><b>LOS view-reset</b> (MITE EntityLiving :699-758): a player with
 *       line-of-sight to any of the entity sample points (foot+0.75H,
 *       foot+0.1, top+0.5 — plus the player-eye+1.0 → top+0.5 pairing)
 *       refreshes the counter MITE-style {@code refreshDespawnCounter} =
 *       {@code min(counter, -400)}, water mobs {@code -9600}.</li>
 *   <li><b>EntityMob layer</b> (MITE EntityMob :259-269, runs AFTER the LOS
 *       gate): a live player within 48 blocks with a path to it refreshes
 *       {@code min(counter, -1200)} and holds.</li>
 *   <li><b>EntityAnimal layer</b> (MITE EntityAnimal :237-255, runs BEFORE
 *       the LOS gate): {@code counter < 800 → false}; then a nearest player
 *       within 1024 <b>blocks radius</b> or any fence within ±16 xz / ±1 y
 *       → {@code counter = 0}; then {@code counter <= 2400 → false}.</li>
 *   <li><b>EntityZombie layer</b> (MITE EntityZombie :346-347): converting /
 *       villager-born zombies never despawn (1.12: every
 *       {@code EntityZombieVillager}).</li>
 *   <li><b>Tame gate</b> (MITE EntityWolf:558 front guard): owned animals
 *       hold; the R196 cat override and the vanilla-only tameables share it.
 *       1.12's chicken-jockey gate and the Golem/Villager constant-false
 *       overrides are handled separately (mixin/comparison notes below).</li>
 * </ul>
 *
 * <p>Per-class overlay notes (verified against both codebases):</p>
 * <ul>
 *   <li>Golem / Villager — constant {@code false} in BOTH games, so the
 *       vanilla bodies stay authoritative without a hook.</li>
 *   <li>Ocelot — vanilla 1.12 returns flat {@code !tamed && ticks > 2400}
 *       with NO super call; {@code MixinEntityOcelot} re-fits the MITE
 *       gate→chain shape.</li>
 *   <li>Chicken — vanilla gates on the jockey rider rule; MITE 1.6.4 has
 *       no such rule, {@code MixinEntityChicken} replaces it with the
 *       animal chain while the switch is on (deviation #6).</li>
 *   <li>ZombieVillager — the vanilla override falls through to this chain
 *       via super when not converting (the R196 born-villager half is
 *       covered by the zombie gate above).</li>
 *   <li>Wither / Dragon — their own vanilla {@code despawnEntity}
 *       overrides bypass this mixin entirely (MITE keeps the counter at 0,
 *       same protection).</li>
 * </ul>
 *
 * <p>Deliberate 1.12 deviations (logged here, not invented values):</p>
 * <ol>
 *   <li>The counter storage is vanilla {@code EntityLivingBase.idleTime}.
 *       It increments only for server-side AI-enabled living entities (MITE
 *       increments {@code despawn_counter} for every entity inside the world
 *       update loop) — a mob with NoAI therefore never despawns, which
 *       vanilla 1.12 already treats the same way.</li>
 *   <li>The MITE render-range short-circuit inside the LOS sampler reads
 *       {@code Minecraft.theMinecraft} (a client static); its dedicated
 *       server value renders the threshold (2048 dist²) irrelevant against
 *       the 4096 dist² LOS cut-off, so the combined behavior is "LOS
 *       sampling only within 64 blocks, rejection beyond".</li>
 *   <li>MITE's leaf-visibility flag for the despawn LOS is {@code false}
 *       (leaves would NOT be opaque); 1.12 has no per-block switch, so the
 *       standard vanilla {@code rayTraceBlocks} wording (leaves block LOS,
 *       more resets than MITE) is used and noted as a divergence to watch.</li>
 *   <li>The audit's Hellhound exclusion clause has no 1.12 counterpart
 *       entity; vanilla wolves use the animal layer as-is.</li>
 *   <li>MITE's animal nearest-player check passes {@code must_be_alive=false};
 *       1.12's {@code getClosestPlayer(..., false)} predicate is
 *       NOT_SPECTATING — effectively the same filter.</li>
 * </ol>
 */
public final class DespawnRules {

    /** MITE EntityLiving:764 — the counter gate of the despawn pass. */
    private static final int COUNTER_GATE = 200;
    /** MITE EntityLiving:776 — despawn pass threshold, dist² (16 blocks). */
    private static final double KILL_DIST_SQ = 256.0;
    /** MITE EntityLiving:779 — reroll range [(int)(Math.random()*100) − 50]. */
    private static final int REROLL_RANGE = 100;
    /** MITE EntityAnimal:239/:249 — the two animal counter walls. */
    private static final int ANIMAL_QUIET = 800;
    private static final int ANIMAL_KILL = 2400;
    /**
     * MITE EntityAnimal:243 — 1024 is the RADIUS of MITE
     * {@code getClosestPlayer} (it squares internally), so "any player
     * within 1024 blocks". The audit's "32 blocks (1024²)" note was a
     * misread; the first-hand decompile (World.getClosestPlayer :5016-5024)
     * resolves the discrepancy in favor of the radius.
     */
    private static final double ANIMAL_PLAYER_RADIUS = 1024.0;
    /** MITE EntityAnimal:244 — fence scan half-width (xz), column ±1 y. */
    private static final int FENCE_RADIUS = 16;
    /** MITE EntityMob:263 — the path-hold player search radius. */
    private static final double MOB_PATH_RADIUS = 48.0;
    /** MITE Entity:2868 — refreshDespawnCounter assigns {@code min(counter, value)}. */
    private static final int RESET_IN_VIEW = -400;
    private static final int RESET_IN_VIEW_WATER = -9600;
    private static final int RESET_PATH = -1200;

    /**
     * Signature dedup for the [AILog] hold lines: one line per (entity,
     * reason) — holds and rerolls repeat every 10-45 s per far mob, while
     * the kill line is terminal. The despawn chain runs only under
     * {@code isServerWorld()}, so the run26 dual-end lesson ("endpoint into
     * the dedup key") has no alternating-writer hazard here.
     */
    private static final WeakHashMap<EntityLiving, String> LAST = new WeakHashMap<>();

    /**
     * Water-mob spawn note marker: entities whose despawn counter was
     * restored from NBT (via {@code MixinEntity}) must not be re-seeded with
     * the spawn-time −9600 (R196 assigns that only inside the natural
     * spawning pass, SpawnerAnimals:664-666).
     */
    private static final java.util.Set<EntityLiving> COUNTER_RESTORED =
            java.util.Collections.newSetFromMap(new WeakHashMap<EntityLiving, Object>());
    /** Entities already processed by the seed check (one pass only). */
    private static final java.util.Set<EntityLiving> SEEDED =
            java.util.Collections.newSetFromMap(new WeakHashMap<EntityLiving, Object>());

    /** Called by MixinEntity when "despawn_counter" was present in NBT. */
    public static void markCounterRestored(EntityLiving e) {
        COUNTER_RESTORED.add(e);
    }

    public static boolean isCounterRestored(EntityLiving e) {
        return COUNTER_RESTORED.contains(e);
    }

    private DespawnRules() {
    }

    // ------------------------------------------------------------------ chain

    /**
     * The R196 layered canDespawn. Refreshes the counter with the same
     * min-guarded (or plain-assign, per layer) side effects MITE does inside
     * canDespawn. Returns the despawn eligibility.
     */
    public static boolean canDespawn(EntityLiving e) {
        // zombie layer — checked before everything else (MITE :346-347)
        if (e instanceof EntityZombieVillager) {
            log(e, "hold=zombie-villager");
            return false;
        }
        // tame layer — R196 EntityWolf:558 puts {@code !isTamed} in front of
        // the chain (cats carry their own tamed gate; 1.12-only tameables get
        // the same hold, noted in the deviation list)
        if (e instanceof net.minecraft.entity.passive.EntityTameable
                && ((net.minecraft.entity.passive.EntityTameable) e).isTamed()) {
            return false;
        }
        World w = ((EntityAccessor) e).etim$getWorld();
        // animal layer — three walls, checked BEFORE the LOS gate (MITE :237-255)
        if (e instanceof EntityAnimal) {
            int c = ((EntityLivingBaseAccessor) e).etim$getIdleTime();
            if (c < ANIMAL_QUIET) {
                return false;
            }
            if (w.getClosestPlayer(e.posX, e.posY, e.posZ, ANIMAL_PLAYER_RADIUS, false) != null
                    || hasFenceNearby(w, e)) {
                ((EntityLivingBaseAccessor) e).etim$setIdleTime(0);
                log(e, "hold=animal-player-or-fence");
                return false;
            }
            if (c <= ANIMAL_KILL) {
                return false;
            }
            // fall through to the LOS gate (== MITE super.canDespawn())
        }
        // LOS view-reset gate — the base layer (MITE EntityLiving:752-758)
        if (isConsideredInViewOfAnyPlayer(e, w)) {
            refresh(e, e instanceof EntityWaterMob ? RESET_IN_VIEW_WATER : RESET_IN_VIEW);
            return false;
        }
        // mob layer — AFTER the LOS gate (MITE EntityMob:259-269)
        if (e instanceof EntityMob) {
            EntityPlayer p = w.getClosestPlayer(e.posX, e.posY, e.posZ, MOB_PATH_RADIUS, false);
            if (p != null && p.isEntityAlive()
                    && e.getNavigator().getPathToEntityLiving(p) != null) {
                refresh(e, RESET_PATH);
                log(e, "hold=mob-path-within48");
                return false;
            }
        }
        return true;
    }

    /**
     * The R196 main loop (tryDespawnEntity). Always returns true (= the
     * vanilla body must be skipped) while the switch is on — the loop is
     * replaced wholesale. The vanilla {@code idleTime} increment (once per
     * server AI tick, inside {@code updateEntityActionState}) already
     * happened when this runs, matching MITE's world-update increment.
     */
    public static boolean tryDespawn(EntityLiving e) {
        // R196 SpawnerAnimals:664-666 — water mobs spawn with the long
        // −9600 counter; the seed fires once, at the first despawn pass of
        // a freshly constructed (not NBT-restored) water mob
        if (e instanceof EntityWaterMob && !SEEDED.contains(e)) {
            SEEDED.add(e);
            if (e.ticksExisted <= 1 && !isCounterRestored(e)) {
                ((EntityLivingBaseAccessor) e).etim$setIdleTime(RESET_IN_VIEW_WATER);
            }
        }
        if (((EntityLivingAccessor) e).etim$isPersistenceRequired()) {
            ((EntityLivingBaseAccessor) e).etim$setIdleTime(0);
            return true;
        }
        int c = ((EntityLivingBaseAccessor) e).etim$getIdleTime();
        if (c < COUNTER_GATE) {
            return true;
        }
        World w = ((EntityAccessor) e).etim$getWorld();
        EntityPlayer p = w.getClosestPlayer(e.posX, e.posY, e.posZ, -1.0, false);
        if (p == null) {
            return true; // MITE :766 — no player anywhere, nothing happens
        }
        boolean hourOfGrace = hourOfDay(w) == 5;
        double dx = p.posX - e.posX;
        double dy = p.posY - e.posY;
        double dz = p.posZ - e.posZ;
        if (!hourOfGrace) {
            dy *= 2.0;
        }
        double distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > KILL_DIST_SQ && canDespawn(e)) {
            logKill(e, c, distSq);
            e.setDead();
        } else {
            int reroll = (int) (Math.random() * REROLL_RANGE) - REROLL_RANGE / 2;
            ((EntityLivingBaseAccessor) e).etim$setIdleTime(reroll);
            log(e, "reroll counter_new=" + reroll);
        }
        return true;
    }

    // ------------------------------------------------------------------ LOS

    /** MITE EntityLiving:740-750 (isConsideredInViewOfAnyPlayer). */
    private static boolean isConsideredInViewOfAnyPlayer(EntityLiving e, World w) {
        List<EntityPlayer> players = w.playerEntities;
        for (int i = 0; i < players.size(); i++) {
            EntityPlayer p = players.get(i);
            if (!p.isSpectator() && isConsideredInView(e, p)) {
                return true;
            }
        }
        return false;
    }

    /**
     * MITE EntityLiving:699-738 (isConsideredInViewOfPlayerForDespawningPurposes):
     * first the 64-block LOS cut-off, then the 3 entity sample points plus
     * the player-eye+1.0 pairing. MITE's {@code !player.isGhost()} maps to
     * {@code !player.isSpectator()}.
     */
    private static boolean isConsideredInView(EntityLiving e, EntityPlayer p) {
        double distSq = e.getDistanceSq(p.posX, p.posY, p.posZ);
        if (distSq > 4096.0) {
            return false;
        }
        Vec3d eye = new Vec3d(p.posX, p.posY + p.getEyeHeight(), p.posZ);
        Vec3d bodyHigh = new Vec3d(e.posX, e.posY + e.height * 0.75, e.posZ);
        if (hasLineOfSight(e, eye, bodyHigh)) return true;
        Vec3d bodyLow = new Vec3d(e.posX, e.posY + 0.1, e.posZ);
        if (hasLineOfSight(e, eye, bodyLow)) return true;
        Vec3d bodyTop = new Vec3d(e.posX, e.posY + e.height + 0.5, e.posZ);
        if (hasLineOfSight(e, eye, bodyTop)) return true;
        return hasLineOfSight(e, eye.add(0.0, 1.0, 0.0), bodyTop);
    }

    private static boolean hasLineOfSight(EntityLiving e, Vec3d from, Vec3d to) {
        World w = ((EntityAccessor) e).etim$getWorld();
        RayTraceResult hit = w.rayTraceBlocks(from, to, false, true, false);
        return hit == null;
    }

    // ------------------------------------------------------------------ fence scan

    /**
     * MITE World.blockTypeIsNearTo(Block.fence.blockID, x, y, z, 16, 1):
     * the spiral covers exactly the ±16 xz square at column ±1 y — expressed
     * as a plain square scan (same cell set, no spiral bookkeeping).
     * {@code BlockFence} covers the wood and nether-brick fence blocks of
     * 1.12 (the nether-brick inclusion is noted as a minor superset).
     */
    private static boolean hasFenceNearby(World w, EntityLiving e) {
        int bx = (int) Math.floor(e.posX);
        int by = (int) Math.floor(e.posY);
        int bz = (int) Math.floor(e.posZ);
        for (int i = bx - FENCE_RADIUS; i <= bx + FENCE_RADIUS; i++) {
            for (int j = bz - FENCE_RADIUS; j <= bz + FENCE_RADIUS; j++) {
                for (int k = by - 1; k <= by + 1; k++) {
                    if (w.getBlockState(new BlockPos(i, k, j)).getBlock() instanceof BlockFence) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // ------------------------------------------------------------------ helpers

    /** MITE World.getAdjustedTimeOfDay + getWorldTimeOfDay — the clock hour. */
    private static int hourOfDay(World w) {
        long tod = ((w.getTotalWorldTime() % 24000L) + 6000L) % 24000L;
        return (int) (tod / 1000L);
    }

    /**
     * MITE Entity.refreshDespawnCounter: {@code if (counter > value)
     * counter = value} — a one-way downward refresh, never raises.
     */
    private static void refresh(EntityLiving e, int value) {
        EntityLivingBaseAccessor acc = (EntityLivingBaseAccessor) e;
        int c = acc.etim$getIdleTime();
        if (c > value) {
            acc.etim$setIdleTime(value);
            log(e, "hold=in-view reset=" + value);
        }
    }

    private static void logKill(EntityLiving e, int counter, double distSq) {
        if (!ETIMConfig.mobDebugLog) {
            return;
        }
        boolean server = Thread.currentThread().getName().contains("Server");
        ETIM.LOGGER.info("[AILog] mob despawn kill counter=" + counter
                + " distSq=" + (int) distSq
                + " pos=(" + (int) e.posX + "," + (int) e.posY + "," + (int) e.posZ + ")"
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId()
                + (server ? " [server]" : " [client]"));
    }

    private static void log(EntityLiving e, String key) {
        String prev = LAST.get(e);
        if (key.equals(prev)) {
            return;
        }
        LAST.put(e, key);
        if (!ETIMConfig.mobDebugLog) {
            return;
        }
        boolean server = Thread.currentThread().getName().contains("Server");
        ETIM.LOGGER.info("[AILog] mob despawn " + key
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId()
                + (server ? " [server]" : " [client]"));
    }
}
