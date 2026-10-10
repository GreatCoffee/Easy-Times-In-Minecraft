package io.github.etim.etim.client;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.hunger.ETIMHunger;
import io.github.etim.etim.mining.ETIMMining;
import io.github.etim.etim.playerstate.FoodDebugNetwork;
import io.github.etim.etim.reach.ETIMReach;
import net.minecraft.block.state.IBlockState;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.FontRenderer;
import net.minecraft.client.resources.I18n;
import net.minecraft.client.settings.KeyBinding;
import net.minecraft.entity.Entity;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraftforge.fml.client.registry.ClientRegistry;
import net.minecraftforge.client.event.RenderGameOverlayEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;
import net.minecraftforge.fml.relauncher.Side;
import org.lwjgl.input.Keyboard;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Dev/test overlay (user-mandated test tool): a key (unbound by default,
 * config settings > controls → "ETIM 调试覆盖") toggles a top-left readout
 * with everything needed to verify reach behaviour — target type/position,
 * eye → hit point distance, body point → block center distance, exact reach
 * thresholds and a server-identical pass/deny verdict.
 *
 * <p>Beyond the gameplay selection ray the overlay switches to a long
 * DISPLAY-ONLY ray ({@code debugRayLength}, default 8 m, configurable): it
 * probes blocks and entities purely for readout and never touches the
 * game's own selection, dig, place, attack or interact judgement — the two
 * layers are strictly separated.</p>
 *
 * <p>All rendering is wrapped defensively; every state change is logged.
 * Invisible-HUD problems must show up as log lines, never silence.</p>
 */
@Mod.EventBusSubscriber(value = Side.CLIENT, modid = Tags.MOD_ID)
public final class ETIMDebugOverlay {

    private static boolean visible = false;

    private static final KeyBinding TOGGLE_KEY =
            new KeyBinding("key.etim.debug", Keyboard.KEY_GRAVE, "key.categories.misc");

    static {
        ClientRegistry.registerKeyBinding(TOGGLE_KEY);
        ETIM.LOGGER.info("ETIMDebugOverlay static init ok (toggle default = GRAVE)");
    }

