package io.github.etim.etim.mob;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import com.google.common.collect.Sets;

import net.minecraft.block.state.IBlockState;
import net.minecraft.block.Block;
import net.minecraft.block.BlockHugeMushroom;
import net.minecraft.block.BlockSlab;
import net.minecraft.block.BlockStairs;
import net.minecraft.block.material.Material;
import net.minecraft.init.Blocks;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EnumCreatureType;
import net.minecraft.entity.IEntityLivingData;
import net.minecraft.entity.monster.EntityMob;
import net.minecraft.entity.monster.IMob;
import net.minecraft.entity.monster.EntityCreeper;
import net.minecraft.entity.monster.EntityGhast;
import net.minecraft.entity.passive.EntityHorse;
import net.minecraft.entity.passive.EntityWolf;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;import net.minecraft.world.EnumSkyBlock;import net.minecraft.util.math.ChunkPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;
import net.minecraft.world.WorldEntitySpawner;
import net.minecraft.world.WorldServer;
import net.minecraft.world.biome.Biome;
import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

/**
 * R196 spawn cycle (audit 11 §4 + audit 14 — the SpawnerAnimals slice).
 *
 * <p>The vanilla carrier {@code WorldEntitySpawner.findChunksForSpawning}
 * (called from WorldServer.tick every tick, WorldServer:211) is redirected
 * here (MixinWorldServer). The 1.12 structure is the same 1.6.4 lineage, so
 * the transposition only swaps the four value surfaces: the cap table
 * (50/10/5/5 over /256, hostile deep ×2), the hostile dual probability rings
 * (0.10 under-60 / 0.17 over-60 × modifier), the modifier four events
 * (decreased/increased/no_spawn with the blood-moon/thunder rescue gate) and
 * the admission fine print (dual-light close branch, the y=63 ice or-chain,
 * the night-moon rejection rates, the per-mob under/over buckets, the
 * per-chunk density band). Moon state comes from {@link ETIMMoonState}.</p>
 *
 * <p>Hostile dual-ring pass follows audit 16 (R196 :102-311 全文对照):
 * band gates per ring (deep y&lt;60 / surface y&gt;=60), the 48-block coin,
 * chunk-scoped per-bucket spawn counters with label249 abandon, per-round
 * living data, the combined-light close branch, undead-only daylight skip
 * and the blue-moon eye-brightness reject. All [SpawnLog] rows run behind
 * the {@code mobDebugLog} gate.</p>
 */
public final class ETIMSpawnCycle {

    private static final int MOB_COUNT_DIV = 256;

    /** Per-dimension modifier counters + eligible set. */
    private static final Map<Integer, State> STATES = new HashMap<>();

    private static final class State {
        int decreased;
        int increased;
        int noSpawn;
        final Set<ChunkPos> eligible = Sets.newHashSet();
        // R196 (:1434 getfield #23): the modifier draws come from an
        // independent class-field Random, NOT world.rand (audit 15 §2.2).
        final Random rng = new Random();
    }

    private static State state(int dim) {
        return STATES.computeIfAbsent(dim, (k) -> new State());
    }

    // ------------------------------------------------------------------
    // entry (redirected WorldServer.tick call site)

    public static int findChunksForSpawning(WorldServer w, boolean spawnHostileMobs, boolean spawnPeacefulMobs,
            boolean spawnOnSetTickRate) {
        if (!ETIMConfig.mobSpawnR196) {
            // Config off = vanilla 1.12 rules, unmodified.
            return new WorldEntitySpawner().findChunksForSpawning(w, spawnHostileMobs, spawnPeacefulMobs,
                    spawnOnSetTickRate);
        }
        if (!spawnHostileMobs && !spawnPeacefulMobs) {
            return 0;
        }
        // R196 freeze plane (SpawnerAnimals :463-464): with no players online
        // the whole calc is skipped — modifier counters must NOT tick down.
        if (w.playerEntities.isEmpty()) {
            return 0;
        }
        State st = state(w.provider.getDimension());
        int spawned = 0;

        if (spawnHostileMobs) {
            float mod = hostileModifier(w, st);
            // Dual rings (audit 11 §4.1 :466-467): deep (y<60) 0.10×mod per
            // tick, surface (y>=60) 0.17×mod per tick.
            if (w.rand.nextFloat() < 0.10F * mod) {
                spawned += trySpawningHostileMobs(w, st, true);
            }
            if (w.rand.nextFloat() < 0.17F * mod) {
                spawned += trySpawningHostileMobs(w, st, false);
            }
        }
        if (spawnPeacefulMobs && w.getWorldInfo().getWorldTotalTime() % 400L == 0L) {
            spawned += trySpawningPeacefulMobs(w, st);
        }
        return spawned;
    }

    // ------------------------------------------------------------------
    // modifier four events (audit 14 §4.1 :428-460)

