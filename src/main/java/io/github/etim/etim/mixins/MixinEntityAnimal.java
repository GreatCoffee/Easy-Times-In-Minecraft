package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.DespawnRules;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import io.github.etim.etim.mob.ETIMMoonState;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.entity.passive.EntityChicken;
import net.minecraft.entity.passive.EntityCow;
import net.minecraft.entity.passive.EntityPig;
import net.minecraft.entity.passive.EntitySheep;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import io.github.etim.etim.mob.ETIMEntityAIMoveToFoodItem;
import io.github.etim.etim.mob.ETIMEntityAISeekFoodIfHungry;
import io.github.etim.etim.mob.ETIMEntityAISeekShelterFromRain;
import io.github.etim.etim.mob.ETIMEntityAISeekWaterIfThirsty;
import io.github.etim.etim.mob.ETIMEntityAIGetOutOfWater;

/**
 * EntityAnimal overrides canDespawn in vanilla 1.12 with {@code false}
 * (animals never despawn) — its own mixin is therefore needed so the R196
 * animal layer + the base LOS gate actually resolve for animal entities.
 * With mobs.mobDespawnR196 = false the vanilla body (still false) wins.
 */
@Mixin(EntityAnimal.class)
public abstract class MixinEntityAnimal {

    @Inject(method = "canDespawn", at = @At("HEAD"), cancellable = true)
    private void etim$canDespawn(CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.mobDespawnR196) {
            return;
        }
        cir.setReturnValue(DespawnRules.canDespawn((EntityAnimal) (Object) this));
    }

    /**
     * B-10 batch 2 (audit20 条 303) — the R196 interaction family face
     * (water vessel / hand feed; the cow empty-bucket milking arm answers
     * earlier at MixinEntityCow HEAD and never reaches here). This mixin owns
     * the base {@code processInteract} because the chicken has no override of
     * its own while the cow/sheep/pig bodies reach this exact method through
     * their super fall-through; per the R196 non-lined hands (dye / saddle /
     * spawn egg …) dispatch returns false so the vanilla body stands. An
     * answered hand cancels entirely — the 1.12 vanilla instant-breed /
     * child-ageUp arms of this same body are faces R196 never has.
     */
    @Inject(method = "processInteract", at = @At("HEAD"), cancellable = true)
    private void etim$interactGate(EntityPlayer player, EnumHand hand, CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.livestockProductionR196) {
            return;
        }
        Object self = (Object) this;
        if (!(self instanceof EntityCow || self instanceof EntitySheep
                || self instanceof EntityPig || self instanceof EntityChicken)) {
            return; // the R196 livestock family is these four; the rest keeps vanilla
        }
        if (ETIMLivestockEvents.interactClick((EntityAnimal) (Object) this, player, hand)) {
            cir.setReturnValue(true);
        }
    }

    /**
     * B-11 (条 306/307) — the R196 Animal-layer task seat: the {@code
     * EntityAnimal} ctor :9 adds the ground-food pickup AI at task 1
     * (speed 1.0F, swim allowed). The 1.12 four livestock hosts add their
     * {@code EntityAIPanic} at the SAME priority 1 AFTER this base ctor body
     * (super runs first → this TAIL injection precedes the host body), so
     * the AI holds the R196 insertion-order seat; the AI self-gates through
     * the needs-family flag + the capability at canUse time (D-1 = needs).
     */
    @Inject(method = "<init>", at = @At("TAIL"))
    private void etim$foodPickupAITask(net.minecraft.world.World world, CallbackInfo ci) {
        ((EntityLiving) (Object) this).tasks.addTask(1,
                new ETIMEntityAIMoveToFoodItem((EntityLiving) (Object) this));
    }

    /**
     * B-23 — the R196 {@code EntityLivestock} ctor :19-20 needs-quest seats:
     * {@code addTask(2, SeekFoodIfHungry, 1.0F, swim=true)} +
     * {@code addTask(2, SeekWaterIfThirsty, 1.0F, swim=false)} on the four
     * livestock only (R196 EntityLivestock = cow/pig/sheep/chicken; horses
     * and villagers carry no seats for this family). The arms self-gate the
     * family flag + the need meters at canUse time.
     */
    @Inject(method = "<init>", at = @At("TAIL"))
    private void etim$needsSeekAITask(net.minecraft.world.World world, CallbackInfo ci) {
        Object self = (Object) this;
        if (!(self instanceof EntityCow || self instanceof EntitySheep
                || self instanceof EntityPig || self instanceof EntityChicken)) {
            return; // the R196 livestock family is these four; the rest keeps vanilla
        }
        ((EntityLiving) (Object) this).tasks.addTask(2,
                new ETIMEntityAISeekFoodIfHungry((EntityLiving) (Object) this, 1.0F));
        ((EntityLiving) (Object) this).tasks.addTask(2,
                new ETIMEntityAISeekWaterIfThirsty((EntityLiving) (Object) this, 1.0F));
    }

    /**
     * B-19 (C-16-5 residual) — the R196 {@code EntityLivestock} ctor :23
     * shelter seat: {@code addTask(4, EntityAISeekShelterFromRain, 1.0F)} on
     * the four livestock only (R196 {@code EntityLivestock} = cow/pig/sheep/
     * chicken; other 1.12 {@code EntityAnimal}s keep vanilla and get no
     * seat). The AI self-gates the family flag + the thirsty cut + the rain
     * face at canUse time (D-1 = needs).
     */
    @Inject(method = "<init>", at = @At("TAIL"))
    private void etim$shelterAITask(net.minecraft.world.World world, CallbackInfo ci) {
        Object self = (Object) this;
        if (!(self instanceof EntityCow || self instanceof EntitySheep
                || self instanceof EntityPig || self instanceof EntityChicken)) {
            return; // the R196 livestock family is these four; the rest keeps vanilla
        }
        ((EntityLiving) (Object) this).tasks.addTask(4,
                new ETIMEntityAISeekShelterFromRain((EntityLiving) (Object) this, 1.0F));
    }

    /**
     * B-22 — the R196 {@code EntityLivestock} ctor :24 twin seat: the
     * get-out-of-water arm rides the SAME priority-4 group and the same
     * four-livestock gate (the twin of the B-19 rain-shelter seat above).
     */
    @Inject(method = "<init>", at = @At("TAIL"))
    private void etim$outOfWaterAITask(net.minecraft.world.World world, CallbackInfo ci) {
        Object self = (Object) this;
        if (!(self instanceof EntityCow || self instanceof EntitySheep
                || self instanceof EntityPig || self instanceof EntityChicken)) {
            return; // the R196 livestock family is these four; the rest keeps vanilla
        }
        ((EntityLiving) (Object) this).tasks.addTask(4,
                new ETIMEntityAIGetOutOfWater((EntityLiving) (Object) this, 1.0F));
    }

    /**
     * Blue-moon animal light-bypass (audit 18 verdict, R196
     * SpawnerAnimals:399 passes perform_light_check=false for the blue
     * animal season). Redirects only the {@code getLight(BlockPos)} point
     * inside EntityAnimal.getCanSpawnHere() — grass gate and the rest of
     * the chain untouched. The no-boolean overload is the exact call the
     * 1.12 vanilla body makes (audit 18 engineering note 1). Armed = 16 so
     * the >8 threshold passes; unarmed passes the original value through,
     * leaving blood/new/full/day-side animals byte-identical to vanilla.
     */
    @Redirect(
        method = "getCanSpawnHere()Z",
        at = @At(value = "INVOKE", target = "Lnet/minecraft/world/World;getLight(Lnet/minecraft/util/math/BlockPos;)I"))
    private int etim$blueAnimalLightGate(World world, BlockPos pos) {
        return ETIMMoonState.animalLightBypass() ? 16 : world.getLight(pos);
    }
}
