package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mixins.EntityLivingBaseAccessor;
import net.minecraft.block.Block;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EnumCreatureType;
import net.minecraft.entity.IEntityLivingData;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.entity.passive.EntityHorse;
import net.minecraft.entity.passive.EntityWaterMob;
import net.minecraft.entity.passive.EntityWolf;
import net.minecraft.util.WeightedRandom;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraft.world.biome.Biome;
import net.minecraft.world.chunk.Chunk;

import java.util.List;
import java.util.Random;

/**
 * B-54 — R196 {@code SpawnerAnimals.performWorldGenSpawning} (SpawnerAnimals.java:580-684)
 * transposed. Runs once per populated chunk, twice per call (animal then
 * aquatic, sharing the chunk generator's random), and fills in the faces the
 * 1.12 {@link net.minecraft.world.WorldEntitySpawner#performWorldGenSpawning}
 * dropped: the freezing-biome 0.05 chance, the horse 0.8 / wolf 0.5 group
 * rolls, the per-chunk animal cap of 4 (persisted as {@code animals_spawned}),
 * the aquatic y correction, the R196 top-surface semantics (face+1 vs the
 * 1.12 block-itself), the headroom cube pass, onSpawnWithEgg-before-entry and
 * the aquatic -9600 counter seed.
 *
 * <p>Deliberately NOT inherited: Forge {@code canEntitySpawn} (R196 has no
 * such face, same policy as {@link ETIMSpawnCycle}); the caller's
 * {@code TerrainGen.populate(ANIMALS)} gate stays in force because the mixin
 * only replaces the method body after that gate passed.</p>
 */
public final class ETIMWorldGenSpawning {

    /** R196 has no cap; 0.05/0.1 chance makes it unreachable in practice. Safety valve only (D-10). */
    private static final int MAX_GROUPS = 64;
    private static final int ATTEMPTS = 4;
    private static final int ANIMAL_CHUNK_CAP = 4;

    /** Per-call tallies. The verdict probes read them; the mixin ignores the return value. */
    public static final class Stats {
        public int creatureSpawned;
        public int aquaticSpawned;
        public int horsePicks;
        public int horseRejects;
        public int wolfPicks;
        public int wolfRejects;
        public int groups;
        public int landRejects;
        public int capRejects;
        public int headroomPrevented;
        public int instanceFails;
        public int aquaticSeeds;
        public int creatureGroups;
        public int aquaticGroups;

        public void add(Stats other) {
            creatureSpawned += other.creatureSpawned;
            aquaticSpawned += other.aquaticSpawned;
            horsePicks += other.horsePicks;
            horseRejects += other.horseRejects;
            wolfPicks += other.wolfPicks;
            wolfRejects += other.wolfRejects;
            groups += other.groups;
            landRejects += other.landRejects;
            capRejects += other.capRejects;
            headroomPrevented += other.headroomPrevented;
            instanceFails += other.instanceFails;
            aquaticSeeds += other.aquaticSeeds;
            creatureGroups += other.creatureGroups;
            aquaticGroups += other.aquaticGroups;
        }
    }

    public static Stats perform(World world, Biome biome, int centerX, int centerZ,
            int diameterX, int diameterZ, Random rand) {
        return perform(world, biome, centerX, centerZ, diameterX, diameterZ, rand, true);
    }

    /**
     * @param verbose when false only the caller's aggregate row is written, so a
     *                bulk verdict probe does not flood the log with per-row lines.
     */
    public static Stats perform(World world, Biome biome, int centerX, int centerZ,
            int diameterX, int diameterZ, Random rand, boolean verbose) {
        Stats stats = new Stats();
        if (!(world instanceof WorldServer)) {
            return stats;
        }
        WorldServer w = (WorldServer) world;
        float chance = biome.getDefaultTemperature() <= 0.15F ? 0.05F : 0.1F;
        performType(w, biome, EnumCreatureType.CREATURE, chance,
                centerX, centerZ, diameterX, diameterZ, rand, stats, verbose);
        performType(w, biome, EnumCreatureType.WATER_CREATURE, chance,
                centerX, centerZ, diameterX, diameterZ, rand, stats, verbose);
        log(verbose, "pass biome={} chunk=({},{}) chance={} creature_spawned={} aquatic_spawned={}",
                biome.getRegistryName(), centerX >> 4, centerZ >> 4, chance,
                stats.creatureSpawned, stats.aquaticSpawned);
        return stats;
    }

