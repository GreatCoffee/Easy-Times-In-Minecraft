package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMEndurance;
import io.github.etim.etim.hunger.ETIMHunger;
import io.github.etim.etim.combat.ETIMDamageLog;
import io.github.etim.etim.playerstate.ETIMBedSafety;
import io.github.etim.etim.playerstate.ETIMXp;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.PlayerCapabilities;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.DamageSource;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.List;

/**
 * Hard level cap (task 1.2): player levels stop at {@code ETIMConfig.levelCap}.
 *
 * <p>{@code addExperienceLevel} is the single funnel through which every
 * level increase flows: {@code addExperience} (XP points) loops
 * {@code addExperienceLevel(1)}, and commands/anvils call it directly.
 * Clamping the incoming amount here caps both paths. Decreases
 * (enchanting, future death penalty) are never clamped.</p>
 *
 * <p>Task 2.3 hunger penalties (both decision points inside
 * {@code onLivingUpdate}, single call sites each):
 * <ul>
 *   <li>Walk speed &times;0.75 while hungry — R196 charges the factor inside
 *       {@code PlayerCapabilities.getWalkSpeed()} (PlayerCapabilities.java:57:
 *       {@code hasFoodEnergy ? walkSpeed : walkSpeed * 0.75}) fed into
 *       {@code EntityPlayer.onLivingUpdate}'s {@code setBaseValue}.</li>
 *   <li>Air movement &times;0.75 while hungry — R196 multiplies
 *       {@code jumpMovementFactor} right after the sprint additive
 *       (EntityPlayer.java:693-695); in vanilla 1.12 the only later call in
 *       that method is {@code setAIMoveSpeed}, used as the injection point
 *       (the flying branch overrides the field itself in {@code travel},
 *       untouched, same as R196).</li>
 * </ul></p>
 */
@Mixin(EntityPlayer.class)
public abstract class MixinEntityPlayer {

    @ModifyVariable(method = "addExperienceLevel", at = @At("HEAD"), argsOnly = true, ordinal = 0)
    private int etim$clampLevelGain(int levels) {
        if (levels <= 0) {
            return levels;
        }
        EntityPlayer self = (EntityPlayer) (Object) this;
        int allowed = ETIMConfig.levelCap - self.experienceLevel;
        return Math.min(levels, Math.max(0, allowed));
    }

    /**
     * ❗F-10-11 配套（audit20-10 R1 must-add）：{@code addExperience(int)} 整体
     * 收敛到单池曲线——经验球/命令/一切 points 路径经 {@code ETIMXp.applyTotal}
     * 重写三元组，不再走 vanilla 逐级循环（曲线分裂死口）。负值（扣点）同门：
     * applyTotal 的债务支承载。附魔扣点走 addExperienceLevel（F-4-6 通道），不经此。
     */
    @Inject(method = "addExperience(I)V", at = @At("HEAD"), cancellable = true, remap = true)
    private void etim$addExperienceSinglePool(int amount, CallbackInfo ci) {
        ci.cancel();
        EntityPlayer self = (EntityPlayer) (Object) this;
        ETIMXp.applyTotal(self, self.experienceTotal + amount);
    }

