package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLiving;

/**
 * B-39 is-smart face — the R196 {@code EntityZombie.is_smart} carrier
 * (R196 {@code EntityZombie.java:13 private boolean is_smart}). The flag
 * seeds at the constructor (R196 :35 {@code is_smart = isRevenant() ||
 * rand.nextInt(8) == 0}), upgrades to {@code true} on player-caused damage
 * (R196 :100 attackEntityFrom), persists through the {@code is_smart} NBT
 * key (R196 :221/:239), and is consumed by the dig gate
 * ({@code ETIMDigging.isDiggingEnabled} — R196 :404-411: a smart or
 * frenzied zombie digs bare-handed; a plain one needs a held ItemTool).
 */
public interface ETIMSmartDuck {

    boolean etim$isSmart();

    void etim$setSmart(boolean value);

    static boolean carries(EntityLiving entity) {
        return entity instanceof ETIMSmartDuck;
    }
}
