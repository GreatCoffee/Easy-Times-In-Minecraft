package io.github.etim.etim.mob;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EnumCreatureType;
import net.minecraft.entity.monster.EntityCaveSpider;
import net.minecraft.entity.monster.EntityCreeper;
import net.minecraft.entity.monster.EntityEnderman;
import net.minecraft.entity.monster.EntityGhast;
import net.minecraft.entity.monster.EntityMagmaCube;
import net.minecraft.entity.monster.EntityPigZombie;
import net.minecraft.entity.monster.EntitySkeleton;
import net.minecraft.entity.monster.EntitySlime;
import net.minecraft.entity.monster.EntitySpider;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.entity.passive.EntityBat;
import net.minecraft.entity.passive.EntityChicken;
import net.minecraft.entity.passive.EntityCow;
import net.minecraft.entity.passive.EntityHorse;
import net.minecraft.entity.passive.EntityOcelot;
import net.minecraft.entity.passive.EntityPig;
import net.minecraft.entity.passive.EntitySheep;
import net.minecraft.entity.passive.EntityWolf;
import net.minecraft.entity.passive.EntitySquid;
import net.minecraft.util.WeightedRandom;
import net.minecraft.util.math.BlockPos;
import net.minecraft.init.Biomes;
import net.minecraft.world.WorldServer;
import net.minecraft.world.biome.Biome;

/**
 * R196 biome spawnable tables (audit 14 §3 — BiomeGenBase :141-186 base +
 * :3.2 biome overrides), filtered to entity classes ETIM currently has.
 *
 * <p>MITE-exclusive classes (ghoul, wight, invisibleStalker, demonSpider,
 * hellhound, woodSpider, shadow, revenant, earthElemental, jelly, blob, ooze,
 * pudding, clayGolem, boneLord, phaseSpider, vampireBat, nightwing, direWolf,
 * blackWidowSpider, infernal creeper variant, guardians) have no 1.12 entity
 * yet — their weight rows stay in the gap list (audit 14 §3.1/§3.2) and are
 * filled back in when each class lands. Class-fine rules that survive the
 * filter here: the ghast 48² dedup; the slime structure rule rides on the
 * vanilla slime {@code getCanSpawnHere} body.</p>
 */
public final class ETIMSpawnTables {

    private static final Map<EnumCreatureType, List<Biome.SpawnListEntry>> BASE = new EnumMap<>(EnumCreatureType.class);
    private static final Map<Biome, Map<EnumCreatureType, List<Biome.SpawnListEntry>>> OVERRIDES = new HashMap<>();

    private static final Biome[] SNOWY = { Biomes.ICE_PLAINS, Biomes.ICE_MOUNTAINS, Biomes.FROZEN_RIVER,
            Biomes.COLD_BEACH, Biomes.MUTATED_ICE_FLATS };
    private static final Biome[] TAIGA = { Biomes.TAIGA, Biomes.TAIGA_HILLS, Biomes.COLD_TAIGA,
            Biomes.COLD_TAIGA_HILLS, Biomes.MUTATED_TAIGA, Biomes.MUTATED_TAIGA_COLD };
    private static final Biome[] FOREST = { Biomes.FOREST, Biomes.FOREST_HILLS, Biomes.MUTATED_FOREST,
            Biomes.ROOFED_FOREST };
    private static final Biome[] CLEAR_CREATURE = { Biomes.DESERT, Biomes.DESERT_HILLS, Biomes.MUTATED_DESERT,
            Biomes.BEACH, Biomes.OCEAN, Biomes.DEEP_OCEAN, Biomes.FROZEN_OCEAN, Biomes.RIVER,
            Biomes.MUSHROOM_ISLAND, Biomes.MUSHROOM_ISLAND_SHORE };
    private static final Biome[] ALL_CLEAR = { Biomes.MUSHROOM_ISLAND, Biomes.MUSHROOM_ISLAND_SHORE };

    static {
        List<Biome.SpawnListEntry> creature = new ArrayList<>();
        creature.add(entry(EntitySheep.class, 10, 1, 1));
        creature.add(entry(EntityPig.class, 10, 1, 1));
        creature.add(entry(EntityChicken.class, 10, 1, 1));
        creature.add(entry(EntityCow.class, 10, 1, 1));
        BASE.put(EnumCreatureType.CREATURE, creature);

        List<Biome.SpawnListEntry> monster = new ArrayList<>();
        monster.add(entry(EntitySpider.class, 80, 1, 2));
        monster.add(entry(EntityZombie.class, 100, 1, 4));
        monster.add(entry(EntitySkeleton.class, 100, 1, 4));
        monster.add(entry(EntityCreeper.class, 100, 1, 2));
        monster.add(entry(EntitySlime.class, 100, 1, 4));
        monster.add(entry(EntityEnderman.class, 10, 1, 4));
        BASE.put(EnumCreatureType.MONSTER, monster);

        List<Biome.SpawnListEntry> water = new ArrayList<>();
        water.add(entry(EntitySquid.class, 10, 4, 4));
        BASE.put(EnumCreatureType.WATER_CREATURE, water);

        List<Biome.SpawnListEntry> cave = new ArrayList<>();
        cave.add(entry(EntityBat.class, 100, 8, 8));
        BASE.put(EnumCreatureType.AMBIENT, cave);
    }

