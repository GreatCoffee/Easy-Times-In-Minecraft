package io.github.etim.etim.client;

import io.github.etim.etim.Tags;

import net.minecraft.client.gui.Gui;
import net.minecraftforge.client.event.RenderGameOverlayEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * B-55 — the client half of R196 {@code vision_dimming}
 * (GuiIngame.java:77-79, :918-926): a black full-screen quad whose alpha is
 * {@code min(dimming - partialTick × 0.01, 0.9)}.
 *
 * <p>The value arrives from {@link io.github.etim.etim.mob.ETIMVisionDimmingNetwork}
 * (the server keeps the authoritative copy on the player) and decays locally
 * 0.01/tick so a dropped packet never freezes the screen dark.</p>
 */
@SideOnly(Side.CLIENT)
@Mod.EventBusSubscriber(value = Side.CLIENT, modid = Tags.MOD_ID)
public final class VisionDimOverlay {

    /** R196 MITEConstant.vision_dimming_attenuation_per_tick. */
    private static final float DECAY_PER_TICK = 0.01F;
    /** R196 GuiIngame.java:79 — the overlay never exceeds 0.9 alpha. */
    private static final float MAX_ALPHA = 0.9F;

    private static float dimming;

    private VisionDimOverlay() {
    }

    /** Network handler entry (client thread). */
    public static void accept(float value) {
        dimming = Math.max(dimming > value ? dimming : value, 0.0F);
        if (value <= 0.0F) {
            dimming = 0.0F;
        }
    }

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END || dimming <= 0.0F) {
            return;
        }
        dimming = dimming < 0.01F ? 0.0F : dimming - DECAY_PER_TICK;
    }

    @SubscribeEvent
    public static void onRender(RenderGameOverlayEvent.Post event) {
        if (event.getType() != RenderGameOverlayEvent.ElementType.ALL || dimming <= 0.0F) {
            return;
        }
        float interpolated = dimming - event.getPartialTicks() * DECAY_PER_TICK;
        float alpha = Math.min(Math.max(interpolated, 0.0F), MAX_ALPHA);
        if (alpha <= 0.01F) {
            return;
        }
        int argb = ((int) (alpha * 255.0F) & 255) << 24;
        Gui.drawRect(0, 0, event.getResolution().getScaledWidth(), event.getResolution().getScaledHeight(), argb);
    }
}
