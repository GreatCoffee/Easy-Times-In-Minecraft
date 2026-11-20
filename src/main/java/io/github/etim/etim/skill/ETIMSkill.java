package io.github.etim.etim.skill;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * One learnable profession skill, carried as a single bit in the player's
 * skill mask. The first thirteen ids are the R196 {@code Skill.java}
 * construction order (0..12); addons such as ETIM-Extra register their own
 * skills after those, so the bit layout never shifts.
 *
 * <p>R196 anchor: {@code Skill.java:7-19} — {@code id = 1 << num_skills},
 * with the list order fighting, archery, mining, food preparation, masonry,
 * farming, tinkering, carpentry, blacksmithing, brewing, fine arts,
 * enchanting, fishing.</p>
 */
public final class ETIMSkill {

    private static final Map<String, ETIMSkill> BY_KEY = new LinkedHashMap<String, ETIMSkill>();

    public static final ETIMSkill FIGHTING = register("fighting");
    public static final ETIMSkill ARCHERY = register("archery");
    public static final ETIMSkill MINING = register("mining");
    public static final ETIMSkill FOOD_PREPARATION = register("foodPreparation");
    public static final ETIMSkill MASONRY = register("masonry");
    public static final ETIMSkill FARMING = register("farming");
    public static final ETIMSkill TINKERING = register("tinkering");
    public static final ETIMSkill CARPENTRY = register("carpentry");
    public static final ETIMSkill BLACKSMITHING = register("blacksmithing");
    public static final ETIMSkill BREWING = register("brewing");
    public static final ETIMSkill FINE_ARTS = register("fineArts");
    public static final ETIMSkill ENCHANTING = register("enchanting");
    public static final ETIMSkill FISHING = register("fishing");

    private final String key;
    private final int bit;

    private ETIMSkill(String key, int bit) {
        this.key = key;
        this.bit = bit;
    }

    /**
     * Registers an addon skill after the R196 thirteen. The bit index is the
     * registration order; re-registering the same key returns the existing
     * object, so repeated mod-init calls are harmless.
     */
    public static synchronized ETIMSkill register(String key) {
        String normalized = key.toLowerCase(Locale.ROOT);
        ETIMSkill existing = BY_KEY.get(normalized);
        if (existing != null) {
            return existing;
        }
        if (BY_KEY.size() >= 31) {
            throw new IllegalStateException("ETIM skill mask exhausted (31 skills)");
        }
        ETIMSkill skill = new ETIMSkill(normalized, BY_KEY.size());
        BY_KEY.put(normalized, skill);
        return skill;
    }

    /** The bit index (0..30), matching the R196 construction order. */
    public int id() {
        return bit;
    }

    /** The single-bit mask, i.e. {@code 1 << id()}. */
    public int mask() {
        return 1 << bit;
    }

    /** Stable lower-case key used by commands and the registry. */
    public String key() {
        return key;
    }

    /** Translation key, e.g. {@code skill.carpentry}. */
    public String translationKey() {
        return "skill." + key;
    }

    public static List<ETIMSkill> values() {
        return Collections.unmodifiableList(new ArrayList<ETIMSkill>(BY_KEY.values()));
    }

    public static ETIMSkill byKey(String key) {
        if (key == null) {
            return null;
        }
        return BY_KEY.get(key.toLowerCase(Locale.ROOT));
    }

    public static ETIMSkill byId(int id) {
        if (id < 0 || id >= 31) {
            return null;
        }
        int bit = 1 << id;
        for (ETIMSkill skill : BY_KEY.values()) {
            if (skill.mask() == bit) {
                return skill;
            }
        }
        return null;
    }

    /** Combines several skills into a mask (empty array = 0). */
    public static int maskOf(ETIMSkill... skills) {
        int mask = 0;
        if (skills != null) {
            for (ETIMSkill skill : skills) {
                if (skill != null) {
                    mask |= skill.mask();
                }
            }
        }
        return mask;
    }

    public static int numSkills() {
        return BY_KEY.size();
    }

    @Override
    public String toString() {
        return key;
    }
}
