package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityAIBreakDoor;
import io.github.etim.etim.mob.ETIMEntityAIDig;
import io.github.etim.etim.mob.ETIMEntityAIMoveToTree;
import io.github.etim.etim.mob.ETIMEntityRevenant;
import io.github.etim.etim.mob.ETIMSmartDuck;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.pathfinding.PathNavigateGround;
import net.minecraft.util.DamageSource;
import net.minecraft.world.DifficultyInstance;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Zombie seat host — five injections stacked per batch:
 *
 * <p><b>AI-02 dig seat</b> — R196 hangs the dig task in the digger-base
 * constructor (EntityAnimalWatcher.java:14 {@code tasks.addTask(1, new
 * EntityAIWatchAnimal(this))}); the ETIM host is zombies only (mobs-ai
 * verdict 裁 3), so the task joins at the initEntityAI tail. Priority 1 /
 * mutex 3 are the R196 faces (:9/:14).</p>
 *
 * <p><b>B3 equipment face</b> — the R196 random-equipment chain (weapon
 * :171-201 + armor :1022-1052) replaces the vanilla face WHOLE — a TAIL
 * injection would leave the vanilla iron-sword/armor rows behind (终审伪码
 * 批注). Server side only.</p>
 *
 * <p><b>B-31 break-door seat</b> — the R196 {@code EntityZombie :18-20}
 * break-door face: {@code setBreakDoors(true)} + the CONSTANT
 * {@code tasks.addTask(1, new EntityAIBreakDoor(this))}. Vanilla 1.12 only
 * rolls its {@code EntityAIBreakDoor} seat by the spawn table
 * ({@code onInitialSpawn :535 rand < f*0.1F} / leader {@code :562}) and
 * re-arms it from NBT {@code CanBreakDoors}, both through
 * {@code setBreakDoorsAItask} — under the family flag that vanilla dynamic
 * seat is suppressed so the R196 seat cannot double-book the task table
 * (the vanilla bookkeeping — the flag field and the navigator side effect —
 * is replicated before the cancel). Flag off = vanilla keeps its whole
 * shape. R196 ghoul/earth-elemental seats are MITE-only entities and stay
 * C-level (摸底正本 {@code playground/audit/breakdoor-立项摸底.md}; the
 * frenzy carrier is {@code ETIMDigging.isFrenzied}, 补裁 C-9a).</p>
 *
 * <p><b>B-33 tree seat</b> — the R196 {@code EntityZombie :34} constant
 * {@code tasks.addTask(3, new EntityAIMoveToTree(this, 1.0F))}: the burning
 * zombie chases the tree a real player is perched in and arms the fire
 * countdown on path-found. Vanilla 1.12 has no seat here (the R196 booking
 * shares priority 3 with vanilla faces — EntityAITasks allows same-priority
 * stacking, the R196 face); flag off = no booking (the execution face is
 * flag-gated too).</p>
 *
 * <p><b>B-39 is-smart face</b> — the R196 {@code is_smart} flag (R196
 * {@code EntityZombie :13}): seeded at the constructor (R196 :35
 * {@code is_smart = isRevenant() || rand.nextInt(8) == 0}), upgraded to
 * {@code true} on player-caused surviving damage (R196 :100), persisted
 * through the {@code is_smart} NBT key (R196 :221/:239). Consumer =
 * {@code ETIMDigging.isDiggingEnabled} (R196 :404-411): a smart or frenzied
 * zombie digs bare-handed, a plain one needs a held ItemTool. All three
 * injection targets are EntityZombie overrides in 1.12
 * ({@code attackEntityFrom :253} / {@code writeEntityToNBT :400} /
 * {@code readEntityFromNBT :415}), so they inject on the subclass mixin
 * (the B-38 dropLoot lesson does not bite here).</p>
 */
@Mixin(EntityZombie.class)
public abstract class MixinEntityZombie implements ETIMSmartDuck {

    @Shadow(aliases = "isBreakDoorsTaskSet")
    private boolean isBreakDoorsTaskSet;

    @Unique
    private boolean etim$isSmartValue;

    @Override
    public boolean etim$isSmart() {
        return this.etim$isSmartValue;
    }

    @Override
    public void etim$setSmart(boolean value) {
        this.etim$isSmartValue = value;
    }

    @Inject(method = "initEntityAI", at = @At("TAIL"))
    private void etim$addDigAI(CallbackInfo ci) {
        EntityZombie zombie = (EntityZombie) (Object) this;
        // A7（2026-10-18 裁）：cfg 门只在执行面（ETIMEntityAIDig.shouldExecute 首出口），
        // 注册面只留 isRemote —— 注册面双闸使 gate=cfg 行结构性不可达。
        if (!zombie.world.isRemote) {
            zombie.tasks.addTask(1, new ETIMEntityAIDig(zombie)); // R196 :14, priority 1 / mutex 3
        }
    }

