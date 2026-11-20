package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.Entity;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.monster.EntityPigZombie;
import net.minecraft.entity.monster.EntitySkeleton;
import net.minecraft.entity.monster.EntitySpider;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraftforge.event.entity.EntityJoinWorldEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Stage 5 slice 2: the R196 per-class attribute table (audit 11 §3.1,
 * A-grade javap'd) applied onto the vanilla-faithful classes. MITE-specific
 * mobs with no 1.12 counterpart are served when their class lands: the
 * revenant/bone-lord classes carry their R196 attributes in-class (mob 批
 * T1①) and are skipped here, and the pre-batch "BoneLord has no 1.12
 * counterpart" claim is superseded. Rows whose value already equals the
 * vanilla constant are left untouched. B-48 (census D :103/:121) lands the
 * previously parked movement-speed face — R196 {@code EntitySkeleton:33}
 * 0.3F — and the tame-sensitive wolf row (R196 {@code EntityWolf:48-50}:
 * 12/8 hp, 32/16 follow, 3 attack, 0.4 speed); the wolf taming path is
 * re-applied from {@code MixinEntityWolf.setTamed}.
 *
 * <p>Vanilla 1.12 anchors (this repo's deobf sources) against the R196
 * table:</p>
 * <ul>
 *   <li>{@code EntitySkeleton} — no per-class overrides (hp 20 / attack 2
 *       base / follow 16 / speed 0.25) → R196 {@code hp 6 / attack 4 /
 *       follow 32 / speed 0.3}.</li>
 *   <li>{@code EntityZombie} — follow 35 / attack 3 / armor 2 → R196
 *       {@code attack 5 / follow 32 / armor 0} ("armor no per-class
 *       override, grep all-zero").</li>
 *   <li>{@code EntityPigZombie} — attack 5 (follow stays 16) → R196
 *       {@code attack 8 / follow 32}.</li>
 *   <li>{@code EntitySpider} — hp 16 / attack 2 base / follow 16 → R196
 *       {@code hp 12 / attack 4 / follow 28}.</li>
 *   <li>{@code EntityWolf} — speed 0.3 / hp 20 tamed or 8 wild / attack 4 /
 *       follow 16 → R196 {@code speed 0.4 / hp 12 tamed or 8 wild /
 *       attack 3 / follow 32 tamed or 16 wild}.</li>
 *   <li>Skipped-on-equality rows: zombie/creeper hp 20, giant 100/50,
 *       witch 26 (all match vanilla already).</li>
 * </ul>
 *
 * <p>Hook choice: {@code EntityJoinWorldEvent} (server-side) naturally
 * retries on every chunk reload because {@code readFromNBT} reconstructs the
 * fresh entity via the constructor, re-writing the vanilla per-row
 * constants; a repeat apply of the same base equals a no-op (and no
 * [AILog] line is emitted when the value did not change). Matching rows
 * apply in class-hierarchy order (superclass first, subclass last — mob 批
 * T7①), which fixes the pre-batch pigzombie nondeterminism (zombie row and
 * pigzombie row both matched in HashMap order).</p>
 */
public final class ETIMMobStats {

    /** one per-class row: maxHealth / attackDamage / followRange / armor / movementSpeed (null = untouched). */
    private static final class Row {
        final Double maxHealth;
        final Double attackDamage;
        final Double followRange;
        final Double armor;
        final Double movementSpeed;

        Row(Double maxHealth, Double attackDamage, Double followRange, Double armor, Double movementSpeed) {
            this.maxHealth = maxHealth;
            this.attackDamage = attackDamage;
            this.followRange = followRange;
            this.armor = armor;
            this.movementSpeed = movementSpeed;
        }
    }

    private static final Map<Class<?>, Row> ROWS = new HashMap<>();

    static {
        // audit 11 §3.1 (Skeleton:32/:34/:225 — 6 hp, 4 attack, 32 follow) + B-48 (Skeleton:33 — speed 0.3)
        ROWS.put(EntitySkeleton.class, new Row(6.0, 4.0, 32.0, null, 0.3));
        // audit 11 §3.1 (Zombie:43 — attack 5, follow 32) + §3.1 "armor all-zero"
        ROWS.put(EntityZombie.class, new Row(null, 5.0, 32.0, 0.0, null));
        // audit 11 §3.1 (PigZ:22 — attack 8, follow 32)
        ROWS.put(EntityPigZombie.class, new Row(null, 8.0, 32.0, null, null));
        // audit 11 §3.1 (Arachnid spider base :115-118 — hp 12, attack 4, follow 28)
        ROWS.put(EntitySpider.class, new Row(12.0, 4.0, 28.0, null, null));
    }

    private ETIMMobStats() {
    }

    @SubscribeEvent
    public static void onEntityJoinWorld(EntityJoinWorldEvent event) {
        if (event.getWorld().isRemote || !ETIMConfig.mobStatsR196) {
            return;
        }
        Entity e = event.getEntity();
        // B-48 (census D :121) — R196 EntityWolf:48-50 is tame-sensitive, so the
        // wolf rides its own dynamic row instead of the static table.
        if (e instanceof net.minecraft.entity.passive.EntityWolf) {
            applyWolf((net.minecraft.entity.passive.EntityWolf) e);
            return;
        }
        // mob 批 T1①: ETIM-owned entity classes carry their R196 attributes
        // in-class (the ETIMEntityArachnid precedent) — the vanilla-class rows
        // below must not clobber them (the revenant 7.0 attack / the bone
        // lord 20.0 hp would be overwritten by the zombie/skeleton rows).
        if (e.getClass().getName().startsWith("io.github.etim.etim.")) {
            return;
        }
        // mob 批 T7①: collect every matching row and apply in class-hierarchy
        // order (superclass first, subclass last) — the R196
        // applyEntityAttributes chain parity. Fixes the pre-existing pigzombie
        // coin flip: the zombie row (attack 5) applied before the pigzombie
        // row (attack 8) makes the final value deterministic (8, R196 PigZ :22).
        List<Map.Entry<Class<?>, Row>> matches = new ArrayList<>();
        for (Map.Entry<Class<?>, Row> entry : ROWS.entrySet()) {
            if (entry.getKey().isInstance(e)) {
                matches.add(entry);
            }
        }
        if (matches.isEmpty()) {
            return;
        }
        matches.sort(java.util.Comparator.comparingInt(en -> classDepth(en.getKey())));
        for (Map.Entry<Class<?>, Row> entry : matches) {
            apply((net.minecraft.entity.EntityLivingBase) e, entry.getValue());
        }
    }

    /** superclass-hops depth for the hierarchy ordering. */
    private static int classDepth(Class<?> c) {
        int depth = 0;
        while (c != null) {
            depth++;
            c = c.getSuperclass();
        }
        return depth;
    }

    /**
     * B-48 (census D :121) — R196 {@code EntityWolf:48-50}: speed 0.4,
     * max health 12 tamed / 8 wild, attack 3, follow 32 tamed / 16 wild.
     * The same values are re-applied from {@code MixinEntityWolf.setTamed}
     * so taming a wild wolf lifts it from 8/16 to 12/32 mid-life.
     */
    private static void applyWolf(net.minecraft.entity.passive.EntityWolf wolf) {
        boolean tamed = wolf.isTamed();
        applyValue(wolf, SharedMonsterAttributes.MOVEMENT_SPEED, 0.4);
        applyValue(wolf, SharedMonsterAttributes.MAX_HEALTH, tamed ? 12.0 : 8.0);
        applyValue(wolf, SharedMonsterAttributes.ATTACK_DAMAGE, 3.0);
        applyValue(wolf, SharedMonsterAttributes.FOLLOW_RANGE, tamed ? 32.0 : 16.0);
    }

    private static void apply(net.minecraft.entity.EntityLivingBase e, Row row) {
        if (row.maxHealth != null) {
            applyValue(e, SharedMonsterAttributes.MAX_HEALTH, row.maxHealth);
        }
        if (row.attackDamage != null
                && e.getAttributeMap().getAttributeInstance(SharedMonsterAttributes.ATTACK_DAMAGE) != null) {
            applyValue(e, SharedMonsterAttributes.ATTACK_DAMAGE, row.attackDamage);
        }
        if (row.followRange != null) {
            applyValue(e, SharedMonsterAttributes.FOLLOW_RANGE, row.followRange);
        }
        if (row.armor != null) {
            applyValue(e, SharedMonsterAttributes.ARMOR, row.armor);
        }
        if (row.movementSpeed != null) {
            applyValue(e, SharedMonsterAttributes.MOVEMENT_SPEED, row.movementSpeed);
        }
    }

    private static void applyValue(net.minecraft.entity.EntityLivingBase e,
                                   net.minecraft.entity.ai.attributes.IAttribute attribute,
                                   double value) {
        net.minecraft.entity.ai.attributes.IAttributeInstance inst =
                e.getAttributeMap().getAttributeInstance(attribute);
        if (inst == null || Double.compare(inst.getBaseValue(), value) == 0) {
            return; // equals-no-op: no line, the reload re-apply stays silent
        }
        inst.setBaseValue(value);
        if (attribute == SharedMonsterAttributes.MAX_HEALTH) {
            float current = e.getHealth();
            float max = (float) value;
            if (current > max) {
                e.setHealth(max); // spawning fresh instances keep vanilla-max health until re-tuned
            }
        }
        if (ETIMConfig.mobDebugLog) {
            String serverTag = Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]";
            ETIM.LOGGER.info("[AILog] mob stats " + attributeName(attribute) + "=" + value
                    + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId()
                    + serverTag);
        }
    }

    private static String attributeName(net.minecraft.entity.ai.attributes.IAttribute attribute) {
        if (attribute == SharedMonsterAttributes.MAX_HEALTH) return "maxHealth";
        if (attribute == SharedMonsterAttributes.ATTACK_DAMAGE) return "attackDamage";
        if (attribute == SharedMonsterAttributes.FOLLOW_RANGE) return "followRange";
        if (attribute == SharedMonsterAttributes.ARMOR) return "armor";
        if (attribute == SharedMonsterAttributes.MOVEMENT_SPEED) return "movementSpeed";
        return attribute.getName();
    }
}
