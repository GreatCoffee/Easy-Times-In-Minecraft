package io.github.etim.etim.harness;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.Tags;
import io.github.etim.etim.mixins.CPacketPlayerDiggingAccessor;
import io.github.etim.etim.mixins.CPacketPlayerTryUseItemOnBlockAccessor;
import net.minecraft.command.CommandException;
import net.minecraft.command.EntitySelector;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.network.play.client.CPacketPlayerDigging;
import net.minecraft.network.play.client.CPacketPlayerTryUseItem;
import net.minecraft.network.play.client.CPacketPlayerTryUseItemOnBlock;
import net.minecraft.network.play.client.CPacketUseEntity;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

import java.util.Iterator;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * T1 server-side packet driver (harness, 补25 挂账 → 补29 闭账余项): feeds the
 * vanilla client→server packets into the acting player's
 * {@code NetHandlerPlayServer} on a tick schedule, so the R1-R10 probe
 * rounds run from one RCON session instead of real client swings — every
 * entry point stays at the packet boundary (the vanilla process* handlers),
 * never calling {@code ETIMEndurance} directly.
 *
 * <p>Steps are enqueued thread-safely (RCON executes commands on its own
 * thread) and drained on the server thread at END of each server tick; a
 * step runs one {@code [TestLog]} line plus its packet feed. One-shot
 * development facility — no config keys (nothing player-perceivable).</p>
 *
 * <p>Verified against the 1.12.2 sources (rfg tree): {@code processPlayerDigging}
 * guards dig START/STOP with a reach+1 distance² check and routes to
 * {@code PlayerInteractionManager.onBlockClicked / blockRemoving} (the dig
 * loop then progresses per player tick via {@code updateBlockRemoving});
 * {@code processUseEntity} ATTACK rejects item/xp/arrow/self targets with a
 * disconnect and needs the target within 6 blocks (3 if not visible);
 * {@code processTryUseItemOnBlock / processTryUseItem} route to
 * {@code interactionManager.processRightClick(Block) }.</p>
 *
 * <p>Verdict-lesson (harness-t1-verdict.md, 2 FAIL same root): packet
 * convenience constructors annotated {@code @SideOnly(Side.CLIENT)} exist in
 * the compile-time merged jar but are <em>stripped from the dedicated-server
 * runtime jar</em> — building those packets server-side goes through the
 * no-arg constructor plus accessor-mixin field injection (same packet bytes,
 * same boundary).</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class TestDriver {

    /**
     * Ticks a {@code /etest dig} holds the START packet before STOP. Measured
     * model (harness-t1-retest.md, driver path — supersedes the earlier
     * client-loop guess): every tick from START charges one digDrain line
     * (no client-style blockHitDelay gap on this single-START path); the
     * break itself lands in blockRemoving at STOP when progress ≥ 0.7, else
     * the server keeps digging past STOP until progress ≥ 1.0 — bare-hand
     * dirt measured 149 active ticks total, tallgrass breaks on the STOP
     * tick. 40 = a one-and-done hold window: soft probe blocks break on
     * STOP, hard ones keep charging after it.
     */
    private static final int DIG_HOLD_TICKS = 40;

    private static final class Step {
        final EntityPlayerMP player;
        final String label;
        /** Remaining ticks; decremented on the server thread only. */
        int delayTicks;
        final Runnable action;

        Step(EntityPlayerMP player, String label, int delayTicks, Runnable action) {
            this.player = player;
            this.label = label;
            this.delayTicks = delayTicks;
            this.action = action;
        }
    }

    private static final ConcurrentLinkedQueue<Step> STEPS = new ConcurrentLinkedQueue<Step>();

    private TestDriver() {
    }

    /** {@code /etest attack <selector>} — one ATTACK packet at the selector's entity. */
    public static void attack(EntityPlayerMP player, String selector) {
        schedule(player, "attack", 1, () -> feedAttack(player, selector));
    }

    /** {@code /etest dig <x> <y> <z>} — START now, STOP after {@link #DIG_HOLD_TICKS}. */
    public static void dig(EntityPlayerMP player, BlockPos pos) {
        schedule(player, "dig-start", 1,
                () -> feedDig(player, pos, CPacketPlayerDigging.Action.START_DESTROY_BLOCK, "start"));
        schedule(player, "dig-stop", 1 + DIG_HOLD_TICKS,
                () -> feedDig(player, pos, CPacketPlayerDigging.Action.STOP_DESTROY_BLOCK, "stop"));
    }

    /** {@code /etest useblock <x> <y> <z>} — one right-click on the block (till/place faces). */
    public static void useBlock(EntityPlayerMP player, BlockPos pos) {
        schedule(player, "useblock", 1, () -> {
            // No-arg ctor + field injection: the six-argument convenience
            // constructor is @SideOnly(CLIENT) and stripped from the
            // dedicated-server runtime jar (T1 verdict FAIL root cause).
            CPacketPlayerTryUseItemOnBlock packet = new CPacketPlayerTryUseItemOnBlock();
            CPacketPlayerTryUseItemOnBlockAccessor fields =
                    (CPacketPlayerTryUseItemOnBlockAccessor) (Object) packet;
            fields.etim$setPosition(pos);
            fields.etim$setPlacedBlockDirection(EnumFacing.UP);
            fields.etim$setHand(EnumHand.MAIN_HAND);
            fields.etim$setFacingX(0.5F);
            fields.etim$setFacingY(0.5F);
            fields.etim$setFacingZ(0.5F);
            player.connection.processTryUseItemOnBlock(packet);
            ETIM.LOGGER.info("[TestLog] step=useblock player={} pos={}", player.getName(), pos);
        });
    }

    /** {@code /etest useitem} — one right-click into the air (held item's use face). */
    public static void useItem(EntityPlayerMP player) {
        schedule(player, "useitem", 1, () -> {
            player.connection.processTryUseItem(new CPacketPlayerTryUseItem(EnumHand.MAIN_HAND));
            ETIM.LOGGER.info("[TestLog] step=useitem player={}", player.getName());
        });
    }

    private static void schedule(EntityPlayerMP player, String label, int delayTicks, Runnable action) {
        STEPS.add(new Step(player, label, delayTicks, action));
    }

    @SubscribeEvent
    public static void onServerTick(TickEvent.ServerTickEvent event) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }
        Iterator<Step> iterator = STEPS.iterator();
        while (iterator.hasNext()) {
            Step step = iterator.next();
            if (--step.delayTicks > 0) {
                continue;
            }
            iterator.remove();
            if (step.player.isDead || step.player.connection == null) {
                ETIM.LOGGER.info("[TestLog] step={} player={} SKIPPED (gone)", step.label,
                        step.player.getName());
                continue;
            }
            try {
                step.action.run();
            } catch (Throwable t) {
                // A harness defect must never take the server down (T1
                // verdict N3: NoSuchMethodError is an Error and escaped the
                // previous catch(Exception)). FAILED line = verdict-visible.
                ETIM.LOGGER.info("[TestLog] step={} player={} FAILED={}", step.label,
                        step.player.getName(), t);
            }
        }
    }

    private static void feedAttack(EntityPlayerMP player, String selector) {
        Entity target;
        try {
            target = EntitySelector.matchOneEntity(player, selector, Entity.class);
        } catch (CommandException e) {
            // unmatched selector (checked exception inside the Runnable) —
            // surface it as the verdict-visible NO_TARGET line.
            ETIM.LOGGER.info("[TestLog] step=attack player={} NO_TARGET selector={} detail={}",
                    player.getName(), selector, e.getMessage());
            return;
        }
        if (target == null) {
            ETIM.LOGGER.info("[TestLog] step=attack player={} NO_TARGET selector={}",
                    player.getName(), selector);
            return;
        }
        player.connection.processUseEntity(new CPacketUseEntity(target));
        ETIM.LOGGER.info("[TestLog] step=attack player={} target={}#{}", player.getName(),
                target.getName(), target.getEntityId());
    }

    private static void feedDig(EntityPlayerMP player, BlockPos pos,
            CPacketPlayerDigging.Action action, String phase) {
        // No-arg ctor + field injection — the (Action, BlockPos, EnumFacing)
        // convenience constructor is @SideOnly(CLIENT), absent from the
        // dedicated-server runtime jar (T1 verdict FAIL root cause).
        CPacketPlayerDigging packet = new CPacketPlayerDigging();
        CPacketPlayerDiggingAccessor fields = (CPacketPlayerDiggingAccessor) (Object) packet;
        fields.etim$setAction(action);
        fields.etim$setPosition(pos);
        fields.etim$setFacing(EnumFacing.DOWN);
        player.connection.processPlayerDigging(packet);
        ETIM.LOGGER.info("[TestLog] step=dig-{} player={} pos={}", phase, player.getName(), pos);
    }
}
