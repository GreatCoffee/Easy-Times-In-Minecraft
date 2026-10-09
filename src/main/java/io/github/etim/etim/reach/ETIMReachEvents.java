package io.github.etim.etim.reach;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.text.ITextComponent;
import net.minecraft.util.text.TextComponentTranslation;
import net.minecraft.util.text.TextFormatting;
import net.minecraftforge.event.entity.player.AttackEntityEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * Server-authoritative reach validation for task 2.1. Vanilla 1.12 lets a
 * hacked client dig/place/attack/interact from 4.5–6 blocks away; ETIM
 * enforces the R196 values at the server: melee 1.5 (+adv/bonus), entity
 * interaction 2.5 (+adv/bonus), block actions 2.75 (+ tool bonus), each plus
 * the configurable lag tolerance.
 *
 * <p>Metric discipline (ghost-block fix, tested 2026-10-09): the server
 * measures eye → nearest point of the target's box. The vanilla client only
 * selects targets whose eye → ray-surface distance fits in the selection ray,
 * and the surface point lies ON the box, so box-nearest ≤ surface distance
 * always — the server can never reject a legitimate (non-hacked) action.</p>
 *
 * <p>Denied actions optionally report to the acting player and the server log
 * ({@code reachDenialFeedback}) — that is the observable data channel for
 * balancing without instrumenting every event by hand.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class ETIMReachEvents {

    private ETIMReachEvents() {
    }

    /** R196 melee context: silently miss when beyond the adjusted melee reach (feedback optional). */
    @SubscribeEvent
    public static void onAttackEntity(AttackEntityEvent event) {
        EntityPlayer player = event.getEntityPlayer();
        if (player.world.isRemote || player.capabilities.isCreativeMode) {
            return;
        }
        double distance = ETIMReach.getEyeSurfaceDistance(player, event.getTarget());
        double reach = ETIMReach.getMeleeReach(player, event.getTarget());
        if (distance > reach + ETIMConfig.reachServerTolerance) {
            event.setCanceled(true);
            deny(player, "etim.reach.deny_attack", distance, reach);
        }
    }

    /** R196 interaction context (boats pin it to 2.5 flat). */
    @SubscribeEvent
    public static void onEntityInteract(PlayerInteractEvent.EntityInteract event) {
        EntityPlayer player = event.getEntityPlayer();
        if (event.getWorld().isRemote || player.capabilities.isCreativeMode) {
            return;
        }
        double distance = ETIMReach.getEyeSurfaceDistance(player, event.getTarget());
        double reach = ETIMReach.getInteractionReach(player, event.getTarget());
        if (distance > reach + ETIMConfig.reachServerTolerance) {
            event.setCanceled(true);
            deny(player, "etim.reach.deny_interact", distance, reach);
        }
    }

    /** Block breaking starts beyond block reach are rejected (R196 Block context). */
    @SubscribeEvent
    public static void onLeftClickBlock(PlayerInteractEvent.LeftClickBlock event) {
        validateBlockEvent(event);
    }

    /** Block placing/using beyond block reach are rejected (vanilla only guards digging). */
    @SubscribeEvent
    public static void onRightClickBlock(PlayerInteractEvent.RightClickBlock event) {
        validateBlockEvent(event);
    }

    private static void validateBlockEvent(PlayerInteractEvent event) {
        EntityPlayer player = event.getEntityPlayer();
        if (event.getWorld().isRemote || player.capabilities.isCreativeMode) {
            return;
        }
        BlockPos pos = event.getPos();
        if (event.getWorld().isAirBlock(pos)) {
            return;
        }
        IBlockState state = event.getWorld().getBlockState(pos);
        int metadata = state.getBlock().getMetaFromState(state);
        // R196 exact metric (same function as the client selection filter).
        double distance = ETIMReach.getBodyCenterDistance(player, pos);
        double reach = ETIMReach.getBlockReach(player, state.getBlock(), metadata);
        if (distance > reach + ETIMConfig.reachServerTolerance) {
            event.setCanceled(true);
            deny(player, "etim.reach.deny_block", distance, reach);
        }
    }

    private static void deny(EntityPlayer player, String key, double distance, double reach) {
        ITextComponent warning = new TextComponentTranslation(key,
                String.format("%.2f", distance), String.format("%.2f", reach))
                .setStyle(new net.minecraft.util.text.Style().setColor(TextFormatting.GRAY));
        if (ETIMConfig.reachDenialFeedback && player instanceof net.minecraft.entity.player.EntityPlayerMP) {
            ((net.minecraft.entity.player.EntityPlayerMP) player).sendMessage(warning);
        }
        ETIM.LOGGER.info("reach denied: " + key + " " + String.format("%.2f > %.2f", distance, reach));
    }
}
