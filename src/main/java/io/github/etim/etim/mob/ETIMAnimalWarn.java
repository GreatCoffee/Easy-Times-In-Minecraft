package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.entity.passive.EntityTameable;

import java.util.List;

/**
 * R196 {@code EntityLiving#warnPeersOfAttacker} (B-49, census D :318).
 *
 * <p>Called from the {@code EntityAnimal.attackEntityFrom} tail. Copies the
 * attacker onto nearby same-species animals as their revenge target (the 1.12
 * carrier of R196's {@code lastHarmingEntity}); the existing panic task turns
 * that into the flee flag at under 32 blocks. Tamed animals and animals that
 * already have a revenge target are skipped, matching the R196 filters.</p>
 */
public final class ETIMAnimalWarn {

    private ETIMAnimalWarn() {
    }

    public static void warnPeers(EntityAnimal victim, Entity attacker) {
        if (victim == null || attacker == null) {
            return;
        }
        if (victim.world == null || victim.world.isRemote) {
            return;
        }
        if (!ETIMConfig.livestockNeedsR196) {
            return;
        }
        if (victim instanceof EntityTameable && ((EntityTameable) victim).isTamed()) {
            return;
        }
        if (!(attacker instanceof EntityLivingBase)) {
            return;
        }
        EntityLivingBase source = (EntityLivingBase) attacker;
        List<EntityAnimal> peers = victim.world.getEntitiesWithinAABB(
                victim.getClass(), victim.getEntityBoundingBox().grow(8.0D, 4.0D, 8.0D));
        int flagged = 0;
        for (EntityAnimal peer : peers) {
            if (peer == victim) {
                continue;
            }
            if (peer instanceof EntityTameable && ((EntityTameable) peer).isTamed()) {
                continue;
            }
            if (peer.getRevengeTarget() != null) {
                continue;
            }
            if (peer.getDistance(source) >= 32.0F) {
                continue;
            }
            peer.setRevengeTarget(source);
            if (peer.isInLove()) {
                peer.resetInLove();
            }
            flagged++;
        }
        if (flagged > 0 && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] warnpeers src=" + victim.getClass().getSimpleName()
                    + " peers=" + flagged + " attacker=" + source.getEntityId() + " [server]");
        }
    }
}
