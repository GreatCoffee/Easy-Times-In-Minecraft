package io.github.etim.etim.mixins;

import io.github.etim.etim.world.ETIMDimensions;
import io.github.etim.etim.mob.ETIMEntityLongdead;
import io.github.etim.etim.mob.ETIMMobEquip;
import net.minecraft.entity.monster.EntitySkeleton;
import net.minecraft.entity.monster.EntitySpider;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * M5-11 — the R196 spider-jockey face ({@code EntitySpider.java:13-22} +
 * {@code :27-31}): the 1/100 rider is a Longdead in the underworld and a
 * normal skeleton elsewhere. R196's {@code getMountedSkeleton} do-while
 * re-rolls until the skeleton type is 0 (the bow face) — the ETIM transposition
 * forces the ranged face directly via {@code setJockeyRanged(true)} (the type
 * roll itself runs in the equip dispatch, one roll instead of a loop — same
 * result, no EntitySkeleton type datum in 1.12, B-10).
 *
 * <p>The redirect replaces the {@code new EntitySkeleton} in
 * {@code EntitySpider.onInitialSpawn} (1.12
 * {@code entity/monster/EntitySpider.java:220}); the vanilla face then runs
 * its own {@code onInitialSpawn}/{@code spawnEntity}/{@code startRiding} on
 * the returned instance (:222-225 unchanged).</p>
 */
@Mixin(EntitySpider.class)
public abstract class MixinEntitySpiderJockey {

    @Redirect(
            method = "onInitialSpawn",
            at = @At(value = "NEW", target = "net/minecraft/entity/monster/EntitySkeleton"),
            require = 1
    )
    private EntitySkeleton etim$jockey(World world) {
        if (ETIMDimensions.isUnderworld(world)) {
            ETIMEntityLongdead longdead = new ETIMEntityLongdead(world);
            longdead.setJockeyRanged(true); // R196 :15-19 — reroll until type 0 (bow)
            ETIMMobEquip.mobLog("spider jockey class=ETIMEntityLongdead underworld=true");
            return longdead;
        }
        ETIMMobEquip.mobLog("spider jockey class=EntitySkeleton underworld=false");
        return new EntitySkeleton(world);
    }
}
