package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

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
 * <p>MITE-exclusive classes (ghoul, wight, invisibleStalker,
 * hellhound, woodSpider, shadow, earthElemental, jelly, blob, ooze,
 * pudding, clayGolem, vampireBat, nightwing, direWolf,
 * infernal creeper variant, guardians) have no 1.12 entity yet — their weight
 * rows stay in the gap list (audit 14 §3.1/§3.2) and are filled back in when
 * each class lands. LANDED so far: the three spiders (2026-10-23, 审计补46/47)
 * and the revenant + bone lord (mob 批 2026-10-24, R196 BiomeGenBase :178
 * Revenant 10(1,1) / :185 BoneLord 5(1,1)) — those rows are live below. Class-fine rules that survive the
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
        // Three-spider round (审计补46/47): R196 BiomeGenBase :174 DemonSpider
        // 10(1,1) and :186 PhaseSpider 5(1,4) sit in the base ctor = every
        // biome (WoodSpider :176 20(1,1) stays OUT — carrier-only per verdict).
        monster.add(entry(ETIMEntityDemonSpider.class, 10, 1, 1));
        monster.add(entry(ETIMEntityPhaseSpider.class, 5, 1, 4));
        // mob 批 (2026-10-24): the revenant/bone-lord gap rows filled —
        // R196 BiomeGenBase :178 Revenant 10(1,1) / :185 BoneLord 5(1,1),
        // base-ctor rows = every biome. The gap-list javadoc above is
        // updated accordingly.
        monster.add(entry(ETIMEntityRevenant.class, 10, 1, 1));
        monster.add(entry(ETIMEntityBoneLord.class, 5, 1, 1));
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
        // Three-spider round: R196 BiomeGenJungle:13 — BlackWidowSpider 10(1,1)
        // is the ONLY jungle row (verdict G-S5 correction; NOT in BiomeGenBase).
        override(Biomes.JUNGLE, EnumCreatureType.MONSTER, entry(ETIMEntityBlackWidowSpider.class, 10, 1, 1));
        override(Biomes.SWAMPLAND, EnumCreatureType.MONSTER, entry(EntitySlime.class, 10, 1, 1));
        // Hell: all clear + ghast 50(1,2) / pigZombie 100(1,4) / magma 10(4,4).
        overrideAll(Biomes.HELL, entry(EntityGhast.class, 50, 1, 2), entry(EntityPigZombie.class, 100, 1, 4),
                entry(EntityMagmaCube.class, 10, 4, 4));
        // End: all clear + enderman 100(4,4).
        overrideAll(Biomes.SKY, entry(EntityEnderman.class, 100, 4, 4));
    }

    private static String posToString(BlockPos p) {
        return "(" + p.getX() + "," + p.getY() + "," + p.getZ() + ")";
    }

    private static List<Biome.SpawnListEntry> baseOf(EnumCreatureType type) {
        return BASE.get(type);
    }

    /** M3-04 — the ETIM BASE monster rows (ETIMUnderworldSpawns 池工厂的源). */
    public static List<Biome.SpawnListEntry> monsterBase() {
        return BASE.get(EnumCreatureType.MONSTER);
    }

    /**
     * M3-02/03 — underworld 批 (2026-10-25): the underworld biome's
     * authoritative table = the R196 BiomeGenUnderworld face (remove
     * Skeleton/Zombie/Revenant/BoneLord — Ghoul has no carrier, C-11 — plus
     * CaveSpider/Longdead/AncientBoneLord). The exact-override face (the
     * existing {@code override()} appends, which would double-count).
     * Called from {@code ETIMBiomeUnderworld.register()} (装载顺序 face,
     * 报告 §4.2).
     */
    public static void registerUnderworld(Biome underworldBiome) {
        for (EnumCreatureType type : EnumCreatureType.values()) {
            Map<EnumCreatureType, List<Biome.SpawnListEntry>> byType =
                    OVERRIDES.computeIfAbsent(underworldBiome, (k) -> new EnumMap<>(EnumCreatureType.class));
            byType.put(type, type == EnumCreatureType.MONSTER
                    ? io.github.etim.etim.world.ETIMUnderworldSpawns.monsterList()
                    : new ArrayList<>(baseOf(type)));
        }
        io.github.etim.etim.world.ETIMUnderworldSpawns.logPool();
    }    /**
     * MITE-biome table pick at a position (replaces the vanilla
     * {@code getSpawnListEntryForTypeAt} read point).
     *
     * <p>❗F4a/F4b/F4c（第二批，面12:164-165）: R196
     * {@code getSuitableCreature} (WorldServer:604-718) wraps the weighted
     * pick in a ≤16-attempt retry loop with per-class detail gates:</p>
     * <ul>
     *   <li><b>creeper</b> (:619-627): surface-lit-outdoor night candidates
     *       are dropped 3/4 (retry) — {@code hasSkylight && !isDaytime &&
     *       isOutdoors && nextInt(4)≠0} → retry;</li>
     *   <li><b>spider</b> (:691-695): surface-outdoor candidates are dropped
     *       1/4 (retry) — {@code hasSkylight && isOutdoors && nextInt(4)==0}
     *       → retry. <b>No isDaytime clause in the R196 spider gate</b> (the
     *       decompiled if carries only skylight/outdoors/dice) — the audit's
     *       pseudocode "夜" wording is not in the one-hand gate;</li>
     *   <li><b>ghast</b> (:705-711): the 48² dedup (strict &lt; 2304) —
     *       wired here via {@link #ghastDedup} (was dead code); the boundary
     *       is aligned to R196's strict {@code <}.</li>
     * </ul>
     * R196's infernal-creeper / WoodSpider / BlackWidow branches have no
     * ETIM counterpart entities — 未立项面不落（audit12 对照表仅列三门）。
     * 会话五裁定（裁定回执 补16）：R196 WorldServer:714-716 = BlackWidowSpider
     * 专属 50% 通过门（per-attempt 50% accept，else 续走 :614 内部 16-attempt
     * 循环重掷——null 仅在 16 连败后，p≈2⁻¹⁶；调用方 SpawnerAnimals 对 null
     * 的续试是外层，非门本体）+ :718-720 = DemonSpider/PhaseSpider 专属
     * y≤32 地下支——载体类均不在 1.12 宇宙 ⇒ 不可达 ⇒ 登记等价不立项；
     * 三类入宇宙时随类立项（v2+ 触发条件挂账）。
     * 16 attempts exhausted → null.
     */
    public static Biome.SpawnListEntry pickSpawn(WorldServer w, EnumCreatureType type, BlockPos pos) {
        for (int attempt = 0; attempt < 16; attempt++) {
            Biome.SpawnListEntry picked = pickWeighted(w, type, pos);
            if (picked == null) {
                return null;
            }
            Class<? extends EntityLiving> cls = picked.entityClass;
            // 1.12 carriers: R196 hasSkylight() = provider.hasSkyLight();
            // R196 isOutdoors(x,y,z) ≈ canSeeSky (lit ray to the sky — the
            // exact R196 outdoors mesh has no 1.12 counterpart; nearest
            // vanilla carrier, gap noted in the report addendum).
            if (cls == EntityCreeper.class) {
                if (w.provider.hasSkyLight() && !w.isDaytime() && w.canSeeSky(pos) && w.rand.nextInt(4) != 0) {
                    continue; // 3/4 drop on lit-outdoor nights
                }
                return picked;
            }
            if (cls == EntitySpider.class) {
                if (w.provider.hasSkyLight() && w.canSeeSky(pos) && w.rand.nextInt(4) == 0) {
                    continue; // 1/4 drop on lit outdoors (day-independent per the one-hand gate)
                }
                return picked;
            }
            // 三蜘蛛轮门1（R196 WorldServer:714-716 一手，勘正面）：BlackWidow 专属
            // 50% 通过门——nextFloat<0.5F 拒（continue 重掷），≥0.5 接受；per-attempt
            // 语义，外层 16-attempt 循环承接。
            if (cls == ETIMEntityBlackWidowSpider.class) {
                float dice = w.rand.nextFloat();
                if (dice < 0.5F) {
                    if (ETIMConfig.mobDebugLog) {
                        ETIM.LOGGER.info("[SpawnLog] blackwidow-gate reject nextFloat="
                                + Math.round(dice * 100.0F) / 100.0F + " at " + posToString(pos));
                    }
                    continue;
                }
                return picked;
            }
            // 三蜘蛛轮门2（R196 :682+:718-720，check_depth = isOverworld 一手
            // :604）：Demon/Phase 专属地下支——主世界 y>32 拒（underworld 批
            // 2026-10-25: the gate reads ETIMUnderworldSpawns.checkDepth —
            // M6-05，非主世界走 [SpawnLog] depth-bypass 行）。
            if ((cls == ETIMEntityDemonSpider.class || cls == ETIMEntityPhaseSpider.class)
                    && io.github.etim.etim.world.ETIMUnderworldSpawns.checkDepth(w) && pos.getY() > 32) {
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[SpawnLog] depth-gate reject cls=" + cls.getSimpleName()
                            + " y=" + pos.getY() + " at " + posToString(pos));
                }
                continue;
            }
            if (cls == EntityGhast.class && ghastDedup(w, pos)) {
                // ❗B2-6（会话七终验回执）：dedup was a silent null — verdict
                // line for the F-4a face (48² dedup, strict < 2304).
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[SpawnLog] ghast dedup cancel at (" + pos.getX() + "," + pos.getY()
                            + "," + pos.getZ() + ") → null");
                }
                return null; // dedup cancel
            }
            return picked;
        }
        return null;
    }

    private static Biome.SpawnListEntry pickWeighted(WorldServer w, EnumCreatureType type, BlockPos pos) {
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

    /** ❗F4a（第二批）：the ghast 48² dedup (R196 WorldServer:705-711) — a
     * ghast candidate is cancelled 80% of the time per neighbor within 48
     * blocks (strict &lt; 2304). Previously dead code (zero call sites); now
     * wired into {@link #pickSpawn}. */
    public static boolean ghastDedup(WorldServer w, BlockPos pos) {
        for (net.minecraft.entity.Entity e : w.loadedEntityList) {
            if (e instanceof EntityGhast && e.isEntityAlive()) {
                double dx = e.posX - pos.getX();
                double dy = e.posY - pos.getY();
                double dz = e.posZ - pos.getZ();
                if (dx * dx + dy * dy + dz * dz < 2304.0D && w.rand.nextInt(5) != 0) {
                    return true;
                }
            }
        }
        return false;
    }

    private ETIMSpawnTables() {
    }
}
