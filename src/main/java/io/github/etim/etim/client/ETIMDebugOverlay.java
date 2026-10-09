package io.github.etim.etim.client;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.reach.ETIMReach;
import net.minecraft.block.state.IBlockState;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.FontRenderer;
import net.minecraft.client.resources.I18n;
import net.minecraft.client.settings.KeyBinding;
import net.minecraft.entity.Entity;
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
            new KeyBinding("key.etim.debug", Keyboard.KEY_NONE, "key.categories.misc");

    static {
        ClientRegistry.registerKeyBinding(TOGGLE_KEY);
        ETIM.LOGGER.info("ETIMDebugOverlay static init ok (key unbound by default)");
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
        double bodyDistance = ETIMReach.getBodyCenterDistance(mc.player, pos);
        double threshold = ETIMReach.getBlockReach(mc.player, state.getBlock(), metadata) + ETIMConfig.reachServerTolerance;
        lines.add(I18n.format("etim.debug.body_center", fmt(bodyDistance)));
        lines.add(I18n.format("etim.debug.reach_block", fmt(threshold), verdict(bodyDistance <= threshold)));
    }

    private static void appendEntityPanel(List<String> lines, Minecraft mc, Entity entity, boolean displayOnly) {
        lines.add(I18n.format(displayOnly ? "etim.debug.entity_far" : "etim.debug.entity", entity.getName()));
        double surface = ETIMReach.getEyeSurfaceDistance(mc.player, entity);
        lines.add(I18n.format("etim.debug.surface", fmt(surface)));
        double melee = ETIMReach.getMeleeReach(mc.player, entity) + ETIMConfig.reachServerTolerance;
        double interact = ETIMReach.getInteractionReach(mc.player, entity) + ETIMConfig.reachServerTolerance;
        lines.add(I18n.format("etim.debug.reach_melee", fmt(melee), verdict(surface <= melee)));
        lines.add(I18n.format("etim.debug.reach_interact", fmt(interact), verdict(surface <= interact)));
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
            AxisAlignedBB box = candidate.getEntityBoundingBox().grow(0.3D);
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
