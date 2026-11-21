package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMBatHanging;
import net.minecraft.entity.passive.EntityBat;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-53 census D :288 — the R196 bat hanging state machine
 * ({@code EntityBat.java:130-230}).
 *
 * <p>R196 and 1.12 agree that a hanging bat is pinned to a ceiling and a
 * released bat coasts; they disagree on how the ceiling is picked, when a
 * hurt bat lets go, and on the re-hang cadence. The mixin owns the R196
 * {@code block_hanging_from_y}, the first-attempt flag, and the 60-tick
 * prevent window on the server; the vanilla body is suppressed only for
 * the two {@code setIsBatHanging} calls inside {@code updateAITasks}, then
 * the R196 state machine runs at TAIL. A released bat's Y is moved to the
 * R196 drop offset, which the client sees through normal position sync —
 * no extra DataParameter (C-level note).</p>
 */
@Mixin(EntityBat.class)
public abstract class MixinEntityBat {

    @Unique
    private int etim$blockHangingFromY = -1;

    @Unique
    private boolean etim$initialHangAttempted;

    @Unique
    private int etim$preventHangCountdown;

    @Unique
    private boolean etim$wasHanging;

    @Unique
    private boolean etim$hangPinLogged;

    @Inject(method = "onUpdate", at = @At("TAIL"))
    private void etim$hangTick(CallbackInfo ci) {
        if (!ETIMConfig.mobBatHangingR196) {
            return;
        }
        EntityBat bat = (EntityBat) (Object) this;
        if (bat.world.isRemote) {
            return;
        }
        if (this.etim$preventHangCountdown > 0) {
            this.etim$preventHangCountdown--; // R196 :131-133
        }
        if (bat.getIsBatHanging()) {
            if (bat.hurtResistantTime > 0) { // R196 :140-146
                int blockY = this.etim$blockHangingFromY;
                this.etim$blockHangingFromY = -1;
                ETIMBatHanging.unhang(bat, blockY);
            } else {
                if (this.etim$blockHangingFromY < 0) {
                    this.etim$blockHangingFromY = ETIMBatHanging.getNewBlockHangingFromY(bat);
                }
                if (this.etim$blockHangingFromY < 0
                        || !ETIMBatHanging.canHangFromBlock(bat, this.etim$hangBlockPos(bat))) {
                    int blockY = this.etim$blockHangingFromY;
                    this.etim$blockHangingFromY = -1;
                    ETIMBatHanging.unhang(bat, blockY);
                } else {
                    ETIMBatHanging.pin(bat, this.etim$blockHangingFromY); // R196 :147-150
                    if (!this.etim$hangPinLogged) {
                        this.etim$hangPinLogged = true;
                        if (ETIMConfig.mobDebugLog) {
                            ETIM.LOGGER.info("[BatLog] hang blockY=" + this.etim$blockHangingFromY
                                    + " pos=" + String.format("%.2f,%.2f,%.2f", bat.posX, bat.posY, bat.posZ)
                                    + " entity=EntityBat#" + bat.getEntityId());
                        }
                    }
                }
            }
        }
        this.etim$wasHanging = bat.getIsBatHanging();
    }

