package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityAgeable;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * B-12 (audit20 条 309) — the R196 mating value faces that live inside
 * {@code EntityAIMate.spawnBaby}. The 1.12 vanilla task itself is registered
 * by the four livestock hosts at the R196 warm-mate seat (b2-verified:
 * EntityCow:46 p2 / Pig:60 p3 / Chicken:60 p2 / Sheep:100 p2), so the task
 * itself needs no carrier work — only three value faces differ:
 * <ul>
 *   <li>F-A(1) the parents' post-breeding cooldown — R196
 *       {@code EntityAgeable.setGrowingAgeAfterBreeding :57-59} =
 *       {@code setGrowingAge(16000)}, vanilla writes {@code 6000}. 16000
 *       ticks is 13:20 vs vanilla 5:00.</li>
 *   <li>F-A(2) the newborn's starting age — R196
 *       {@code setGrowingAgeToNewborn :53-55} = {@code -64000}
 *       ({@code getGrowingAgeOfNewborn :49-51}), vanilla writes
 *       {@code -24000}. -64000 ticks is 53:20 of child life.</li>
 *   <li>F-A(3) the wellness adoption — R196
 *       {@code EntityLivestock.adoptWellnessFromParents :395-409}: each
 *       need takes {@code min(parent_a, parent_b)}, non-livestock parents
 *       counting as 1.0F, gated on {@code !isRemote}. Vanilla never does
 *       this — without the adopt the newborn would start from the R196
 *       wellness init face (0.8+rand*0.2) instead of being a product of
 *       its parents' husbandry.</li>
 * </ul>
 *
 * <p>The {@code setGrowingAge} redirect inside {@code spawnBaby} covers
 * every write in the method — the normal spawn branch (two {@code 6000}
 * parent writes + one {@code -24000} newborn write) and the Forge
 * {@code BabyEntitySpawnEvent} cancelled branch (two more {@code 6000}s,
 * C-12-1: R196 has no event branch, the event-carrier face never fires in
 * ETIM, and the parent-cooldown faces read the R196 constant either way).
 * The {@code spawnEntity} redirect answers F-A(3) exactly at the reached
 * call site — inside the {@code entityageable != null} branch, so an
 * unspawnable child resolves before adoption ever runs (R196 :69-78
 * structure).</p>
 */
@Mixin(net.minecraft.entity.ai.EntityAIMate.class)
public abstract class MixinEntityAIMate {

    @Shadow
    @Final
    private EntityAnimal animal;

    @Shadow
    private EntityAnimal targetMate;

    @Redirect(
        method = "spawnBaby",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/EntityAgeable;setGrowingAge(I)V"),
        require = 1)
    private void etim$breedAges(EntityAgeable ageable, int age) {
        ageable.setGrowingAge(ETIMLivestockEvents.r196BreedCooldown(age));
    }

    /** The parent {@code 6000 cooldown} writes ({@code :143-144} and the
     * BabyEvent-cancel twin {@code :121-122}), four call sites: javac emits
     * the {@code invokevirtual} with the static receiver {@code EntityAnimal}
     * ({@code net/minecraft/entity/passive}!), so they are invisible to the
     * {@code EntityAgeable}-owner capture above (b12-smoke R1: the child
     * landed at R196 {@code -64000} while the parents kept vanilla
     * {@code 6000}). R196 {@code setGrowingAgeAfterBreeding :57-59} = 16000
     * for the same calls. {@code require = 1} per B-12-1.
     */
    @Redirect(
        method = "spawnBaby",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/passive/EntityAnimal;setGrowingAge(I)V"),
        require = 1)
    private void etim$breedAdultAges(EntityAnimal animal, int age) {
        animal.setGrowingAge(ETIMLivestockEvents.r196BreedCooldown(age));
    }

    @Redirect(
        method = "spawnBaby",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/world/World;spawnEntity(Lnet/minecraft/entity/Entity;)Z"),
        require = 1)
    private boolean etim$spawnThenAdopt(World world, Entity entity) {
        boolean ok = world.spawnEntity(entity);
        if (ok && !world.isRemote) { // R196 :76 !isRemote gate — verbatim
            ETIMLivestockEvents.adoptWellnessFromParents(
                    (EntityAgeable) entity, this.animal, this.targetMate);
        }
        return ok;
    }
}