    private static Biome.SpawnListEntry entry(Class<? extends EntityLiving> cls, int weight, int min, int max) {
        return new Biome.SpawnListEntry(cls, weight, min, max);
    }

    private static void override(Biome biome, EnumCreatureType type, Biome.SpawnListEntry... entries) {
        Map<EnumCreatureType, List<Biome.SpawnListEntry>> byType =
                OVERRIDES.computeIfAbsent(biome, (k) -> new EnumMap<>(EnumCreatureType.class));
        List<Biome.SpawnListEntry> list = byType.get(type);
        if (list == null) {
            list = new ArrayList<>(baseOf(type));
            byType.put(type, list);
        }
        Collections_addAll(list, entries);
    }

    @SafeVarargs
    private static void Collections_addAll(List<Biome.SpawnListEntry> list, Biome.SpawnListEntry... entries) {
        list.addAll(Arrays.asList(entries));
    }

    private static void overrideAll(Biome biome, Biome.SpawnListEntry... monsterEntries) {
        for (EnumCreatureType type : EnumCreatureType.values()) {
            Map<EnumCreatureType, List<Biome.SpawnListEntry>> byType =
                    OVERRIDES.computeIfAbsent(biome, (k) -> new EnumMap<>(EnumCreatureType.class));
            byType.put(type, new ArrayList<>());
        }
        if (monsterEntries.length > 0) {
            for (Biome.SpawnListEntry e : monsterEntries) {
                overrideMonsterRaw(biome, e);
            }
        }
    }

    private static void overrideMonsterRaw(Biome biome, Biome.SpawnListEntry e) {
        OVERRIDES.get(biome).get(EnumCreatureType.MONSTER).add(e);
    }

    static {
        // audit 14 §3.2 biome overrides (filtered to present classes).
        for (Biome b : CLEAR_CREATURE) {
            Map<EnumCreatureType, List<Biome.SpawnListEntry>> byType =
                    OVERRIDES.computeIfAbsent(b, (k) -> new EnumMap<>(EnumCreatureType.class));
            byType.put(EnumCreatureType.CREATURE, new ArrayList<>());
        }
        for (Biome b : ALL_CLEAR) {
            Map<EnumCreatureType, List<Biome.SpawnListEntry>> byType =
                    OVERRIDES.computeIfAbsent(b, (k) -> new EnumMap<>(EnumCreatureType.class));
            for (EnumCreatureType type : EnumCreatureType.values()) {
                byType.put(type, new ArrayList<>());
            }
        }
        for (Biome b : FOREST) {
            override(b, EnumCreatureType.CREATURE, entry(EntityWolf.class, 10, 1, 3));
        }
        for (Biome b : TAIGA) {
            override(b, EnumCreatureType.CREATURE, entry(EntityWolf.class, 10, 1, 3));
        }
        for (Biome b : SNOWY) {
            override(b, EnumCreatureType.CREATURE, entry(EntityWolf.class, 4, 1, 3));
        }
        override(Biomes.PLAINS, EnumCreatureType.CREATURE, entry(EntityHorse.class, 5, 1, 2));
        override(Biomes.JUNGLE, EnumCreatureType.CREATURE, entry(EntityOcelot.class, 10, 1, 1),
                entry(EntityChicken.class, 10, 1, 1));
        override(Biomes.SWAMPLAND, EnumCreatureType.MONSTER, entry(EntitySlime.class, 10, 1, 1));
        // Hell: all clear + ghast 50(1,2) / pigZombie 100(1,4) / magma 10(4,4).
        overrideAll(Biomes.HELL, entry(EntityGhast.class, 50, 1, 2), entry(EntityPigZombie.class, 100, 1, 4),
                entry(EntityMagmaCube.class, 10, 4, 4));
        // End: all clear + enderman 100(4,4).
        overrideAll(Biomes.SKY, entry(EntityEnderman.class, 100, 4, 4));
    }

    private static List<Biome.SpawnListEntry> baseOf(EnumCreatureType type) {
        return BASE.get(type);
    }

    /** MITE-biome table pick at a position (replaces the vanilla
     * {@code getSpawnListEntryForTypeAt} read point). */
    public static Biome.SpawnListEntry pickSpawn(WorldServer w, EnumCreatureType type, BlockPos pos) {
        Biome biome = w.getBiome(pos);
        Map<EnumCreatureType, List<Biome.SpawnListEntry>> byType = OVERRIDES.get(biome);
        List<Biome.SpawnListEntry> list;
        if (byType != null) {
            list = byType.get(type);
            if (list == null) {
                list = baseOf(type);
            }
        } else {
            list = baseOf(type);
        }
        if (list.isEmpty()) {
            return null;
        }
        return WeightedRandom.getRandomItem(w.rand, list);
    }

    /** The ghast 48² dedup (audit 14 §3.4 :703-709): a ghast candidate is
     *  cancelled 80% of the time when another ghast is within 48 blocks. */
    public static boolean ghastDedup(WorldServer w, BlockPos pos) {
        for (net.minecraft.entity.Entity e : w.loadedEntityList) {
            if (e instanceof EntityGhast && e.isEntityAlive()) {
                double dx = e.posX - pos.getX();
                double dy = e.posY - pos.getY();
                double dz = e.posZ - pos.getZ();
                if (dx * dx + dy * dy + dz * dz <= 2304.0D && w.rand.nextInt(5) != 0) {
                    return true;
                }
            }
        }
        return false;
    }

    private ETIMSpawnTables() {
    }
}
