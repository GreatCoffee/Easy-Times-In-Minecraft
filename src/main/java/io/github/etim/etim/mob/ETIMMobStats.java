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

import java.util.HashMap;
import java.util.Map;

/**
 * Stage 5 slice 2: the R196 per-class attribute table (audit 11 §3.1,
 * A-grade javap'd) applied onto the vanilla-faithful classes. MITE-specific
 * mobs (the Arachnid Cave/Demon/Phantom spider strains, Ghost, Ghoul, Fire,
 * BoneLord, ...) have no 1.12 counterparts and are not touched by this
 * batch; rows whose value already equals the vanilla constant are left
 * untouched. The movement-speed rows are NOT ported this pass — the 1.6.4
 * and 1.12 speed attribute scales are different units, and the audit gives
 * no 1.12 value; they are parked on the pending-list for a session-five
 * audit follow-up.
 *
 * <p>Vanilla 1.12 anchors (this repo's deobf sources) against the R196
 * table:</p>
 * <ul>
 *   <li>{@code EntitySkeleton} — no per-class overrides (hp 20 / attack 2
 *       base / follow 16) → R196 {@code hp 6 / attack 4 / follow 32}.</li>
 *   <li>{@code EntityZombie} — follow 35 / attack 3 / armor 2 → R196
 *       {@code attack 5 / follow 32 / armor 0} ("armor no per-class
 *       override, grep all-zero").</li>
 *   <li>{@code EntityPigZombie} — attack 5 (follow stays 16) → R196
 *       {@code attack 8 / follow 32}.</li>
 *   <li>{@code EntitySpider} — hp 16 / attack 2 base / follow 16 → R196
 *       {@code hp 12 / attack 4 / follow 28}.</li>
 *   <li>Skipped-on-equality rows: zombie/creeper hp 20, giant 100/50,
 *       witch 26, wolf 8/3 (all match vanilla already).</li>
 * </ul>
 *
 * <p>Hook choice: {@code EntityJoinWorldEvent} (server-side) naturally
 * retries on every chunk reload because {@code readFromNBT} reconstructs the
 * fresh entity via the constructor, re-writing the vanilla per-row
 * constants; a repeat apply of the same base equals a no-op (and no
 * [AILog] line is emitted when the value did not change).</p>
 */
public final class ETIMMobStats {

    /** one per-class row: maxHealth / attackDamage / followRange / armor (null = untouched). */
    private static final class Row {
        final Double maxHealth;
        final Double attackDamage;
        final Double followRange;
        final Double armor;

        Row(Double maxHealth, Double attackDamage, Double followRange, Double armor) {
            this.maxHealth = maxHealth;
            this.attackDamage = attackDamage;
            this.followRange = followRange;
            this.armor = armor;
        }
    }

    private static final Map<Class<?>, Row> ROWS = new HashMap<>();

    static {
        // audit 11 §3.1 (Skeleton:32/:34/:225 — 6 hp, 4 attack, 32 follow)
        ROWS.put(EntitySkeleton.class, new Row(6.0, 4.0, 32.0, null));
        // audit 11 §3.1 (Zombie:43 — attack 5, follow 32) + §3.1 "armor all-zero"
        ROWS.put(EntityZombie.class, new Row(null, 5.0, 32.0, 0.0));
        // audit 11 §3.1 (PigZ:22 — attack 8, follow 32)
        ROWS.put(EntityPigZombie.class, new Row(null, 8.0, 32.0, null));
        // audit 11 §3.1 (Arachnid spider base :115-118 — hp 12, attack 4, follow 28)
        ROWS.put(EntitySpider.class, new Row(12.0, 4.0, 28.0, null));
    }

    private ETIMMobStats() {
    }

    @SubscribeEvent
    public static void onEntityJoinWorld(EntityJoinWorldEvent event) {
        if (event.getWorld().isRemote || !ETIMConfig.mobStatsR196) {
            return;
        }
        Entity e = event.getEntity();
        for (Map.Entry<Class<?>, Row> entry : ROWS.entrySet()) {
            if (entry.getKey().isInstance(e)) {
                apply((net.minecraft.entity.EntityLivingBase) e, entry.getValue());
            }
        }
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
        return attribute.getName();
    }
}
