package io.github.etim.etim.mob;

/**
 * B-70UQ: the pure half of the R196 despawn chain.
 *
 * <p>Faces: EntityAnimal.java:237-255 (three walls), EntityLiving.java:740-758
 * (view reset), EntityMob.java:259-269 (path hold), SpawnerAnimals.java:664-666
 * (water counter seed). The world reads (closest player, fence scan, line of
 * sight, path) stay in {@link DespawnRules}; only the arithmetic moves here.</p>
 *
 * <p>中文：动物三层墙、距离（含「宽限小时」竖直 ×2）、击杀通行、重掷区间 —— 四段纯算术。
 * 读玩家/栅栏/视线/寻路的仍在调用方。</p>
 */
public final class DespawnGates {

    /** Which animal wall a counter hit, or CHAIN when the animal walks the shared chain. */
    public enum Wall {
        /** counter below the quiet threshold. */
        QUIET,
        /** a player is within the animal radius. */
        PLAYER,
        /** a fence is within the radius. */
        FENCE,
        /** counter at or below the kill threshold. */
        KILL,
        /** past every animal wall. */
        CHAIN
    }

    private DespawnGates() {
    }

    /**
     * EntityAnimal.java:237-255 — the three walls in R196 order: quiet, then
     * player/fence (which also resets the counter), then kill.
     */
    public static Wall animalWall(int counter, boolean playerNear, boolean fenceNear,
                                  int quiet, int kill) {
        if (counter < quiet) {
            return Wall.QUIET;
        }
        if (playerNear) {
            return Wall.PLAYER;
        }
        if (fenceNear) {
            return Wall.FENCE;
        }
        if (counter <= kill) {
            return Wall.KILL;
        }
        return Wall.CHAIN;
    }

    /** EntityLiving.java:766-776 — vertical component doubles except in the grace hour. */
    public static double distanceSq(double dx, double dy, double dz, boolean hourOfGrace) {
        double ey = hourOfGrace ? dy : dy * 2.0D;
        return dx * dx + ey * ey + dz * dz;
    }

    /** The kill branch starts here: beyond the kill radius. */
    public static boolean beyondKill(double distSq, double killDistSq) {
        return distSq > killDistSq;
    }

    /** An equipped (item-carrying) mob resets its counter instead of being killed (B-50). */
    public static boolean equippedHold(double distSq, boolean hasContainedItems, double killDistSq) {
        return distSq > killDistSq && hasContainedItems;
    }

    /** The reroll value written back to the idle counter: {@code rand*range - range/2}. */
    public static int reroll(double rand, int range) {
        return (int) (rand * range) - range / 2;
    }
}
