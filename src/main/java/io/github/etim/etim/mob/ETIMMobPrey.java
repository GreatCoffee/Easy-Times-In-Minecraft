package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.world.World;

import java.util.List;
import java.util.function.Predicate;

/**
 * B-55 — R196 {@code World.getClosestPrey} (World.java:5139-5165), the bat
 * family's target picker.
 *
 * <p>R196 expands the attacker's AABB by the radius, keeps living entities
 * that are alive with health &gt; 0, satisfy the attacker's {@code preysUpon},
 * are inside the attacker's line of sight ({@code requires_los = true} at both
 * bat call sites) and — when asked — reachable by path. Both bats pass
 * {@code requires_path = false}, so this takes the sight flag and keeps the
 * nearest survivor.</p>
 */
public final class ETIMMobPrey {

    private ETIMMobPrey() {
    }

    public static EntityLivingBase findNearest(World world, EntityLiving self,
                                               double range, Predicate<EntityLivingBase> prey) {
        List<EntityLivingBase> candidates = world.getEntitiesWithinAABB(EntityLivingBase.class,
                self.getEntityBoundingBox().grow(range, range, range), candidate ->
                        candidate != self && !candidate.isDead && candidate.getHealth() > 0.0F);
        EntityLivingBase best = null;
        double bestSq = Double.MAX_VALUE;
        for (EntityLivingBase candidate : candidates) {
            if (!prey.test(candidate)) {
                continue;
            }
            if (!self.getEntitySenses().canSee(candidate)) {
                continue;
            }
            double distSq = self.getDistanceSq(candidate);
            if (distSq < bestSq) {
                bestSq = distSq;
                best = candidate;
            }
        }
        return best;
    }
}