    private static float hostileModifier(WorldServer w, State st) {
        if (w.provider.getDimension() != 0) {
            // M6-04 (underworld 批 2026-10-25): R196 :428-431 — the non-overworld
            // face is a flat 0.25F; the rescue gate is unreachable there (C-3).
            if (ETIMConfig.mobDebugLog && modifier25LogBudget > 0) {
                --modifier25LogBudget;
                log(w, "modifier dim=" + w.provider.getDimension() + " mod=0.25");
            }
            return 0.25F;
        }
        float mod = 1.0F;
        // Transition-only logging (audit 15 §2.1 判词 1a + 契约 1): the emit
        // fires ONLY on a state edge — window opened or window exhausted —
        // never on steady in-window ticks (steady duty ≈19%, prev flood
        // 2915 rows/16 min was a misread, not a topology bug).
        boolean ev = false;
        if (st.decreased > 0) {
            if (--st.decreased == 0) {
                ev = true; // window exhausted
            }
            mod *= 0.5F;
        } else if (st.rng.nextInt(24000) == 0) {
            st.decreased = st.rng.nextInt(4000) + 1; // 1..4000
            ev = true; // window opened
        }
        if (st.increased > 0) {
            if (--st.increased == 0) {
                ev = true;
            }
            mod *= 2.0F;
        } else if (st.rng.nextInt(24000) == 0) {
            st.increased = st.rng.nextInt(2000); // 0..1999
            ev = true;
        }
        if (st.noSpawn > 0) {
            if (--st.noSpawn == 0) {
                ev = true;
            }
            mod = 0.0F;
        } else if (st.rng.nextInt(24000) == 0) {
            st.noSpawn = st.rng.nextInt(2000) + st.rng.nextInt(2000); // 0..3998
            ev = true;
        }
        // Rescue gate (calc :455-457): only "reduced" mods are restored; an
        // active x2 stands even under a blood moon / thunderstorm.
        if (mod < 1.0F && ETIMMoonState.rescueGate(w, w.isThundering())) {
            mod = 1.0F;
            ev = true;
        }
        if (ETIMConfig.mobDebugLog && ev) {
            log(w, "modifier mod=" + mod + " d=" + st.decreased + " i=" + st.increased + " n=" + st.noSpawn);
        }
        return mod;
    }

    // ------------------------------------------------------------------
    // eligible chunks (same layout as vanilla; edge ring count-only).
    // R196 02 节段 (audit19 落码): the hostile per-player density gate rides
    // on the forHostileMobs=true build (SpawnerAnimals:19-72).

