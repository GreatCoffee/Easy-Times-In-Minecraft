package io.github.etim.etim.harness;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.Tags;
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
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class TestDriver {

    /**
     * Ticks a {@code /etest dig} holds the START packet before STOP. Bare-hand
     * dirt: 5 initial hit-delay ticks + ~15 progress ticks ≈ tick 20; 40 covers
     * the typical probe block and lets the per-tick digDrain face accumulate.
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
            player.connection.processTryUseItemOnBlock(new CPacketPlayerTryUseItemOnBlock(
                    pos, EnumFacing.UP, EnumHand.MAIN_HAND, 0.5F, 0.5F, 0.5F));
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
            } catch (Exception e) {
                // e.g. the attack selector matched nothing — the verdict
                // window greps this line instead of a silent no-op.
                ETIM.LOGGER.info("[TestLog] step={} player={} ERROR={}", step.label,
                        step.player.getName(), e.getMessage());
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
        player.connection.processPlayerDigging(new CPacketPlayerDigging(action, pos, EnumFacing.DOWN));
        ETIM.LOGGER.info("[TestLog] step=dig-{} player={} pos={}", phase, player.getName(), pos);
    }
}
