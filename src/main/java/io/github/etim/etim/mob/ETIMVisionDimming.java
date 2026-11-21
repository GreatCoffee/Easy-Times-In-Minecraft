package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;

/**
 * B-55 — R196 {@code vision_dimming} (EntityPlayer.java:45, :658-663,
 * :1007/:1027, {@code MITEConstant.vision_dimming_attenuation_per_tick
 * = 0.01F}).
 *
 * <p>R196 stores the value on the player, clamps it to [0, 2.0] once per tick
 * and bleeds it down by 0.01 per tick; the nightwing (and shadow) add to it,
 * and the client draws a black overlay with alpha {@code min(value, 0.9)}.
 * The 1.12 carrier keeps the server value on the player (mixin field, NBT
 * {@code vision_dimming}) and mirrors it to the client through
 * {@link ETIMVisionDimmingNetwork} for the overlay.</p>
 */
public final class ETIMVisionDimming {

    /** R196 MITEConstant:18 — the per-tick attenuation. */
    public static final float DECAY_PER_TICK = 0.01F;
    /** R196 EntityPlayer.java:660-661 — the clamp above 2.0. */
    public static final float MAX_VALUE = 2.0F;

    private ETIMVisionDimming() {
    }

    /** B-55 probe only: freezes the decay so the NBT round trip can be judged. */
    private static boolean probeHold;

    /** B-55 probe only — {@code /etest dimhold} sets the value without decay. */
    public static void setHeld(EntityPlayer player, float value) {
        set(player, value);
        probeHold = true;
    }

    /** R196 EntityNightwing.java:68 / EntityShadow.java:65 — {@code vision_dimming += ...}. */
    public static void add(EntityPlayer player, float amount) {
        if (player.world.isRemote || !ETIMConfig.mobBatFamilyR196) {
            return;
        }
        ETIMVisionDimmingDuck duck = (ETIMVisionDimmingDuck) player;
        float value = Math.min(MAX_VALUE, duck.etim$getVisionDimming() + amount);
        duck.etim$setVisionDimming(value);
        push(player, value);
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[BatMobLog] vision add={} total={} player={}",
                    amount, value, player.getName());
        }
    }

    /** Absolute set (verdict probe {@code /etest dim}); also the clear path. */
    public static void set(EntityPlayer player, float value) {
        if (player.world.isRemote || !ETIMConfig.mobBatFamilyR196) {
            return;
        }
        float clamped = Math.min(MAX_VALUE, Math.max(0.0F, value));
        ((ETIMVisionDimmingDuck) player).etim$setVisionDimming(clamped);
        push(player, clamped);
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[BatMobLog] vision set={} player={}", clamped, player.getName());
        }
    }

    /** Per-tick decay, called from {@code MixinEntityPlayer.onUpdate} TAIL (server side). */
    public static void tick(EntityPlayer player) {
        if (player.world.isRemote || probeHold) {
            return;
        }
        ETIMVisionDimmingDuck duck = (ETIMVisionDimmingDuck) player;
        float value = duck.etim$getVisionDimming();
        if (value <= 0.0F) {
            return;
        }
        // R196 EntityPlayer.java:658-663 — the order is whether/branch order
        // verbatim: under 0.01 snaps to 0, over 2.0 snaps to 2, else decays.
        float next;
        if (value < 0.01F) {
            next = 0.0F;
        } else if (value > MAX_VALUE) {
            next = MAX_VALUE;
        } else {
            next = value - DECAY_PER_TICK;
        }
        duck.etim$setVisionDimming(next);
        // The health packet carried the client copy in R196; 1.12 has no such
        // side channel, so mirror every 5 ticks plus the final clear.
        if (next <= 0.0F || player.ticksExisted % 5 == 0) {
            push(player, next);
        }
    }

    /** R196 ServerPlayer.java:277 — cleared in the client copy at 0. */
    private static void push(EntityPlayer player, float value) {
        if (player instanceof EntityPlayerMP) {
            ETIMVisionDimmingNetwork.sync((EntityPlayerMP) player, value);
        }
    }
}