    private static int collectEligibleChunks(WorldServer w, State st, boolean forHostileMobs) {
        // R196 :33/:21-23 — day/phase snapshots at build-head.
        boolean daytime = w.isDaytime();
        ETIMMoonState.Phase phase = ETIMMoonState.phase(w);
        if (forHostileMobs) {
            densitySkipLogBudget = 2; // audit19 #5: per-pass instrument budget
        }
        st.eligible.clear();
        int count = 0;
        for (EntityPlayer p : w.playerEntities) {
            // R196 :27 (两页共用): ghost→spectator 直映射; the tournament
            // check is a 1.6.4-only system with no 1.12 counterpart
            // (audit19 #6 确证: build 源 entity/player 域零命中).
            if (p.isSpectator() || p.isDead || p.getHealth() <= 0.0F) {
                continue;
            }
            if (forHostileMobs) {
                int footY = MathHelper.floor(p.posY);
                int densityLimit;
                int minimum = 8;
                if (w.provider.getDimension() == 0) {
                    // R196 :31 — depth-proportional base.
                    densityLimit = (int) (8.0F * (1.0F + (64.0F - footY) / 32.0F));
                    // R196 :32-43 — the night moon bump applies to the
                    // MINIMUM floor only: blood x3/2, full x5/4 (else-if,
                    // so blood wins on the %128∩%32 days — phase() keeps
                    // the same outranking). Night face = worldInfo
                    // instance clock (A7/denom 同族); phase face =
                    // totalWorldTime derivation + override shortcut — the
                    // two sources co-present, a documented deviation
                    // (audit19 #3).
                    if (!daytime) {
                        minimum = (int) (minimum * ETIMMoonState.deepDensityMultiplier(phase));
                    }
                    if (densityLimit < minimum) {
                        densityLimit = minimum;
                    }
                } else {
                    // R196 :44-45 — flat limit off-overworld, no depth
                    // factor, no moon bump, no floor term.
                    densityLimit = 8;
                }
                // R196 :48 + WorldServer:1850-1866. Block coordinates on
                // BOTH generations (audit19 双否: R196 returns getCenter()
                // box midpoints / getChunkPosition(64) chunk-center blocks;
                // 1.12 returns BlockPos((chunk<<4)+8)) — no /16 restore.
                // The (int) OUTER truncation (:48) is an A-grade fidelity
                // point: `imobs > limit` flips without it.
                float proximity = strongholdProximity(w, MathHelper.floor(p.posX), MathHelper.floor(p.posZ));
                densityLimit = (int) (densityLimit + densityLimit * proximity);
                // R196 :49 — the IMob layer inside the player's dense box.
                // 1.12's <T extends Entity> witness can't take an interface
                // type raw (vanilla precedent search: zero callers) — query
                // the EntityLiving layer and filter (every IMob impl is an
                // EntityLiving subclass: EntityMob/EntitySlime/EntityGhast).
                List<EntityLiving> nearby = w.getEntitiesWithinAABB(EntityLiving.class,
                        p.getEntityBoundingBox().expand(32.0D, 8.0D, 32.0D));
                int imobs = 0;
                for (EntityLiving e : nearby) {
                    if (e instanceof IMob) {
                        ++imobs;
                    }
                }
                // audit19-W3 判据仪器 (甲, 边沿去重): the min-value chain
                // (override→phase→seam→min) executes at EVERY build, but the
                // skip row only fires when the player IS skipped — this eval
                // row logs the chain inputs regardless of the skip truth
                // (edge-deduped: emission only when the signature changes,
                // audit 15 transition-only logging precedent). imobs is
                // deliberately OUT of the signature (it churns every tick
                // and would re-flood); it prints at emit time only.
                String evalSig = w.provider.getDimension() + "|" + footY + "|" + minimum
                        + "|" + densityLimit + "|" + proximity + "|" + daytime + "|" + phase
                        + "|" + MathHelper.floor(p.posX) + "|" + MathHelper.floor(p.posZ);
                if (!evalSig.equals(lastDensityEvalSig)) {
                    lastDensityEvalSig = evalSig;
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "density-eval dim=" + w.provider.getDimension()
                                + " at (" + MathHelper.floor(p.posX) + "," + footY + ","
                                + MathHelper.floor(p.posZ) + ")"
                                + " imobs=" + imobs + " limit=" + densityLimit
                                + " min=" + minimum + " prox=" + proximity
                                + " daytime=" + daytime + " phase=" + phase);
                    }
                }
                if (imobs > densityLimit) {
                    // R196 :50-51 — skip this player's whole ring.
                    if (ETIMConfig.mobDebugLog && densitySkipLogBudget > 0) {
                        --densitySkipLogBudget;
                        log(w, "density-skip dim=" + w.provider.getDimension()
                                + " at (" + MathHelper.floor(p.posX) + "," + footY + ","
                                + MathHelper.floor(p.posZ) + ")"
                                + " imobs=" + imobs + " limit=" + densityLimit
                                + " min=" + minimum + " prox=" + proximity);
                    }
                    continue;
                }
            }
            int cx = MathHelper.floor(p.posX / 16.0D);
            int cz = MathHelper.floor(p.posZ / 16.0D);
            for (int i = -8; i <= 8; ++i) {
                for (int j = -8; j <= 8; ++j) {
                    boolean edge = i == -8 || i == 8 || j == -8 || j == 8;
                    ChunkPos pos = new ChunkPos(i + cx, j + cz);
                    if (st.eligible.contains(pos)) {
                        continue;
                    }
                    ++count;
                    if (!edge && w.getWorldBorder().contains(pos)) {
                        net.minecraft.server.management.PlayerChunkMapEntry entry =
                                w.getPlayerChunkMap().getEntry(pos.x, pos.z);
                        if (entry != null && entry.isSentToPlayers()) {
                            st.eligible.add(pos);
                        }
                    }
                }
            }
        }
        return count;
    }

    /**
     * R196 WorldServer:1850-1866 (getStrongholdProximity), verbatim.
     * Structure lookup rides the 1.12 face
     * {@code World.findNearestStructure → ChunkGeneratorOverworld "Stronghold"}
     * (ChunkGeneratorOverworld:573-581; non-map worlds → null → 0). Both
     * return families are BLOCK coordinates (audit19 双否), y deltas are
     * 0.0 and the search plane sits at y=64 (:1851/:1856/:1863);
     * {@code getDistanceFromDeltas} = plain sqrt (R196 World.java:434).
     * No caching, no throttling (R196-exact).
     */
    private static float strongholdProximity(WorldServer w, int x, int z) {
        BlockPos stronghold = w.findNearestStructure("Stronghold", new BlockPos(x, 64, z), true);
        if (stronghold == null) {
            return 0.0F;
        }
        double dxs = stronghold.getX() - w.getWorldInfo().getSpawnX();
        double dzs = stronghold.getZ() - w.getWorldInfo().getSpawnZ();
        double spawnToStronghold = Math.sqrt(dxs * dxs + dzs * dzs);
        if (spawnToStronghold < 2000.0D) {
            return 0.0F;
        }
        double dxp = stronghold.getX() - x;
        double dzp = stronghold.getZ() - z;
        double playerToStronghold = Math.sqrt(dxp * dxp + dzp * dzp);
        float proximity = (float) (1.0D - playerToStronghold / spawnToStronghold);
        return proximity < 0.0F ? 0.0F : proximity;
    }

    // ------------------------------------------------------------------
    // hostile pass (audit 14 §4.2, trySpawningHostileMobs :102-311)

    private static int trySpawningHostileMobs(WorldServer w, State st, boolean deep) {
        int chunkCount = collectEligibleChunks(w, st, true);
        if (chunkCount <= 0 || st.eligible.isEmpty()) {
            return 0;
        }
        int[] buckets = countMonstersByHeight(w);
        // Creature cap: 50 × chunks/256; the deep pass cap doubles (×2).
        int limit = ETIMConfig.spawnCapMonster * chunkCount / MOB_COUNT_DIV;
        if (deep) {
            limit *= 2;
        }
        int localCount = deep ? buckets[0] : buckets[1];
        if (localCount >= limit) {
            if (ETIMConfig.mobDebugLog) {
                log(w, "cap-block deep=" + deep + " count=" + localCount + " limit=" + limit);
            }
            return 0;
        }
        return runSpawnPass(w, st, EnumCreatureType.MONSTER, deep, limit - localCount);
    }

    // ------------------------------------------------------------------
    // peaceful pass (audit 14 §4.5 %400: ambient/aquatic every tick-400;
    // animal additionally only in a blue-moon spawning period)

    private static int trySpawningPeacefulMobs(WorldServer w, State st) {
        int chunkCount = collectEligibleChunks(w, st, false);
        if (chunkCount <= 0 || st.eligible.isEmpty()) {
            return 0;
        }
        int spawned = 0;
        spawned += runPeaceful(w, st, EnumCreatureType.AMBIENT, chunkCount);
        spawned += runPeaceful(w, st, EnumCreatureType.WATER_CREATURE, chunkCount);
        // R196 :471: blue-moon animal season = blue phase && night && %400
        // tick. The %400 MUST be the SAME clock as the pass head that made
        // trySpawningPeacefulMobs tick (:119 worldInfo.getWorldTotalTime()
        // % 400) — W2d instrumented the day-counter %400 as dead-on-arrival
        // (a763b14): after a /time set the two counters are incongruent
        // modulo 400 (Δ = worldTime − totalTime, a fixed nonzero offset), so
        // the gates never co-fire. Since sleep-01, sleep nights keep the
        // clocks congruent (sleep-01 absolute alignment dayTime :=
        // totalTime % 24000, Δ≡0 mod 400 survives the jump) — only /time
        // set still splits the pair. Same-clock pairing remains the fix.
        ETIMMoonState.Phase moonPhase = ETIMMoonState.phase(w);
        if (!w.isDaytime()
                && ETIMMoonState.blueMoonAnimalPeriod(moonPhase)
                && w.getWorldInfo().getWorldTotalTime() % 400L == 0L) {
            blueAnimalGateLogBudget = 4;
            blueAnimalPickLogBudget = 2;
            blueAnimalLandLogBudget = 4;
            int spawnedAnimal = runPeaceful(w, st, EnumCreatureType.CREATURE, chunkCount);
            spawned += spawnedAnimal;
            if (ETIMConfig.mobDebugLog) {
                log(w, "blue-animal pass gate-hit spawned=" + spawnedAnimal);
            }
        }
        return spawned;
    }

    private static int runPeaceful(WorldServer w, State st, EnumCreatureType type, int chunkCount) {
        int cap = capOf(type) * chunkCount / MOB_COUNT_DIV;
        int count = countOfType(w, type);
        if (count >= cap) {
            if (ETIMConfig.mobDebugLog) {
                log(w, "cap-block type=" + type + " count=" + count + " limit=" + cap);
                // Composition instrument (audit18-w2h option-1): the cap-block
                // count face and the testfor battery face disagreed twice
                // (W2h/W2i) — log the actual class make-up the count face sees.
                if (type == EnumCreatureType.CREATURE) {
                    HashMap<String, Integer> species = new HashMap<>();
                    for (net.minecraft.entity.Entity e : w.loadedEntityList) {
                        if (type.getCreatureClass().isAssignableFrom(e.getClass())) {
                            String name = e.getClass().getSimpleName();
                            Integer cur = species.get(name);
                            species.put(name, cur == null ? Integer.valueOf(1) : Integer.valueOf(cur.intValue() + 1));
                        }
                    }
                    StringBuilder sb = new StringBuilder("cap-comp");
                    for (Map.Entry<String, Integer> en : species.entrySet()) {
                        sb.append(' ').append(en.getKey()).append('=').append(en.getValue());
                    }
                    log(w, sb.toString());
                }
            }
            return 0;
        }
        return runSpawnPass(w, st, type, false, cap - count);
    }

    private static int capOf(EnumCreatureType type) {
        switch (type) {
            case MONSTER: return ETIMConfig.spawnCapMonster;
            case CREATURE: return ETIMConfig.spawnCapAnimal;
            case AMBIENT: return ETIMConfig.spawnCapAmbient;
            case WATER_CREATURE: return ETIMConfig.spawnCapAquatic;
            default: return 0;
        }
    }

    // ------------------------------------------------------------------
    // shared pass body (group 3 rounds × up-to-4 walks ±6, audit 14 §4.2)

    private static int runSpawnPass(WorldServer w, State st, EnumCreatureType type, boolean deepOnly, int budget) {
        List<ChunkPos> shuffled = new ArrayList<>(st.eligible);
        Collections.shuffle(shuffled);
        BlockPos.MutableBlockPos cursor = new BlockPos.MutableBlockPos();
        BlockPos.MutableBlockPos probe = new BlockPos.MutableBlockPos();
        int spawnedTotal = 0;

        for (ChunkPos chunkpos : shuffled) {
            if (spawnedTotal >= budget) {
                break;
            }
            int x = chunkpos.x * 16 + w.rand.nextInt(16);
            int z = chunkpos.z * 16 + w.rand.nextInt(16);
            int top = topFilledSegmentPlus16(w, x, z);
            int y = w.rand.nextInt(Math.max(top, 1)) + 1;
            if (type == EnumCreatureType.MONSTER) {
                // A2 (audit 16 定谳): R196 :135-137 — the deep ring rerolls
                // the whole spawn point exactly once; the reroll must still
                // clear the :144 band gate below.
                if (deepOnly && y >= 60) {
                    x = chunkpos.x * 16 + w.rand.nextInt(16);
                    z = chunkpos.z * 16 + w.rand.nextInt(16);
                    top = topFilledSegmentPlus16(w, x, z);
                    y = w.rand.nextInt(Math.max(top, 1)) + 1;
                }
                // audit 17 /2.5: R196 :142 — the ice-floor or-chain rolls at
                // the CHUNK base point (before the walk), and only in the
                // overworld (B4 residue absorbed here). Attempt-level check
                // removed from admitCandidate.
                if (w.provider.getDimension() == 0 && y == 63) {
                    if (w.rand.nextInt(4) != 0
                            && w.getBlockState(new BlockPos(x, y - 1, z)).getBlock() == Blocks.ICE) {
                        continue;
                    }
                }
                // A3 (audit 16 定谳): R196 :143 — with no player within 48 a
                // 1/2 coin drops the chunk (or-gate: player OR coin-pass).
                if (w.getClosestPlayer(x, y, z, 48.0D, false) == null && w.rand.nextInt(2) != 0) {
                    continue;
                }
                // A1 (audit 16 定谳): R196 :144 — the y band is a required
                // conjunct of the ring: deep y<60, surface y>=60.
                if (deepOnly ? y >= 60 : y < 60) {
                    continue;
                }
            }
            // :145 (11 节段移植, 批五): base-point geometry gate — replaces
            // the bare normal-cube continue with the full skeleton.
            if (canSpawnAtLocation(w, type, x, y, z) < 0.0D) {
                continue;
            }
            probe.setPos(x, y, z);
            spawnedTotal += spawnPack(w, cursor, probe, type);
        }
        return spawnedTotal;
    }

    private static int topFilledSegmentPlus16(WorldServer w, int x, int z) {
        net.minecraft.world.chunk.Chunk chunk = w.getChunk(x >> 4, z >> 4);
        return chunk.getTopFilledSegment() + 16;
    }

    /**
     * MITE group structure (audit 14 §4.2): 3 rounds × per-candidate up to 4
     * walks. Audit 16 changes: chunk-scoped per-bucket spawn counters with a
     * label249 abandon on slot exhaustion (A4), the day/undead chunk-abandon
     * channel out of canSpawnHere (A7) and per-round living data (A5).
     */
    private static int spawnPack(WorldServer w, BlockPos.MutableBlockPos cursor, BlockPos base,
            EnumCreatureType type) {
        List<EntityLiving> landed = new ArrayList<>();
        int baseX = base.getX();
        int baseY = base.getY();
        int baseZ = base.getZ();
        // A4 (audit 16 定谳): R196 :146-147 — the y-bucket spawn counters live
        // at chunk scope; hitting getMaxSpawnedInChunk abandons the chunk's
        // remaining rounds (:293-297 continue label249).
        int[] chunkCounts = new int[2];
        boolean[] abandonChunk = new boolean[1];

        roundLoop:
        for (int round = 0; round < 3; ++round) {
            // A5 (audit 16 轮位): R196 :153-155 — living data AND the suitable
            // entry are re-nulled each round (audit 17 /2.4); later spawns in
            // the same round chain onto them.
            IEntityLivingData data = null;
            Biome.SpawnListEntry entry = null;
            // 三蜘蛛轮门3（R196 SpawnerAnimals :216-220 一手）：per-round 位置
            // 重试上限 4；entry 选定为 PhaseSpider（isClass 精确类）→ 64。
            int maxSpawnAttempts = 4;
            if (abandonChunk[0]) {
                break;
            }
            int x = baseX;
            int y = baseY;
            int z = baseZ;
            for (int attempt = 0; attempt < maxSpawnAttempts; ++attempt) {
                if (abandonChunk[0]) {
                    break roundLoop;
                }
                x += w.rand.nextInt(6) - w.rand.nextInt(6);
                z += w.rand.nextInt(6) - w.rand.nextInt(6);
                // :162 geometry + landing-y correction (audit 16 A6 落点面,
                // 11 节段批五): close-branch floors, distances and the locate
                // all use the landing position from here on.
                double landing = canSpawnAtLocation(w, type, x, y, z);
                if (landing < 0.0D) {
                    continue;
                }
                cursor.setPos(x, MathHelper.floor(landing), z);
                if (!admitCandidate(w, cursor)) {
                    continue;
                }
                // audit 17 /2.4: R196 :190-195 — the suitable class is picked
                // on the round's first attempt past the distance gates, with
                // the WALKED coordinates (base y); null type breaks the round.
                if (entry == null) {
                    entry = ETIMSpawnTables.pickSpawn(w, type, new BlockPos(x, y, z));
                    if (entry == null) {
                        if (type == EnumCreatureType.CREATURE
                                && ETIMMoonState.phase(w) == ETIMMoonState.Phase.BLUE
                                && ETIMConfig.mobDebugLog
                                && blueAnimalPickLogBudget > 0) {
                            --blueAnimalPickLogBudget;
                            log(w, "blue-animal pickspawn-null at " + pos(cursor)
                                    + " ground=" + groundOf(w, cursor));
                        }
                        break;
                    }
                    // 三蜘蛛轮门3：R196 :216-220 — PhaseSpider 拿 64 次重试上限
                    // （其余类恒 4）；round-scoped，装载判行一次/round。
                    if (entry.entityClass == ETIMEntityPhaseSpider.class) {
                        maxSpawnAttempts = 64;
                        if (ETIMConfig.mobDebugLog) {
                            log(w, "phase-max-attempts 64 at " + pos(cursor));
                        }
                    }
                }
                if (!canSpawnHere(w, entry, cursor, type, abandonChunk)) {
                    if (abandonChunk[0]) {
                        break roundLoop;
                    }
                    continue;
                }
                Class<? extends EntityLiving> cls = entry.entityClass;
                // M6-01 (underworld 批 2026-10-25): R196 :202 — the substitute
                // face runs per spawned mob, before the instantiation; the
                // Longdead→Guardian half is live (1/6), the VampireBat half
                // has no ETIM carriers (C-5).
                cls = io.github.etim.etim.world.ETIMUnderworldSpawns.substituteClassToSpawn(w, cls);
                int bucket = cursor.getY() < 60 ? 0 : 1;
                EntityLiving mob;
                try {
                    mob = cls.getConstructor(World.class).newInstance(w);
                } catch (Exception e) {
                    continue;
                }
                mob.setLocationAndAngles(x + 0.5D, landing, z + 0.5D, w.rand.nextFloat() * 360.0F, 0.0F);
                if (mob.isNotColliding()) {
                    // A5 (audit 16): R196 :290 — finalize before entering the
                    // world; the returned data feeds the round's later spawns.
                    data = mob.onInitialSpawn(w.getDifficultyForLocation(cursor), data);
                    w.spawnEntity(mob);
                    landed.add(mob);
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "accept dim=" + w.provider.getDimension() + " " + cls.getSimpleName()
                                + " at " + pos(cursor) + " y-bucket=" + (bucket == 0 ? "under" : "over"));
                    }
                    // A4: R196 :293-297 — on slot exhaustion abandon the rest
                    // of this chunk and move to the next one.
                    if (++chunkCounts[bucket] >= getMaxSpawnedInChunk(w, entry)) {
                        // ❗B2-6（会话七终验回执）：the per-class cap break was
                        // silent — verdict line for the F-3 face (cap 1/6/8/2/4).
                        if (ETIMConfig.mobDebugLog) {
                            log(w, "cap-class " + cls.getSimpleName() + " at " + pos(cursor)
                                    + " count=" + chunkCounts[bucket] + " → abandon chunk");
                        }
                        break roundLoop;
                    }
                } else {
                    mob.setDead();
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "reject colliding " + cls.getSimpleName() + " at " + pos(cursor));
                    }
                }
            }
        }
        return landed.size();
    }

    /** ❗F3（第二批，面12:164）：R196 per-class chunk caps — ghast 1
     * (EntityGhast:202), horse 6 (EntityHorse:605), wolf 8 (EntityWolf:485),
     * creeper 2 (EntityCreeper:191; vanilla 1.12 has no override), everything
     * else 4 (the vanilla default). 表数据 A 级直引不配键（F-5-31 先例）. */
    private static int getMaxSpawnedInChunk(WorldServer w, Biome.SpawnListEntry entry) {
        Class<?> cls = entry.entityClass;
        if (cls == EntityGhast.class) {
            return 1;
        }
        // mob 批: R196 EntityRevenant :68-70 / EntityBoneLord :67-69 — cap 1.
        // underworld 批 (2026-10-25): the Ancient rides the same face
        // (M5-08 注 — R196 EntityBoneLord cap 1, Ancient 继承).
        if (cls == ETIMEntityRevenant.class || cls == ETIMEntityBoneLord.class
                || cls == ETIMEntityAncientBoneLord.class) {
            return 1;
        }
        if (cls == EntityHorse.class) {
            return 6;
        }
        if (cls == EntityWolf.class) {
            return 8;
        }
        if (cls == EntityCreeper.class) {
            return 2;
        }
        return 4;
    }

    /**
     * MITE admission chain for one candidate (audit 14 §4.2/:139-187):
     * dual-light close branch (24/8), the spawn-point distance gate
     * (sq >= 576 — same as vanilla), and the y=63 ice or-chain.
     */
    private static boolean admitCandidate(WorldServer w, BlockPos pos) {
        // Spawn point distance: sq >= 576 (24 blocks) — no exemptions.
        BlockPos sp = w.getSpawnPoint();
        double distSq = sp.distanceSq(pos.getX() + 0.5D, pos.getY(), pos.getZ() + 0.5D);
        if (distSq < 576.0D) {
            if (ETIMConfig.mobDebugLog) {
                log(w, "reject spawn-point-dist pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
            }
            return false;
        }
        // audit 17 /2.5: the y=63 ice or-chain moved up to the chunk-level
        // base point (R196 :142) — this site previously double-checked it at
        // attempt level on the wrong (landing-floor) y.
        // Close-branch: in the overworld/nether/underworld, a player within 24
        // with both light layers at 0 relaxes the radius to 8; otherwise the
        // standard no-player-within-24 gate. underworld 批 (2026-10-25,
        // M6-02): R196 :169-172 = (isOverworld ‖ isUnderworld) → dim 0‖-2
        // joins the set (the nether -1 rides the pre-existing face).
        EntityPlayer near = w.getClosestPlayer(pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D, 24.0D, false);
        if (near != null) {
            int dim = w.provider.getDimension();
            // A6 (audit 16 修正): R196 :169-172 checks the combined light of
            // BOTH layers floor(y) and floor(y)+1 (World:1387 → Chunk:1176
            // max-of-sky/block) — expanded here as the SKY+BLOCK pair per
            // layer. Landing-y correction is pending the 11 节段 geometry
            // slice; pos is the candidate floor until then.
            BlockPos upper = new BlockPos(pos.getX(), pos.getY() + 1, pos.getZ());
            if ((dim == 0 || dim == -1 || dim == -2) // M6-02 (underworld 批 2026-10-25)
                    && w.getLightFor(EnumSkyBlock.SKY, pos) == 0
                    && w.getLightFor(EnumSkyBlock.BLOCK, pos) == 0
                    && w.getLightFor(EnumSkyBlock.SKY, upper) == 0
                    && w.getLightFor(EnumSkyBlock.BLOCK, upper) == 0) {
                EntityPlayer close = w.getClosestPlayer(pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D, 8.0D,
                        false);
                if (close != null) {
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "reject close-player pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
                    }
                    return false;
                }
            } else {
                if (ETIMConfig.mobDebugLog) {
                    log(w, "reject player-near pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
                }
                return false;
            }
        }
        return true;
    }

    /**
     * Class-level spawn gates (audit 14 §4.2 getCanSpawnHere(true) band):
     * the vanilla difficulty/light body of EntityMob plus the MITE surface
     * ride-alongs — the undead-only daylight-outdoor skip (audit 16 A7), the
     * blue-moon eye-brightness binary reject (audit 16 A8) and the night
     * moon rejection rates.
     */
    private static boolean canSpawnHere(WorldServer w, Biome.SpawnListEntry entry, BlockPos pos, EnumCreatureType type,
            boolean[] abandonChunk) {
        // Difficulty + light + volume via a throwaway instance — the vanilla
        // getCanSpawnHere chain is the same R196 body. R196 :222 positions
        // the candidate before the walk gates, so the proto is meaningful at
        // the cursor (audit 16 A8 prerequisite; previously unlocated).
        EntityLiving proto;
        try {
            proto = entry.newInstance(w);
        } catch (Exception e) {
            return false;
        }
        proto.setLocationAndAngles(pos.getX() + 0.5D, pos.getY(), pos.getZ() + 0.5D, w.rand.nextFloat() * 360.0F, 0.0F);
        ETIMMoonState.Phase phase = ETIMMoonState.phase(w);
        boolean night = ETIMMoonState.isNight(w);
        // A8 (audit 16 修正): R196 :223-232 — on a blue-moon night a lit eye
        // position is an attempt-level reject, judged BEFORE the
        // getCanSpawnHere body and independent of the 1/54 denominator chain.
        // moon6 W2b 修正: the A8 face lives in the HOSTILE chain only
        // (trySpawningHostileMobs) — animals sharing this admission path must
        // not be lit-eye-eaten, or the blue animal season starves. Clock note:
        // A8's night reads the totalWorldTime clock (R196 cached
        // isBlueMoonNight flag semantics); /time set doesn't touch it
        // (R196-exact), and since sleep-01 sleep nights move both clocks
        // together (absolute alignment), the phase/night face holds across
        // sleep jumps too.
        if (type == EnumCreatureType.MONSTER && night && phase == ETIMMoonState.Phase.BLUE) {
            int eyeY = MathHelper.floor(proto.posY + proto.getEyeHeight());
            if (w.getLightFor(EnumSkyBlock.SKY, new BlockPos(pos.getX(), eyeY, pos.getZ())) > 0) {
                if (ETIMConfig.mobDebugLog) {
                    log(w, "reject blue-lit-eye " + entry.entityClass.getSimpleName());
                }
                proto.setDead();
                return false;
            }
        }
        // Blue-moon animal light-bypass (audit 18 verdict §2.2): arm the
        // EntityAnimal light-gate redirect only for CREATURE∧blue-phase
        // attempts. R196 :399 passes perform_light_check=false from the same
        // period bool the outer gate uses (night ∧ %400 ∧ blue) — here the
        // outer gate has already established the season, so phase+type is
        // the exact residual predicate. Unarmed calls are byte-identical.
        boolean blueAnimalSeason = phase == ETIMMoonState.Phase.BLUE
                && type == EnumCreatureType.CREATURE;
        if (blueAnimalSeason) {
            ETIMMoonState.setAnimalLightBypass(true);
        }
        boolean ok;
        try {
            ok = proto.getCanSpawnHere() && proto.isNotColliding();
        } finally {
            if (blueAnimalSeason) {
                ETIMMoonState.setAnimalLightBypass(false);
            }
        }
        proto.setDead();
        if (!ok && type == EnumCreatureType.CREATURE
                && phase == ETIMMoonState.Phase.BLUE
                && ETIMConfig.mobDebugLog
                && blueAnimalGateLogBudget > 0) {
            --blueAnimalGateLogBudget;
            log(w, "reject blue-animal-gate cls=" + entry.entityClass.getSimpleName()
                    + " ground=" + groundOf(w, pos)
                    + " eyeY=" + MathHelper.floor(pos.getY() + proto.getEyeHeight()));
        }
        if (!ok) {
            return false;
        }
        if (type == EnumCreatureType.MONSTER && proto instanceof EntityMob) {
            boolean outdoor = w.canSeeSky(pos);
            // R196 :267 is_daytime = the WORLDINFO clock (responds to /time
            // set and sleep jumps) — deliberately different from the A8
            // cached-flag clock above; the split is R196-exact (moon C17:
            // instance isDaytime vs 12 cached flags).
            if (w.isDaytime()) {
                // A7 (audit 16 定谳): R196 :267-273 — the daylight reject binds
                // to the undead outdoors face only, and it abandons the whole
                // chunk (continue label249 :272), not just the attempt.
                if (proto.isEntityUndead() && outdoor) {
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "reject day-outdoor " + entry.entityClass.getSimpleName());
                    }
                    abandonChunk[0] = true;
                    return false;
                }
            } else if (outdoor) {
                int denom = ETIMMoonState.nightRejectDenominator(phase);
                if (denom > 1 && w.rand.nextInt(denom) != 0) {
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "reject moon-night denom=1/" + denom + " cls=" + entry.entityClass.getSimpleName());
                    }
                    // ❗F-12-F1（audit20-12 R1，P0-10）：R196 SpawnerAnimals:276-281
                    // continue label249——夜相拒绝弃整 chunk 剩余 3×4 掷，
                    // 不是 attempt 级 return false（attempt 级 ⇒ 单 chunk 通过率
                    // 1−(1−1/denom)¹² ≈ 99.2%，夜怪密度放大 3-10×）。
                    abandonChunk[0] = true;
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * AI-01 (mobs-ai verdict 裁 1): the R196 :395 canCreatureTypeSpawnAtLocation
     * face for the mobwake spawn fallback — landing-y admission for one
     * sampled position; {@code < 0.0} rejects the attempt.
     */
    public static double spawnLandingY(WorldServer w, EnumCreatureType type, int x, int y, int z) {
        return canSpawnAtLocation(w, type, x, y, z);
    }

    /**
     * AI-01 (mobs-ai verdict 裁 1): R196 :404-414 — instantiate the picked
     * entry, place it at the landing y (R196 :412 resulting_y_pos face) and
     * run the admission proto chain ({@code getCanSpawnHere(false)} parity:
     * the private {@code canSpawnHere} body carries the vanilla chain plus
     * the MITE ride-alongs and includes the collision face). Returns the
     * positioned but UNSPAWNED mob, or null — the caller owns the A3 hatch
     * gate (R196 :565-568). The abandonChunk side effect of the chunked
     * spawner does not apply to a single-position attempt.
     */
    public static EntityLiving admitMonster(WorldServer w, Biome.SpawnListEntry entry, BlockPos pos,
            double landingY, EnumCreatureType type) {
        EntityLiving mob;
        try {
            mob = entry.newInstance(w);
        } catch (Exception e) {
            return null;
        }
        mob.setLocationAndAngles(pos.getX() + 0.5D, landingY, pos.getZ() + 0.5D, w.rand.nextFloat() * 360.0F, 0.0F);
        if (!canSpawnHere(w, entry, pos, type, new boolean[1])) {
            return null;
        }
        return mob;
    }

    // ------------------------------------------------------------------
    // landing geometry (audit 16 A6 伴随 · 11/10 节段批五移植)

    private static final double REJECT = -1.0D;

    /**
     * R196 :525-579 — geometric skeleton + landing y. Return value: the
     * landing y (topmost face of the standing surface, fractional), or
     * {@link #REJECT} when the location cannot host the type.
     */
    private static double canSpawnAtLocation(WorldServer w, EnumCreatureType type, int x, int y, int z) {
        if (y < 1) {
            return REJECT;
        }
        IBlockState state = w.getBlockState(new BlockPos(x, y, z));
        // isAlwaysSolidStandardFormCube ≈ 1.12 always-normal-cube.
        if (state.isBlockNormalCube()) {
            return REJECT;
        }
        Material mat = state.getMaterial();
        if (mat == Material.LAVA) {
            return REJECT;
        }
        if (type == EnumCreatureType.WATER_CREATURE) {
            // :546-547 — must be IN water with water below.
            return (mat == Material.WATER
                    && w.getBlockState(new BlockPos(x, y - 1, z)).getMaterial() == Material.WATER)
                    ? (double) y : REJECT;
        }
        if (type == EnumCreatureType.AMBIENT) {
            return mat == Material.AIR ? (double) y : REJECT;
        }
        if (!state.isBlockNormalCube() && state.getBlock() != Blocks.SNOW_LAYER
                && state.getBlock() != Blocks.WATERLILY) {
            // :554-566 — candidate cell is airy: the standing surface is the
            // block below (solid-ish / snow / lily).
            BlockPos belowPos = new BlockPos(x, y - 1, z);
            IBlockState belowState = w.getBlockState(belowPos);
            if (belowState.isBlockNormalCube() || belowState.getBlock() == Blocks.SNOW_LAYER
                    || belowState.getBlock() == Blocks.WATERLILY) {
                double top = belowState.getBlock().getBoundingBox(belowState, w, belowPos).maxY;
                return canSpawnOn(type, belowState) ? (y - 1) + top + 0.005D : REJECT;
            }
            return REJECT;
        }
        // :568-576 — the candidate cell holds the standing surface itself
        // (slab/stairs/snow/lily tops).
        BlockPos pos = new BlockPos(x, y, z);
        double top = state.getBlock().getBoundingBox(state, w, pos).maxY;
        if (state.getBlock() == Blocks.SNOW_LAYER) {
            // snow qualifies through whatever ground is under the layer
            IBlockState belowState = w.getBlockState(new BlockPos(x, y - 1, z));
            return canSpawnOn(type, belowState) ? (double) y + top + 0.005D : REJECT;
        }
        return canSpawnOn(type, state) ? (double) y + top + 0.005D : REJECT;
    }

    /**
     * R196 :500-524 — surface qualification table (10 节段). metadata lives
     * in the state; {@code isTopFlatAndSolid} resolves to the standard-form
     * cube test (Block.java:1750-1781 → 1.12 isBlockNormalCube).
     */
    private static boolean canSpawnOn(EnumCreatureType type, IBlockState state) {
        if (type == EnumCreatureType.AMBIENT) {
            return true;
        }
        Block block = state.getBlock();
        if (block == Blocks.AIR) {
            return false;
        }
        if (type == EnumCreatureType.WATER_CREATURE) {
            return state.getMaterial() == Material.WATER;
        }
        if (block == Blocks.BEDROCK || block == Blocks.MYCELIUM || block instanceof BlockHugeMushroom) {
            return false;
        }
        if (type == EnumCreatureType.CREATURE) {
            if (ETIMConfig.mobDebugLog && blueAnimalLandLogBudget > 0
                    && block != Blocks.GRASS) {
                --blueAnimalLandLogBudget;
                ETIM.LOGGER.info("[SpawnLog] blue-animal landface ground=" + block.getRegistryName());
            }
            return block == Blocks.GRASS;
        }
        return block == Blocks.SNOW_LAYER
                || block == Blocks.WATERLILY
                || block instanceof BlockSlab
                || block instanceof BlockStairs
                || state.isBlockNormalCube();
    }

    // ------------------------------------------------------------------
    // counting

    private static int[] countMonstersByHeight(WorldServer w) {
        int under = 0;
        int over = 0;
        // Count only the IMob layer: livestock/animals live outside the
        // monster cap and were inflating the bucket counter, hard-locking
        // every surface pass at the cap (boot 20:30 evidence).
        for (net.minecraft.entity.Entity e : w.loadedEntityList) {
            if (e instanceof net.minecraft.entity.monster.IMob && e.isEntityAlive()) {
                if (e.posY < 60.0D) {
                    ++under;
                } else {
                    ++over;
                }
            }
        }
        return new int[] { under, over };
    }

    private static int countOfType(WorldServer w, EnumCreatureType type) {
        int n = 0;
        for (net.minecraft.entity.Entity e : w.loadedEntityList) {
            if (type.getCreatureClass().isAssignableFrom(e.getClass())) {
                ++n;
            }
        }
        return n;
    }

    private static void log(WorldServer w, String row) {
        ETIM.LOGGER.info("[SpawnLog] " + row);
    }

    private static String pos(BlockPos p) {
        return "(" + p.getX() + "," + p.getY() + "," + p.getZ() + ")";
    }

    private static String groundOf(WorldServer w, BlockPos p) {
        return String.valueOf(w.getBlockState(p.down()).getBlock().getRegistryName());
    }

    // Instrument budgets for the blue-animal season faces (§9: the admission
    // chain between the season gate and accept is otherwise silent — the
    // %400 pass proves the gate fires, so a zero-accept window cannot tell
    // pickspawn-null apart from a ground-gate failure). Rows are capped per
    // %400 pass and the budgets are reset in trySpawningPeacefulMobs.
    private static int blueAnimalGateLogBudget = 0;
    private static int blueAnimalPickLogBudget = 0;
    private static int blueAnimalLandLogBudget = 0;
    // audit19 #5: per-build budget reset in collectEligibleChunks.
    private static int densitySkipLogBudget = 0;
    // audit19-W3 (甲): edge-dedupe signature for the density-eval row.
    private static String lastDensityEvalSig = "";
    // M6-04: the flat 0.25F row budget (per-tick face, no state edge to dedup on).
    private static int modifier25LogBudget = 4;

    private ETIMSpawnCycle() {
    }
}
