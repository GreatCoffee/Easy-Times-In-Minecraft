package io.github.etim.etim.world;

/**
 * B-70UP (F-4 regression net): the pure half of the R196 explosion chain.
 *
 * <p>Faces: Explosion.java:111 (damage formula), :112 (livestock spook window);
 * Block.java:1984-1992 (chance modifiers), :2042-2057 (experience), :2059-2093
 * (spawn motion). The world-facing code keeps the geometry lookups and the entity
 * spawning; everything that decides a number lives here so it can be unit tested
 * without booting a server.</p>
 *
 * <p>中文：爆炸链里「决定数值」的部分（伤害公式、概率档、逐单位保留、经验、抛射速度、
 * 受惊窗口、牲畜扫描半径）从世界代码里剥出来，纯函数可单测；取方块密度、刷实体的部分
 * 留在调用方。</p>
 */
public final class ExplosionGates {

    /** Chance class of a block material, per R196 Block.java:1984-1992. */
    public enum ChanceClass {
        /** Chance 1.0 — neither fragile nor inert. */
        NORMAL,
        /** Snow / crafted snow / glass: 0.4×. */
        FRAGILE,
        /** Plants / cactus / vine / cake: never drop. */
        INERT
    }

    /** Injectable randomness so tests do not depend on a global RNG. */
    @FunctionalInterface
    public interface Rolls {
        float nextFloat();
    }

    private ExplosionGates() {
    }

    /**
     * Explosion.java:111 — MITE entity damage.
     *
     * <p>{@code effective = size * 4}; out of range returns 0; otherwise
     * {@code effective * (1 - dist/effective) * density * 4 * 2/3}, floored at 0.5.</p>
     */
    public static float entityDamage(float entitySize, double distance, double density) {
        float effective = entitySize * 4.0F;
        if (distance > (double) effective) {
            return 0.0F;
        }
        double factor = (1.0D - distance / (double) effective) * density;
        float damage = (float) (effective * factor * 4.0D * 0.6666667D);
        return damage >= 0.5F ? damage : 0.0F;
    }

    /** Explosion.java:112 — spook window: {@code now + 400 + rand(400)}. */
    public static long spookUntil(long now, int roll400) {
        return now + 400L + roll400;
    }

    /** Explosion.java:112 — livestock sweep radius {@code (size - 1) * 4}, never negative. */
    public static double livestockReach(float entitySize) {
        return Math.max(0.0D, (double) (entitySize - 1.0F)) * 4.0D;
    }

    /** Block.java:1984-1992 — chance multiplier for a material class. */
    public static float chanceFor(ChanceClass kind) {
        switch (kind) {
            case FRAGILE:
                return 0.4F;
            case INERT:
                return 0.0F;
            default:
                return 1.0F;
        }
    }

    /**
     * Block.java:1984-1992 + :2001-2040 — per-unit keep roll.
     *
     * <p>Each unit survives with {@code chance}; a chance above 1 grants one extra
     * roll at {@code chance - 1}; the result never exceeds {@code count + 1}.</p>
     */
    public static int keep(int count, float chance, Rolls rolls) {
        if (chance <= 0.0F || count <= 0) {
            return 0;
        }
        int kept = 0;
        for (int i = 0; i < count; i++) {
            if (rolls.nextFloat() < chance) {
                kept++;
            }
        }
        if (chance > 1.0F && rolls.nextFloat() < (chance - 1.0F)) {
            kept++;
        }
        return Math.min(kept, count + 1);
    }

    /** Block.java:2042-2057 — experience scales with surviving drops; lapis is exempt. */
    public static int experience(int base, int dropped, boolean exempt) {
        if (exempt || base <= 0 || dropped <= 0) {
            return 0;
        }
        return base * dropped;
    }

    /** Block.java:2059-2093 — outward speed {@code 0.25 + rand * 0.35}. */
    public static double motionSpeed(float roll) {
        return 0.25D + (double) roll * 0.35D;
    }
}