    private static void performType(WorldServer w, Biome biome, EnumCreatureType type, float chance,
            int centerX, int centerZ, int diameterX, int diameterZ, Random rand,
            Stats stats, boolean verbose) {
        List<Biome.SpawnListEntry> list = ETIMSpawnTables.worldGenList(biome, type);
        if (list.isEmpty()) {
            return;
        }
        boolean aquaticType = type == EnumCreatureType.WATER_CREATURE;
        int groups = 0;
        while (rand.nextFloat() < chance) {
            if (++groups > MAX_GROUPS) {
                log(verbose, "cap-groups type={} n={}", type, groups);
                break;
            }
            Biome.SpawnListEntry entry = WeightedRandom.getRandomItem(w.rand, list);
            if (entry == null) {
                break;
            }
            String cls = entry.entityClass.getSimpleName();
            // R196 :587-589 — the two group-level rolls; no other class draws here.
            // Horse passes only when the roll is >= 0.8 (20%), wolf only when >= 0.5 (50%).
            if (entry.entityClass == EntityHorse.class) {
                ++stats.horsePicks;
                if (rand.nextFloat() < 0.8F) {
                    ++stats.horseRejects;
                    log(verbose, "reject horse-dice type={}", type);
                    continue;
                }
            }
            if (entry.entityClass == EntityWolf.class) {
                ++stats.wolfPicks;
                if (rand.nextFloat() < 0.5F) {
                    ++stats.wolfRejects;
                    log(verbose, "reject wolf-dice type={}", type);
                    continue;
                }
            }

            ++stats.groups;
            if (aquaticType) {
                ++stats.aquaticGroups;
            } else {
                ++stats.creatureGroups;
            }
            int groupSize = entry.minGroupCount
                    + rand.nextInt(1 + entry.maxGroupCount - entry.minGroupCount);
            int x = centerX + rand.nextInt(diameterX);
            int z = centerZ + rand.nextInt(diameterZ);
            int startX = x;
            int startZ = z;
            // R196 :596-604 — EntityAnimal anywhere on the superclass chain, hellhound excluded.
            boolean isAnimal = EntityAnimal.class.isAssignableFrom(entry.entityClass);
            log(verbose, "pick type={} cls={} size={} x={} z={} animal={}", type, cls, groupSize, x, z, isAnimal);

            IEntityLivingData data = null;
            for (int i = 0; i < groupSize; i++) {
                boolean success = false;
                for (int attempt = 0; !success && attempt < ATTEMPTS; attempt++) {
                    int y = r196TopY(w, x, z);
                    if (aquaticType
                            && w.getBlockState(new BlockPos(x, y, z)).getMaterial() == Material.WATER) {
                        int surface = r196TopWaterY(w, x, z);
                        if (surface - y > 3) {
                            // R196 :612-618 — [y+2, surface-2].
                            y = rand.nextInt(surface - y - 3) + y + 2;
                        }
                    }
                    double landing = ETIMSpawnCycle.spawnLandingY(w, type, x, y, z);
                    if (landing < 0.0D) {
                        ++stats.landRejects;
                        log(verbose, "reject land type={} cls={} pos=({},{},{})", type, cls, x, y, z);
                        // fall through to the jitter — R196 also retries a rejected attempt.
                    } else {
                        Chunk chunk = w.getChunk(x >> 4, z >> 4);
                        ETIMAnimalsSpawnedDuck duck = (ETIMAnimalsSpawnedDuck) chunk;
                        if (isAnimal && duck.etim$getAnimalsSpawned() >= ANIMAL_CHUNK_CAP) {
                            // R196 :622-629 — the continue skips the jitter below, on purpose.
                            ++stats.capRejects;
                            log(verbose, "reject animal-cap type={} cls={} chunk=({},{}) n={}", type, cls,
                                    x >> 4, z >> 4, ANIMAL_CHUNK_CAP);
                            continue;
                        }
                        if (isAnimal) {
                            duck.etim$incAnimalsSpawned();
                        }
                        EntityLiving mob;
                        try {
                            mob = entry.newInstance(w);
                        } catch (Exception e) {
                            // 1.12 vanilla catches and skips the remainder of this attempt.
                            ++stats.instanceFails;
                            log(verbose, "reject instance cls={} err={}", cls, e.getClass().getSimpleName());
                            continue;
                        }
                        boolean prevented = false;
                        int blocksHigh = (int) mob.height + 1;
                        for (int dy = 1; dy < blocksHigh; dy++) {
                            if (isSolidStandardFormCube(w.getBlockState(new BlockPos(x, y + dy, z)))) {
                                prevented = true;
                                ++stats.headroomPrevented;
                                log(verbose, "prevent headroom type={} cls={} pos=({},{},{}) dy={}", type, cls, x, y, z, dy);
                                break;
                            }
                        }
                        if (!prevented) {
                            mob.setLocationAndAngles(x + 0.5D, landing, z + 0.5D,
                                    rand.nextFloat() * 360.0F, 0.0F);
                            // R196 :658-667 — egg data before entry, chain inherited inside the group.
                            data = mob.onInitialSpawn(w.getDifficultyForLocation(new BlockPos(mob)), data);
                            w.spawnEntity(mob);
                            success = true;
                            if (aquaticType) {
                                ++stats.aquaticSpawned;
                            } else {
                                ++stats.creatureSpawned;
                            }
                            if (mob instanceof EntityWaterMob) {
                                // R196 refreshDespawnCounter(-9600).
                                ((EntityLivingBaseAccessor) mob).etim$setIdleTime(-9600);
                                ++stats.aquaticSeeds;
                                log(verbose, "seed aquatic idle=-9600 cls={}", cls);
                            }
                            log(verbose, "spawn type={} cls={} pos=({},{},{}) y={} animals={}", type, cls, x, y, z,
                                    landing, isAnimal ? duck.etim$getAnimalsSpawned() : -1);
                        }
                    }
                    x += rand.nextInt(5) - rand.nextInt(5);
                    // R196 :670-677 — the z bound really uses diameterX; vanilla 1.12 keeps the same bug.
                    for (z += rand.nextInt(5) - rand.nextInt(5);
                            x < centerX || x >= centerX + diameterX
                                    || z < centerZ || z >= centerZ + diameterX;
                            z = startZ + rand.nextInt(5) - rand.nextInt(5)) {
                        x = startX + rand.nextInt(5) - rand.nextInt(5);
                    }
                }
            }
        }
    }

