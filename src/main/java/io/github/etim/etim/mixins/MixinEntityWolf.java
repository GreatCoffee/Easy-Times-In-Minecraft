package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMDigging;
import io.github.etim.etim.mob.ETIMEntityAIPanic;
import io.github.etim.etim.mob.ETIMEntityAITargetIfHostileToPlayers;
import io.github.etim.etim.mob.ETIMWolfHostilityDuck;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.DamageSource;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * B-29 — the R196 {@code EntityWolf :39} panic seat: {@code addTask(1,
 * EntityAIFleeAttackerOrPanic, 1.0F, 0.0F)}. The chance-0 face means the
 * wolf never re-panics from the chance roll — but the flee face (revenge
 * target under 32F) and the burn/spook faces ride the same arm. The 1.12
 * vanilla wolf ctor has NO EntityAIPanic seat (L81 tasks only swimming/
 * sit/avoid/leap/attack/wander) — so this is add-only, no removeIf face.
 *
 * <p>B-34 — the R196 hostility faces, all add-only:</p>
 * <ul>
 *   <li>the R196 {@code EntityWolf :38} targeting seat —
 *       {@code targetTasks.addTask(3, EntityAITargetIfHostileToPlayers(…,
 *       EntityPlayer.class, 0, true))} (the same {@code <init>} TAIL
 *       handler family, the B-31/B-33 precedent);</li>
 *   <li>the duck {@link ETIMWolfHostilityDuck} — the R196
 *       {@code hostile_to_players} byte ({@code :85-92}) + the
 *       {@code target_countdown} ({@code :184-195});</li>
 *   <li>{@code onUpdate TAIL} — the R196 {@code :184-207} face: the
 *       countdown decrement + the timeout clear (target = null + the
 *       hostile off) + the frenzy arm {@code !isTamed() &&
 *       isBloodMoon(true) → setHostile(true)} — the moon seam = the B-33
 *       C-9a carrier {@link ETIMDigging#isFrenzied(EntityLiving)};</li>
 *   <li>{@code attackEntityAsMob TAIL} — the R196 {@code :318-324} bite
 *       re-arm (the target survived → startTargetCountdown);</li>
 *   <li>{@code attackEntityFrom TAIL} — the R196 {@code :330-340}
 *       setAttackTarget-override parity: a surviving player source → the
 *       hostile set + the countdown (the 1.12 vanilla {@code :363} has no
 *       setAttackTarget override to hook — the carrier = the wolf's own
 *       attackEntityFrom, C-note);</li>
 *   <li>{@code writeEntityToNBT/readEntityFromNBT TAIL} — the R196
 *       {@code :104-105/:117} persistence under the R196 key names.</li>
 * </ul>
 *
 * <p>Flag seat = <b>livestockNeedsR196</b> (the thirteenth reuse).
 * {@code is_witch_ally} is out of scope (the R196 summon mechanism
 * {@code :617}, ETIM never makes wolves witch-allies — C-note).</p>
 */
@Mixin(net.minecraft.entity.passive.EntityWolf.class)
public abstract class MixinEntityWolf implements ETIMWolfHostilityDuck {

    /** R196 :85-92 — the hostile_to_players byte (the 1.12 carrier = the field). */
    @Unique
    private boolean etim$hostileToPlayers = false;

    /** R196 :184-195 — the target_countdown (800±100 ticks ≈ 40 s). */
    @Unique
    private int etim$targetCountdown = 0;

    // ------------------------------------------------------------------
    // B-29 — the panic/flee seat (unchanged)
    // ------------------------------------------------------------------

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$panicFleeAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving living = (EntityLiving) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        living.tasks.addTask(1, new ETIMEntityAIPanic(living, 1.0F, 0.0F)); // R196 EntityWolf :39
    }

    // ------------------------------------------------------------------
    // B-34 — the hostility faces
    // ------------------------------------------------------------------

    /** B-34 — the R196 {@code EntityWolf :38} targeting seat (same TAIL handler family). */
    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$wolfTargetAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving living = (EntityLiving) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        living.targetTasks.addTask(3,
                new ETIMEntityAITargetIfHostileToPlayers((net.minecraft.entity.EntityCreature) living)); // R196 EntityWolf :38
    }

    /** R196 :85-92 — the hostile face. */
    @Override
    public boolean etim$isHostileToPlayers() {
        return this.etim$hostileToPlayers;
    }

    @Override
    public void etim$setHostileToPlayers(boolean hostile) {
        this.etim$hostileToPlayers = hostile;
    }

    /** R196 :184-195 — the countdown face. */
    @Override
    public int etim$getTargetCountdown() {
        return this.etim$targetCountdown;
    }

    @Override
    public void etim$setTargetCountdown(int countdown) {
        this.etim$targetCountdown = countdown;
    }

    /** R196 :305-307 — startTargetCountdown() carrier (freshCountdown formula). */
    @Unique
    private void etim$startTargetCountdown() {
        java.util.Random rng = ((EntityLiving) (Object) this).getRNG();
        this.etim$targetCountdown = ETIMWolfHostilityDuck.freshCountdown(rng);
    }

    /**
     * R196 :184-207 — the onUpdate face: the countdown decrement, the
     * timeout clear, the frenzy arm. Order = the R196's (the timeout clear
     * first, the frenzy set last — the frenzy re-arms the flag every tick
     * during the blood moon).
     */
    @Inject(method = "onUpdate", at = @At("TAIL"))
    private void etim$wolfHostilityTick(CallbackInfo ci) {
        EntityLiving self = (EntityLiving) (Object) this;
        net.minecraft.entity.passive.EntityWolf wolf = (net.minecraft.entity.passive.EntityWolf) (Object) this;
        if (self.world.isRemote) {
            return;
        }
        if (this.etim$targetCountdown > 0) { // R196 :184-195
            this.etim$targetCountdown--;
            if (this.etim$targetCountdown == 0) {
                if (self.getAttackTarget() != null) {
                    self.setAttackTarget(null);
                }
                this.etim$hostileToPlayers = false;
            }
        }
        // R196 :205-207 — the frenzy arm (the ETIM moon seam, the B-33 C-9a carrier)
        if (!wolf.isTamed() && ETIMDigging.isFrenzied(self)) {
            this.etim$hostileToPlayers = true;
        }
    }

    /** R196 :318-324 — the bite re-arm (the target survived → startTargetCountdown). */
    @Inject(method = "attackEntityAsMob", at = @At("TAIL"))
    private void etim$wolfBiteReArm(Entity entityIn, CallbackInfoReturnable<Boolean> cir) {
        Boolean ret = cir.getReturnValue();
        if (ret == null || !ret.booleanValue()) {
            return; // the target survived = the true face
        }
        net.minecraft.entity.passive.EntityWolf wolf = (net.minecraft.entity.passive.EntityWolf) (Object) this;
        if (wolf.isTamed()) {
            return;
        }
        etim$startTargetCountdown();
    }

    /**
     * The R196 {@code :330-340} setAttackTarget-override parity: a
     * surviving player source → the hostile set + the countdown. Carrier =
     * the wolf's own attackEntityFrom (the 1.12 vanilla has no
     * setAttackTarget override on EntityWolf — C-note).
     */
    @Inject(method = "attackEntityFrom", at = @At("TAIL"))
    private void etim$wolfHurtHostility(DamageSource source, float amount, CallbackInfoReturnable<Boolean> cir) {
        Boolean ret = cir.getReturnValue();
        if (ret == null || !ret.booleanValue() || source == null) {
            return;
        }
        net.minecraft.entity.passive.EntityWolf wolf = (net.minecraft.entity.passive.EntityWolf) (Object) this;
        if (wolf.isTamed()) {
            return;
        }
        Entity src = source.getTrueSource();
        if (src instanceof EntityPlayer) { // the R196 :336 target instanceof EntityPlayer face
            this.etim$hostileToPlayers = true;
            etim$startTargetCountdown();
        }
    }

    /** R196 :104-105 — the persistence, the R196 key names. */
    @Inject(method = "writeEntityToNBT", at = @At("TAIL"))
    private void etim$wolfHostilityWrite(NBTTagCompound compound, CallbackInfo ci) {
        compound.setBoolean("hostile_to_players", this.etim$hostileToPlayers);
        compound.setInteger("target_countdown", this.etim$targetCountdown);
    }

    /** R196 :117 — the restore. */
    @Inject(method = "readEntityFromNBT", at = @At("TAIL"))
    private void etim$wolfHostilityRead(NBTTagCompound compound, CallbackInfo ci) {
        if (compound.hasKey("hostile_to_players")) {
            this.etim$hostileToPlayers = compound.getBoolean("hostile_to_players");
        }
        if (compound.hasKey("target_countdown")) {
            this.etim$targetCountdown = compound.getInteger("target_countdown");
        }
    }
}