    @Redirect(
            method = "onLivingUpdate",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/player/PlayerCapabilities;getWalkSpeed()F"
            ),
            require = 1
    )
    private float etim$hungerWalkSpeed(PlayerCapabilities capabilities) {
        float speed = capabilities.getWalkSpeed();
        if (ETIMConfig.hungerMoveFactor >= 1.0F || ETIMHunger.hasFoodEnergy((EntityPlayer) (Object) this)) {
            return speed;
        }
        return speed * ETIMConfig.hungerMoveFactor;
    }

    @Inject(
            method = "onLivingUpdate",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/player/EntityPlayer;setAIMoveSpeed(F)V"
            ),
            require = 1
    )
    private void etim$hungerAirFactor(CallbackInfo ci) {
        if (ETIMConfig.hungerMoveFactor >= 1.0F || ETIMHunger.hasFoodEnergy((EntityPlayer) (Object) this)) {
            return;
        }
        // jumpMovementFactor is public on EntityLivingBase — no shadow needed.
        ((EntityPlayer) (Object) this).jumpMovementFactor *= ETIMConfig.hungerMoveFactor;
    }

    /**
     * Movement five-branch pool drain (R196 EntityPlayer:1680-1730
     * addMovementStat, bare addHungerServerSide per branch; movement product
     * line, 终审 G-M1 = A single TAIL hook). 1.12.2 runs this method
     * server-side from the movement packets (NetHandlerPlayServer:411/:589)
     * and travel (:1989) — the drain inherits the vanilla stats counting
     * semantics by construction; branch classification is re-evaluated in
     * the same order inside ETIMEndurance.chargeMovement.
     */
    @Inject(method = "addMovementStat", at = @At("TAIL"), remap = true)
    private void etim$moveDrain(double dx, double dy, double dz, CallbackInfo ci) {
        ETIMEndurance.chargeMovement((EntityPlayer) (Object) this, dx, dy, dz);
    }

    /**
     * bed-entry S1 (verdict批文 1/M2/M3) — R196 NOT_SAFE pathable face
     * (EntityPlayer.java:1347-1384: IMob federation + navigator path reaching
     * the bed) replaces the vanilla EntityMob AABB probe at :1697. Vanilla
     * queries EntityMob only and has no pathability filter (a walled-in mob
     * refuses the bed anyway); R196 needs the threat to be able to actually
     * reach the bed. Config off = vanilla passthrough.
     *
     * <p>The redirect returns the R196 nearest-pathable-IMob as a singleton
     * list (empty = no refuse). The vanilla NOT_SAFE branch (BlockBed :127-129)
     * sends its own message; the [SleepLog] bed-refuse row is emitted here.</p>
     */
    @Redirect(
            method = "trySleep",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/world/World;getEntitiesWithinAABB(Ljava/lang/Class;Lnet/minecraft/util/math/AxisAlignedBB;Lcom/google/common/base/Predicate;)Ljava/util/List;"
            ),
            require = 1
    )
    private List etim$bedNotSafe(World world, Class clazz, AxisAlignedBB aabb,
            com.google.common.base.Predicate predicate) {
        if (!ETIMConfig.bedHostilePathable) {
            return world.getEntitiesWithinAABB(clazz, aabb, predicate); // vanilla face
        }
        List hostiles = ETIMBedSafety.pathableHostilesNearBed(world, aabb);
        if (!hostiles.isEmpty()) {
            ETIMBedSafety.logBedRefuse(world, "notSafe", aabb);
        }
        return hostiles;
    }

    // ==================== batch D — the player damage-entity row (A-1① audit20-89) ====================

    /**
     * The player path of the five-segment row A — the overridden
     * {@code damageEntity} ({@code entity/player/EntityPlayer.java:1223});
     * the mob mixin's own {@code damageEntity} pair never fires here (single
     * dispatch each, audit20-90 pin ⑤). Row = {@code dmg … damageDebugLog} gate
     * ({@link ETIMDamageLog}); the dice-full-block face (>1230 ≤0 early exit)
     * keeps the row from ever firing for a dice hit, matching R196's
     * "no packet" face (report §6.2:2:3).
     */
    @Inject(method = "damageEntity", at = @At("HEAD"))
    private void etim$beginDamage(DamageSource source, float amount, CallbackInfo ci) {
        ETIMDamageLog.begin(net.minecraft.entity.EntityLivingBase.class.cast(this), source, amount);
    }

    @Inject(method = "damageEntity", at = @At("RETURN"))
    private void etim$endDamage(DamageSource source, float amount, CallbackInfo ci) {
        ETIMDamageLog.end(net.minecraft.entity.EntityLivingBase.class.cast(this), source);
    }
}