    /** R196 {@code World.getTopSolidOrLiquidBlock}: topmost solid non-leaf block, returns face+1. */
    private static int r196TopY(World w, int x, int z) {
        Chunk chunk = w.getChunk(x >> 4, z >> 4);
        int top = Math.min(chunk.getTopFilledSegment() + 15, w.getHeight() - 1);
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (int y = top; y > 0; y--) {
            Material mat = chunk.getBlockState(pos.setPos(x, y, z)).getMaterial();
            if (mat != Material.LEAVES && mat.isSolid()) {
                return y + 1;
            }
        }
        return -1;
    }

    /** R196 {@code World.getTopSolidOrLiquidBlockMITE(x,z,true)}: includes liquids, returns the block's own y. */
    private static int r196TopWaterY(World w, int x, int z) {
        Chunk chunk = w.getChunk(x >> 4, z >> 4);
        int top = Math.min(chunk.getTopFilledSegment() + 15, w.getHeight() - 1);
        BlockPos.MutableBlockPos pos = new BlockPos.MutableBlockPos();
        for (int y = top; y > 0; y--) {
            IBlockState state = chunk.getBlockState(pos.setPos(x, y, z));
            Material mat = state.getMaterial();
            if (mat != Material.LEAVES && (mat.isSolid() || mat.isLiquid())) {
                return y;
            }
        }
        return -1;
    }

    /**
     * B-56 (census C-B54-3): exact carrier for R196
     * {@code World.isBlockSolidStandardFormCube} (World.java:3266-3271 →
     * {@code Block.java:1780}: always-solid standard cube, else
     * {@code isSolid(metadata) && isStandardFormCube(metadata)}).
     * <p>1.12's {@code isFullCube} already excludes slabs, stairs, snow layers,
     * farmland, cactus, chests and other overridden blocks (R196 overrides the
     * same set to non-standard). The one remaining gap is the glass block: 1.12
     * reports {@code isFullCube()==false} while R196 keeps the default standard
     * cube, so the two full glass blocks are named explicitly. Panes, beacons
     * and every other {@code Material.GLASS} block stay non-standard, matching
     * R196's {@code isStandardFormCube} overrides.
     */
    public static boolean isSolidStandardFormCube(IBlockState state) {
        Material mat = state.getMaterial();
        if (!mat.blocksMovement()) {
            return false;
        }
        if (state.isFullCube()) {
            return true;
        }
        Block block = state.getBlock();
        return block == Blocks.GLASS || block == Blocks.STAINED_GLASS;
    }

    private static void log(boolean verbose, String format, Object... args) {
        if (verbose && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[WorldGenSpawnLog] " + format, args);
        }
    }

    private ETIMWorldGenSpawning() {
    }
}