    @Inject(method = "setEquipmentBasedOnDifficulty(Lnet/minecraft/world/DifficultyInstance;)V",
            at = @At("HEAD"), cancellable = true)
    private void etim$mobEquip(DifficultyInstance difficulty, CallbackInfo ci) {
        EntityZombie zombie = (EntityZombie) (Object) this;
        if (!zombie.world.isRemote) {
            io.github.etim.etim.mob.ETIMMobEquip.zombieEquip(zombie);
            ci.cancel();
        }
    }

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$breakDoorAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving living = (EntityLiving) (Object) this;
        if (world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        if (living.getNavigator() instanceof PathNavigateGround) {
            ((PathNavigateGround) living.getNavigator()).setBreakDoors(true); // R196 EntityZombie :18
        }
        living.tasks.addTask(1, new ETIMEntityAIBreakDoor(living)); // R196 EntityZombie :20
        living.tasks.addTask(3, new ETIMEntityAIMoveToTree(living, 1.0F)); // R196 EntityZombie :34 (B-33 tree seat)
        this.etim$setSmart(living instanceof ETIMEntityRevenant || living.getRNG().nextInt(8) == 0); // R196 :35 (B-39 seed roll)
    }

    /**
     * The vanilla dynamic-seat guard (the 摸底 B-31 verdict): the vanilla
     * {@code EntityAIBreakDoor} seat must not coexist with the R196
     * constant seat. Side effects of the vanilla body are kept (the
     * {@code isBreakDoorsTaskSet} field and the navigator's break-doors
     * capability) so state reads (NBT {@code CanBreakDoors} round-trips)
     * carry the same values; only the {@code tasks.addTask} booking is
     * dropped.
     */
    @Inject(method = "setBreakDoorsAItask(Z)V", at = @At("HEAD"), cancellable = true)
    private void etim$suppressVanillaBreakDoorSeat(boolean enabled, CallbackInfo ci) {
        if (!ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla seat mechanics run untouched
        }
        this.isBreakDoorsTaskSet = enabled; // vanilla :138 bookkeeping
        EntityLiving living = (EntityLiving) (Object) this;
        if (living.getNavigator() instanceof PathNavigateGround) {
            ((PathNavigateGround) living.getNavigator()).setBreakDoors(enabled); // vanilla :139
        }
        ci.cancel();
    }

    /**
     * B-39 — the R196 {@code EntityZombie :100} player-hit upgrade:
     * {@code result != null && !result.entityWasDestroyed() &&
     * result.entityWasNegativelyAffected() && damage.wasCausedByPlayer()}.
     * The 1.12 transposition folds onto the boolean return: {@code true}
     * from the vanilla body = the damage was applied (negatively affected;
     * a blocked/cancelled hit returns false), and {@code getHealth() > 0}
     * at TAIL = not destroyed outright. Server side only, flag-gated.
     *
     * <p><b>Injection point note (B-39 r5 verdict):</b> this override has
     * TWO returns (the {@code return true} inside the super-block and the
     * final {@code return false}); {@code @At("TAIL")} only matches the
     * LAST return, so every applied-damage path (which returns true)
     * bypassed the handler entirely. {@code @At("RETURN")} matches every
     * return; the {@code getReturnValueZ()} gate keeps the R196 semantics.</p>
     */
    @Inject(method = "attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z",
            at = @At("RETURN"), cancellable = true)
    private void etim$smartOnPlayerHit(DamageSource source, float amount,
                                       CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.livestockNeedsR196) {
            return;
        }
        EntityZombie zombie = (EntityZombie) (Object) this;
        if (zombie.world.isRemote || !cir.getReturnValueZ() || zombie.getHealth() <= 0.0F) {
            return;
        }
        if (source.getTrueSource() instanceof net.minecraft.entity.player.EntityPlayer) {
            this.etim$setSmart(true); // R196 :100
        }
    }

    /**
     * B-39 — the R196 {@code is_smart} NBT round-trip (R196 :221 write /
     * :239 read; the key name is the R196 original). Both methods are
     * EntityZombie overrides in 1.12 (:400/:415).
     */
    @Inject(method = "writeEntityToNBT(Lnet/minecraft/nbt/NBTTagCompound;)V", at = @At("TAIL"))
    private void etim$writeSmartNBT(NBTTagCompound compound, CallbackInfo ci) {
        if (!ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (no is_smart key)
        }
        compound.setBoolean("is_smart", this.etim$isSmartValue); // R196 :221
    }

    @Inject(method = "readEntityFromNBT(Lnet/minecraft/nbt/NBTTagCompound;)V", at = @At("TAIL"))
    private void etim$readSmartNBT(NBTTagCompound compound, CallbackInfo ci) {
        if (!ETIMConfig.livestockNeedsR196) {
            return; // flag off: no is_smart key was written either
        }
        // R196 :239 reads unconditionally, but R196's own spawn path never
        // readFromNBTs an empty tag. 1.12 /summon DOES (CommandSummon :90-109
        // always routes through EntityList.createEntityFromNBT → readFromNBT
        // with an id-only tag), which would wipe the constructor seed. Saved
        // entities always carry the key (the write face is unconditional), so
        // hasKey separates "restore a saved entity" from "fresh construction".
        if (compound.hasKey("is_smart")) {
            this.etim$isSmartValue = compound.getBoolean("is_smart"); // R196 :239
        }
    }
}
