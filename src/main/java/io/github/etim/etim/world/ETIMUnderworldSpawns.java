package io.github.etim.etim.world;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import java.util.ArrayList;
import java.util.List;

import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.monster.EntityCaveSpider;
import net.minecraft.entity.monster.EntitySkeleton;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.world.biome.Biome;
import net.minecraft.world.biome.Biome.SpawnListEntry;
import net.minecraft.world.WorldServer;

import io.github.etim.etim.mob.ETIMEntityAncientBoneLord;
import io.github.etim.etim.mob.ETIMEntityBoneLord;
import io.github.etim.etim.mob.ETIMEntityLongdead;
import io.github.etim.etim.mob.ETIMEntityLongdeadGuardian;
import io.github.etim.etim.mob.ETIMEntityRevenant;
import io.github.etim.etim.mob.ETIMSpawnTables;

/**
 * M6-01/05 — the underworld spawn faces (report §6).
 *
 * <ul>
 *   <li>{@link #monsterList()}: the underworld monster pool — R196
 *       {@code BiomeGenUnderworld :9-16} transposed onto the ETIM
 *       authoritative table: ETIM BASE monster rows MINUS
 *       Skeleton/Zombie/Revenant/BoneLord (Ghoul has no ETIM carrier, C-11)
 *       PLUS CaveSpider 40(1,2) / Longdead 40(1,2) / AncientBoneLord 5(1,1)
 *       = <b>9 rows</b> (BASE−4+3). One shared factory feeds both the
 *       {@link Biome} list and {@link ETIMSpawnTables#registerUnderworld}.</li>
 *   <li>{@link #substituteClassToSpawn(WorldServer, Class)}: R196
 *       {@code SpawnerAnimals.java:73-79} — Longdead → Guardian at 1/6
 *       per spawned mob; the VampireBat → GiantVampireBat half has no ETIM
 *       carrier (C-5) and is kept as the commented face.</li>
 *   <li>{@link #checkDepth}: R196 {@code WorldServer.java:603-604}
 *       {@code check_depth = isOverworld()} — the per-class depth gates are
 *       short-circuited off-overworld; the ETIM Demon/Phase gate reads this
 *       (M6-05 判行锚).</li>
 * </ul>
 */
public final class ETIMUnderworldSpawns {

    private static List<Biome.SpawnListEntry> monsterListCache;

    /** M3-02/03/04 — the shared underworld monster pool factory (9 rows). */
    public static List<Biome.SpawnListEntry> monsterList() {
        if (monsterListCache == null) {
            List<Biome.SpawnListEntry> list = new ArrayList<>();
            // R196 :9-13 — remove Skeleton/Zombie/Ghoul/Revenant/BoneLord
            // (Ghoul drops — no ETIM carrier, C-11).
            for (Biome.SpawnListEntry e : ETIMSpawnTables.monsterBase()) {
                if (e.entityClass != EntitySkeleton.class
                        && e.entityClass != EntityZombie.class
                        && e.entityClass != ETIMEntityRevenant.class
                        && e.entityClass != ETIMEntityBoneLord.class) {
                    list.add(e);
                }
            }
            // R196 :14-16 — the three underworld rows.
            list.add(new SpawnListEntry(EntityCaveSpider.class, 40, 1, 2));
            list.add(new SpawnListEntry(ETIMEntityLongdead.class, 40, 1, 2));
            list.add(new SpawnListEntry(ETIMEntityAncientBoneLord.class, 5, 1, 1));
            monsterListCache = list;
        }
        return monsterListCache;
    }

    /** M3-02 判行锚 — the pool build row ([SpawnLog]). */
    public static void logPool() {
        if (ETIMConfig.mobDebugLog) {
            StringBuilder rows = new StringBuilder();
            for (Biome.SpawnListEntry e : monsterList()) {
                if (rows.length() > 0) {
                    rows.append(',');
                }
                rows.append(e.entityClass.getSimpleName()).append(':').append(e.itemWeight);
            }
            ETIM.LOGGER.info("[SpawnLog] pool underworld size=" + monsterListCache.size()
                    + " rows=" + rows + " [server]");
        }
    }

    /**
     * M6-01 — R196 {@code SpawnerAnimals.getSubstituteClassToSpawn :73-79},
     * per spawned mob. The Longdead → Guardian half is live (1/6); the
     * VampireBat → GiantVampireBat half stays dead (no ETIM carriers, C-5).
     */
    public static Class<? extends EntityLiving> substituteClassToSpawn(WorldServer w,
            Class<? extends EntityLiving> suitableClass) {
        // R196 :74-75 — VampireBat ∧ underworld ∧ 1/6 → GiantVampireBat
        // (kept as the dead face: ETIM has no VampireBat class, C-5).
        if (suitableClass == ETIMEntityLongdead.class && w.rand.nextInt(6) == 0) { // :77
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[SpawnLog] substitute Longdead->Guardian [server]");
            }
            return ETIMEntityLongdeadGuardian.class;
        }
        return suitableClass;
    }

    /**
     * M6-05 — R196 {@code WorldServer.java:603-604}: {@code check_depth =
     * isOverworld()}. The per-class depth gates only bind in the overworld;
     * every other dimension short-circuits them ([SpawnLog] depth-bypass row).
     */
    public static boolean checkDepth(WorldServer w) {
        boolean isOverworld = w.provider.getDimension() == 0;
        // per-server budget — the bypass fires per candidate attempt, so a
        // fixed budget keeps the row visible without flooding (blue-animal
        // budget precedent).
        if (!isOverworld && ETIMConfig.mobDebugLog && depthBypassLogBudget > 0) {
            --depthBypassLogBudget;
            ETIM.LOGGER.info("[SpawnLog] depth-bypass dim=" + w.provider.getDimension() + " [server]");
        }
        return isOverworld;
    }

    private static int depthBypassLogBudget = 8;

    private ETIMUnderworldSpawns() {
    }
}
