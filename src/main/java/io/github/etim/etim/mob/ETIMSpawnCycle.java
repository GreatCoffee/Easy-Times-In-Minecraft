package io.github.etim.etim.mob;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.google.common.collect.Sets;

import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EnumCreatureType;
import net.minecraft.entity.monster.EntityMob;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;import net.minecraft.world.EnumSkyBlock;import net.minecraft.util.math.ChunkPos;
import net.minecraft.util.math.MathHelper;
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
 * <p>All [SpawnLog] rows run behind the {@code mobDebugLog} gate.</p>
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
            return 0.25F;
        }
        float mod = 1.0F;
        if (st.decreased > 0) {
            st.decreased--;
            mod *= 0.5F;
        } else if (w.rand.nextInt(24000) == 0) {
            st.decreased = w.rand.nextInt(4000) + 1;
        }
        if (st.increased > 0) {
            st.increased--;
            mod *= 2.0F;
        } else if (w.rand.nextInt(24000) == 0) {
            st.increased = w.rand.nextInt(2000);
        }
        if (st.noSpawn > 0) {
            st.noSpawn--;
            mod = 0.0F;
        } else if (w.rand.nextInt(24000) == 0) {
            st.noSpawn = w.rand.nextInt(2000) + w.rand.nextInt(2000);
        }
        // Rescue gate (:1499-1512): only "reduced" mods are restored; an
        // active x2 stands even under a blood moon / thunderstorm.
        if (mod < 1.0F && ETIMMoonState.rescueGate(w, w.isThundering())) {
            mod = 1.0F;
        }
        if (ETIMConfig.mobDebugLog && (st.decreased > 0 || st.increased > 0 || st.noSpawn > 0 || mod != 1.0F)) {
            log(w, "modifier mod=" + mod + " d=" + st.decreased + " i=" + st.increased + " n=" + st.noSpawn);
        }
        return mod;
    }

    // ------------------------------------------------------------------
    // eligible chunks (same layout as vanilla; edge ring count-only)

    private static int collectEligibleChunks(WorldServer w, State st, boolean countOnlyForLog) {
        st.eligible.clear();
        int count = 0;
        for (EntityPlayer p : w.playerEntities) {
            if (p.isSpectator()) {
                continue;
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

    // ------------------------------------------------------------------
    // hostile pass (audit 14 §4.2, trySpawningHostileMobs :102-311)

    private static int trySpawningHostileMobs(WorldServer w, State st, boolean deep) {
        int chunkCount = collectEligibleChunks(w, st, false);
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
        if (ETIMMoonState.blueMoonAnimalPeriod(ETIMMoonState.phase(w))) {
            spawned += runPeaceful(w, st, EnumCreatureType.CREATURE, chunkCount);
        }
        return spawned;
    }

    private static int runPeaceful(WorldServer w, State st, EnumCreatureType type, int chunkCount) {
        int cap = capOf(type) * chunkCount / MOB_COUNT_DIV;
        int count = countOfType(w, type);
        if (count >= cap) {
            if (ETIMConfig.mobDebugLog) {
                log(w, "cap-block type=" + type + " count=" + count + " limit=" + cap);
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
        // Per-class spawned counters, split y<60 / y>=60 (audit 14 §4.6).
        Map<Class<? extends EntityLiving>, int[]> perClass = new HashMap<>();

        for (ChunkPos chunkpos : shuffled) {
            if (spawnedTotal >= budget) {
                break;
            }
            // Pick a random y anywhere in the column (R196 :134-137), reroll
            // for the deep pass until below 60.
            int x = chunkpos.x * 16 + w.rand.nextInt(16);
            int z = chunkpos.z * 16 + w.rand.nextInt(16);
            int top = topFilledSegmentPlus16(w, x, z);
            int y = w.rand.nextInt(Math.max(top, 1)) + 1;
            if (deepOnly) {
                if (y >= 60) {
                    // Deep-only reroll: surface candidates are dropped, the
                    // attempt count stays consumed (R196 recycles silently).
                    continue;
                }
            }
            probe.setPos(x, y, z);
            if (w.getBlockState(probe).isBlockNormalCube()) {
                continue;
            }
            Biome.SpawnListEntry entry = ETIMSpawnTables.pickSpawn(w, type, probe);
            if (entry == null) {
                continue;
            }
            List<EntityLiving> pack = spawnPack(w, cursor, type, entry, perClass, deepOnly);
            spawnedTotal += pack.size();
        }
        return spawnedTotal;
    }

    private static int topFilledSegmentPlus16(WorldServer w, int x, int z) {
        net.minecraft.world.chunk.Chunk chunk = w.getChunk(x >> 4, z >> 4);
        return chunk.getTopFilledSegment() + 16;
    }

    /**
     * MITE group structure (audit 14 §4.2): 3 rounds × per-candidate up to 4
     * walks of ±6 (phase spider widens to 64 — class absent here, gap list).
     */
    private static List<EntityLiving> spawnPack(WorldServer w, BlockPos.MutableBlockPos cursor, EnumCreatureType type,
            Biome.SpawnListEntry entry, Map<Class<? extends EntityLiving>, int[]> perClass, boolean deepOnly) {
        List<EntityLiving> landed = new ArrayList<>();
        int baseX = cursor.getX();
        int baseY = cursor.getY();
        int baseZ = cursor.getZ();
        for (int round = 0; round < 3; ++round) {
            int x = baseX;
            int y = baseY;
            int z = baseZ;
            for (int attempt = 0; attempt < 4; ++attempt) {
                x += w.rand.nextInt(6) - w.rand.nextInt(6);
                z += w.rand.nextInt(6) - w.rand.nextInt(6);
                cursor.setPos(x, y, z);
                if (!admitCandidate(w, cursor, deepOnly)) {
                    continue;
                }
                if (!canSpawnHere(w, entry, cursor, type)) {
                    continue;
                }
                Class<? extends EntityLiving> cls = entry.entityClass;
                int[] buckets = perClass.computeIfAbsent(cls, (k) -> new int[2]);
                int bucket = cursor.getY() < 60 ? 0 : 1;
                if (buckets[bucket] >= getMaxSpawnedInChunk(w, entry)) {
                    continue;
                }
                EntityLiving mob;
                try {
                    mob = entry.newInstance(w);
                } catch (Exception e) {
                    continue;
                }
                mob.setLocationAndAngles(x + 0.5D, cursor.getY(), z + 0.5D, w.rand.nextFloat() * 360.0F, 0.0F);
                if (mob.isNotColliding()) {
                    buckets[bucket]++;
                    w.spawnEntity(mob);
                    landed.add(mob);
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "accept " + cls.getSimpleName() + " at " + pos(cursor) + " y-bucket=" + (bucket == 0 ? "under" : "over"));
                    }
                } else {
                    mob.setDead();
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "reject colliding " + cls.getSimpleName() + " at " + pos(cursor));
                    }
                }
            }
        }
        return landed;
    }

    private static int getMaxSpawnedInChunk(WorldServer w, Biome.SpawnListEntry entry) {
        return 4; // vanilla default; per-class overrides land with their classes
    }

    /**
     * MITE admission chain for one candidate (audit 14 §4.2/:139-187):
     * dual-light close branch (24/8), the spawn-point distance gate
     * (sq >= 576 — same as vanilla), and the y=63 ice or-chain.
     */
    private static boolean admitCandidate(WorldServer w, BlockPos pos, boolean deepOnly) {
        // Spawn point distance: sq >= 576 (24 blocks) — no exemptions.
        BlockPos sp = w.getSpawnPoint();
        double distSq = sp.distanceSq(pos.getX() + 0.5D, pos.getY(), pos.getZ() + 0.5D);
        if (distSq < 576.0D) {
            if (ETIMConfig.mobDebugLog) {
                log(w, "reject spawn-point-dist pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
            }
            return false;
        }
        // y=63 ice floor 1/4 or-chain: reject only when y==63 AND on ice AND
        // the quarter roll missed.
        if (pos.getY() == 63) {
            IBlockState below = w.getBlockState(new BlockPos(pos.getX(), pos.getY() - 1, pos.getZ()));
            if (below.getBlock() == Blocks.ICE && w.rand.nextInt(4) != 0) {
                return false;
            }
        }
        // Close-branch: in the overworld/nether, a player within 24 with both
        // light layers at 0 relaxes the radius to 8; otherwise the standard
        // no-player-within-24 gate.
        EntityPlayer near = w.getClosestPlayer(pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D, 24.0D, false);
        if (near != null) {
            int dim = w.provider.getDimension();
            if ((dim == 0 || dim == -1)
                    && w.getLightFor(EnumSkyBlock.SKY, pos) == 0
                    && w.getLightFor(EnumSkyBlock.BLOCK, pos) == 0) {
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
     * ride-alongs — day+undead-outdoor skip and the night moon rejection.
     */
    private static boolean canSpawnHere(WorldServer w, Biome.SpawnListEntry entry, BlockPos pos, EnumCreatureType type) {
        // Difficulty + light + volume via a throwaway instance — the vanilla
        // getCanSpawnHere chain is the same R196 body.
        EntityLiving proto;
        try {
            proto = entry.newInstance(w);
        } catch (Exception e) {
            return false;
        }
        boolean ok = proto.getCanSpawnHere() && proto.isNotColliding();
        ((EntityLiving) proto).setDead();
        if (!ok) {
            return false;
        }
        if (type == EnumCreatureType.MONSTER && proto instanceof EntityMob) {
            boolean outdoor = w.canSeeSky(pos);
            if (outdoor) {
                if (w.isDaytime()) {
                    // Day + outdoor mob: vanilla light math already blocks
                    // most, R196 adds the explicit skip.
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "reject day-outdoor " + entry.entityClass.getSimpleName());
                    }
                    return false;
                }
                int denom = ETIMMoonState.nightRejectDenominator(ETIMMoonState.phase(w));
                if (denom > 1 && w.rand.nextInt(denom) != 0) {
                    if (ETIMConfig.mobDebugLog) {
                        log(w, "reject moon-night denom=1/" + denom + " cls=" + entry.entityClass.getSimpleName());
                    }
                    return false;
                }
            }
        }
        return true;
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

    private ETIMSpawnCycle() {
    }
}
