package io.github.etim.etim.mob;

import io.github.etim.etim.combat.ETIMNaturalDefense;
import net.minecraft.entity.monster.EntityCreeper;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.util.DamageSource;
import net.minecraft.world.World;

/**
 * B-47: R196 {@code EntityInfernalCreeper} (WorldServer.java:624-626 replacement).
 *
 * <p>R196 one-hand: {@code explosionRadius *= 2.0F}; natural defense +2 unless the
 * source bypasses mundane armor; fire/lava immune; XP x3; drops the infernal
 * creeper fragment row. ETIM has no infernal-fragment item yet, so this class
 * drops gunpowder with the exact R196 count formula and the gap is logged as a
 * C-note (the spawn-substitution face is the face this batch closes).</p>
 */
public class ETIMEntityInfernalCreeper extends EntityCreeper implements ETIMNaturalDefense {

    public ETIMEntityInfernalCreeper(World world) {
        super(world);
        // R196 EntityInfernalCreeper.java:5-9 (radius 3 -> 6).
        ((ETIMCreeperExplosionRadius) this).etim$setExplosionRadius(6);
        // 1.12 keeps isImmuneToFire as a field with a final getter.
        this.isImmuneToFire = true;
    }

    /** R196 :11-14: +2 natural defense for non-bypassing sources. */
    @Override
    public float etimNaturalDefense(DamageSource source) {
        return source == null || source.isUnblockable() ? 0.0F : 2.0F;
    }

    /** R196 :29-30: fire and lava do not harm the infernal variant. */
    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        if (source == DamageSource.LAVA || source.isFireDamage()) {
            return false;
        }
        return super.attackEntityFrom(source, amount);
    }

    /** R196 :36-38: death XP is the creeper value x3. */
    @Override
    protected int getExperiencePoints(EntityPlayer player) {
        return super.getExperiencePoints(player) * 3;
    }

    /**
     * R196 :16-34 drop formula. The R196 item ({@code fragsInfernalCreeper}) has
     * no ETIM carrier; gunpowder keeps the count/fortune/recent-hit shape.
     */
    @Override
    protected void dropFewItems(boolean recentlyHitByPlayer, int lootingModifier) {
        int numDrops = this.rand.nextInt(4);
        if (numDrops == 0) {
            numDrops = this.rand.nextInt(3);
        }
        if (lootingModifier > 0) {
            numDrops += this.rand.nextInt(lootingModifier + 1);
        }
        if (numDrops > 0 && !recentlyHitByPlayer) {
            numDrops -= this.rand.nextInt(numDrops + 1);
        }
        for (int i = 0; i < numDrops; ++i) {
            this.dropItem(Items.GUNPOWDER, 1);
        }
    }
}