    private ETIMDebugOverlay() {
    }

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase == TickEvent.Phase.END && TOGGLE_KEY.isPressed()) {
            visible = !visible;
            ETIM.LOGGER.info("ETIMDebugOverlay toggled to " + visible);
        }
    }

    @SubscribeEvent
    public static void onOverlay(RenderGameOverlayEvent.Post event) {
        if (!visible || event.getType() != RenderGameOverlayEvent.ElementType.ALL) {
            return;
        }
        try {
            render();
        } catch (Throwable t) {
            ETIM.LOGGER.error("ETIMDebugOverlay render failed", t);
            visible = false;
        }
    }

    private static void render() {
        Minecraft mc = Minecraft.getMinecraft();
        if (mc.player == null || mc.world == null || mc.gameSettings.showDebugInfo) {
            return; // F3 open → skip (vanilla panel would double it)
        }
        FontRenderer font = mc.fontRenderer;
        int y = 4;
        for (String line : buildLines(mc)) {
            font.drawStringWithShadow(line, 4.0F, y, 0xFFFFFF);
            y += font.FONT_HEIGHT + 1;
        }
    }

    private static List<String> buildLines(Minecraft mc) {
        List<String> lines = new ArrayList<String>();
        lines.add(I18n.format("etim.debug.header"));
        // Hunger diagnostic row (development facility): server-original
        // food / saturation / exhaustion mirrored through FoodDebugNetwork.
        lines.add(I18n.format("etim.debug.food",
                FoodDebugNetwork.foodLevel, fmt(FoodDebugNetwork.saturation), fmt(FoodDebugNetwork.exhaustion)));
        // Task-2.3 hunger gate mirrors (display only — verdicts the gates use).
        boolean fed = ETIMHunger.hasFoodEnergy(mc.player);
        lines.add(I18n.format("etim.debug.hunger_gate",
                verdict(!(ETIMConfig.hungerCraftDeny && !fed)),
                verdict(!(ETIMConfig.hungerPlaceDeny && !fed)),
                verdict(fed || !ETIMConfig.hungerSprintDeny),
                verdict(!(ETIMConfig.hungerWeakStrike && ETIMHunger.canOnlyPerformWeakStrike(mc.player)))));
        RayTraceResult target = mc.objectMouseOver;
        if (target != null && target.typeOfHit == RayTraceResult.Type.ENTITY) {
            appendEntityPanel(lines, mc, (Entity) mc.objectMouseOver.entityHit, false);
            return lines;
        }
        if (target != null && target.typeOfHit == RayTraceResult.Type.BLOCK) {
            appendPanel(lines, mc, target, false);
            return lines;
        }
        // Beyond the gameplay selection ray: DISPLAY-ONLY probe — entities first
        // (their selection is generous in R196), then the long block ray.
        Entity farEntity = pickFarEntity(mc);
        if (farEntity != null) {
            appendEntityPanel(lines, mc, farEntity, true);
            return lines;
        }
        RayTraceResult probe = mc.player.rayTrace(ETIMConfig.debugRayLength, 1.0F);
        if (probe != null && probe.typeOfHit == RayTraceResult.Type.BLOCK) {
            appendPanel(lines, mc, probe, true);
            return lines;
        }
        lines.add(I18n.format("etim.debug.far_none", fmt(ETIMConfig.debugRayLength)));
        return lines;
    }

    private static void appendPanel(List<String> lines, Minecraft mc, RayTraceResult target, boolean displayOnly) {
        BlockPos pos = target.getBlockPos();
        lines.add(I18n.format(displayOnly ? "etim.debug.block_far" : "etim.debug.block",
                pos.getX(), pos.getY(), pos.getZ()));
        Vec3d eye = mc.player.getPositionEyes(1.0F);
        lines.add(I18n.format("etim.debug.eye_hit", fmt(eye.distanceTo(target.hitVec))));
        IBlockState state = mc.world.getBlockState(pos);
        int metadata = state.getBlock().getMetaFromState(state);
        // Verdict ≡ server: body point → block center vs reach + lag tolerance.
        // Verdict + client latch: body point → block center vs the R196
        // reach, EXACT — no server lag tolerance. The latch filter
        // (MixinEntityRenderer) is what actually decides "can I reach", so
        // the HUD mirrors it, not the looser server validation.
        double bodyDistance = ETIMReach.getBodyCenterDistance(mc.player, pos);
        double threshold = ETIMReach.getBlockReach(mc.player, state.getBlock(), metadata);
        lines.add(I18n.format("etim.debug.body_center", fmt(bodyDistance)));
        lines.add(I18n.format("etim.debug.reach_block", fmt(threshold), verdict(bodyDistance <= threshold)));
        appendMiningPanel(lines, mc, state, pos);
    }

    /**
     * Display-only readout of the task-2.2 mining formula chain (real values
     * through {@link io.github.etim.etim.mining.ETIMMining}, never mutating
     * gameplay): effective tool / str / per-tick progress / ticks to break /
     * portable / gating (block min vs the held tool's grade).
     */
    private static void appendMiningPanel(List<String> lines, Minecraft mc, IBlockState state, BlockPos pos) {
        ItemStack held = mc.player.getHeldItemMainhand();
        boolean effective = ETIMMining.isEffectiveAgainstBlock(held, state);
        boolean portable = ETIMMining.isPortable(state);
        boolean requiresTool = ETIMMining.requiresTool(state);
        float str = ETIMMining.getCurrentPlayerStrVsBlock(mc.player, state, mc.world, pos, true);
        float progress = ETIMMining.getProgressPerTick(mc.player, state, mc.world, pos);
        int ticksToBreak = progress >= 1.0F ? 0 : (int) Math.ceil(1.0F / progress);
        lines.add(I18n.format("etim.debug.mining",
                verdict(effective), fmt(str), fmt(progress), ticksToBreak > 0 ? String.valueOf(ticksToBreak) : "-"));
        lines.add(I18n.format("etim.debug.mining_gate",
                verdict(portable), verdict(requiresTool), ETIMMining.getMinHarvestLevel(state),
                held.isEmpty() ? null : held.getItem().getRegistryName().toString()));
    }

    private static void appendEntityPanel(List<String> lines, Minecraft mc, Entity entity, boolean displayOnly) {
        lines.add(I18n.format(displayOnly ? "etim.debug.entity_far" : "etim.debug.entity", entity.getName()));
        double rayDistance = ETIMReach.getEntityRayDistance(mc.player, entity);
        lines.add(I18n.format("etim.debug.raycast", fmt(rayDistance)));
        double melee = ETIMReach.getMeleeReach(mc.player, entity) + ETIMConfig.reachServerTolerance;
        double interact = ETIMReach.getInteractionReach(mc.player, entity) + ETIMConfig.reachServerTolerance;
        lines.add(I18n.format("etim.debug.reach_melee", fmt(melee), verdict(rayDistance <= melee)));
        lines.add(I18n.format("etim.debug.reach_interact", fmt(interact), verdict(rayDistance <= interact)));
    }

    /** Entity looking at along the crosshair view vector via the slab entry test. */
    private static Entity pickFarEntity(Minecraft mc) {
        Vec3d origin = mc.player.getPositionEyes(1.0F);
        Vec3d direction = mc.player.getLook(1.0F);
        Entity best = null;
        double bestEntry = Double.MAX_VALUE;
        List<Entity> candidates = mc.player.world.getEntitiesWithinAABBExcludingEntity(
                mc.player, mc.player.getEntityBoundingBox().grow(ETIMConfig.debugRayLength + 2.0D));
        for (Entity candidate : candidates) {
            AxisAlignedBB box = ETIMReach.getEffectiveHitbox(mc.player, candidate);
            double entry = ETIMReach.getRayBoxEntryDistance(origin, direction, box);
            if (entry < bestEntry) {
                bestEntry = entry;
                best = candidate;
            }
        }
        return best;
    }

    /** The overlay renders on the client; unused now that panels take the mc instance. */

    private static String verdict(boolean pass) {
        return pass ? "✓" : "✗";
    }

    private static String fmt(double value) {
        return String.format(Locale.ROOT, "%.2f", value);
    }
}