    /**
     * R196 {@code setIsBatHanging}: hang pins at once; release from a hang
     * arms the 60-tick prevent counter and drops to
     * {@code blockY - height - 0.01}.
     */
    @Inject(method = "setIsBatHanging", at = @At("TAIL"))
    private void etim$onSetHanging(boolean hanging, CallbackInfo ci) {
        if (!ETIMConfig.mobBatHangingR196) {
            return;
        }
        EntityBat bat = (EntityBat) (Object) this;
        if (bat.world.isRemote) {
            return;
        }
        if (!hanging && this.etim$wasHanging) {
            this.etim$preventHangCountdown = 60; // R196 :96-100
            if (this.etim$blockHangingFromY >= 0) {
                bat.setPosition(bat.posX,
                        (double) this.etim$blockHangingFromY - (double) bat.height
                                - ETIMBatHanging.UNHANG_OFFSET,
                        bat.posZ);
            }
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[BatLog] release blockY=" + this.etim$blockHangingFromY
                        + " prevent=" + this.etim$preventHangCountdown
                        + " entity=EntityBat#" + bat.getEntityId());
            }
        }
        if (hanging) {
            if (this.etim$blockHangingFromY >= 0) {
                ETIMBatHanging.pin(bat, this.etim$blockHangingFromY);
            }
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[BatLog] hang blockY=" + this.etim$blockHangingFromY
                        + " pos=" + String.format("%.2f,%.2f,%.2f", bat.posX, bat.posY, bat.posZ)
                        + " entity=EntityBat#" + bat.getEntityId());
            }
        } else {
            this.etim$blockHangingFromY = -1;
            this.etim$hangPinLogged = false;
        }
        this.etim$wasHanging = hanging;
    }

    /**
     * Vanilla's {@code updateAITasks} calls {@code setIsBatHanging} in both
     * branches. Swallow those two calls while the R196 flag is on; the TAIL
     * handler below replaces the whole state machine. Off = pass through.
     */
    @Redirect(
            method = "updateAITasks",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/entity/passive/EntityBat;setIsBatHanging(Z)V"))
    private void etim$redirectVanillaHang(EntityBat bat, boolean hanging) {
        if (!ETIMConfig.mobBatHangingR196) {
            bat.setIsBatHanging(hanging);
        }
    }

    @Inject(method = "updateAITasks", at = @At("TAIL"))
    private void etim$updateAITasks(CallbackInfo ci) {
        if (!ETIMConfig.mobBatHangingR196) {
            return;
        }
        EntityBat bat = (EntityBat) (Object) this;
        if (bat.world.isRemote) {
            return;
        }
        boolean prevented = ETIMBatHanging.isPrevented(bat, this.etim$preventHangCountdown);
        if (bat.getIsBatHanging()) {
            if (this.etim$blockHangingFromY < 0) {
                this.etim$blockHangingFromY = ETIMBatHanging.getNewBlockHangingFromY(bat);
            }
            if (this.etim$blockHangingFromY < 0
                    || !ETIMBatHanging.canHangFromBlock(bat, this.etim$hangBlockPos(bat))) {
                int blockY = this.etim$blockHangingFromY;
                this.etim$blockHangingFromY = -1;
                ETIMBatHanging.unhang(bat, blockY); // R196 :202-207
                return;
            }
            if (bat.getRNG().nextInt(200) == 0) { // R196 :209
                bat.rotationYawHead = bat.rotationYaw;
            }
            if (prevented || bat.getRNG().nextInt(1000) == 0) { // R196 :210-215
                int blockY = this.etim$blockHangingFromY;
                this.etim$blockHangingFromY = -1;
                ETIMBatHanging.unhang(bat, blockY);
            } else {
                ETIMBatHanging.pin(bat, this.etim$blockHangingFromY);
            }
            return;
        }

        if (prevented) {
            return;
        }
        int roll = this.etim$initialHangAttempted ? 10 : 1; // R196 :222-228
        if (bat.getRNG().nextInt(roll) == 0) {
            int newY = ETIMBatHanging.getNewBlockHangingFromY(bat);
            if (newY >= 0) {
                this.etim$blockHangingFromY = newY;
                this.setHanging(bat, true);
                ETIMBatHanging.pin(bat, newY);
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[BatLog] rehang blockY=" + newY
                            + " pos=" + String.format("%.2f,%.2f,%.2f", bat.posX, bat.posY, bat.posZ)
                            + " entity=EntityBat#" + bat.getEntityId());
                }
            }
        }
        this.etim$initialHangAttempted = true;
    }

    @Inject(method = "writeEntityToNBT", at = @At("TAIL"))
    private void etim$writeHangNBT(NBTTagCompound compound, CallbackInfo ci) {
        if (!ETIMConfig.mobBatHangingR196) {
            return;
        }
        compound.setInteger("ETIMBlockHangingFromY", this.etim$blockHangingFromY);
        compound.setBoolean("ETIMInitialHangAttempted", this.etim$initialHangAttempted);
        compound.setInteger("ETIMPreventHangCountdown", this.etim$preventHangCountdown);
    }

    @Inject(method = "readEntityFromNBT", at = @At("TAIL"))
    private void etim$readHangNBT(NBTTagCompound compound, CallbackInfo ci) {
        if (!ETIMConfig.mobBatHangingR196) {
            return;
        }
        if (compound.hasKey("ETIMBlockHangingFromY")) {
            this.etim$blockHangingFromY = compound.getInteger("ETIMBlockHangingFromY");
            this.etim$initialHangAttempted = compound.getBoolean("ETIMInitialHangAttempted");
            this.etim$preventHangCountdown = compound.getInteger("ETIMPreventHangCountdown");
            this.etim$wasHanging = ((EntityBat) (Object) this).getIsBatHanging();
        }
    }

    @Unique
    private BlockPos etim$hangBlockPos(EntityBat bat) {
        return new BlockPos(
                MathHelper.floor(bat.posX),
                this.etim$blockHangingFromY,
                MathHelper.floor(bat.posZ));
    }

    /**
     * Calls the target's public setter without tripping the redirect above
     * (the redirect only rewrites invocations inside updateAITasks).
     */
    @Unique
    private void setHanging(EntityBat bat, boolean hanging) {
        bat.setIsBatHanging(hanging);
    }
}
