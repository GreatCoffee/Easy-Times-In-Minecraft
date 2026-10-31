package io.github.etim.etim.client;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.client.Minecraft;
import net.minecraft.client.audio.ISound;
import net.minecraft.client.audio.ISoundEventListener;
import net.minecraft.client.audio.SoundEventAccessor;
import net.minecraft.util.math.MathHelper;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * soundlog batch (audit20 条 177-179): CLIENT-side judgment channel for named
 * sound events, printed at the same dispatch point the vanilla subtitle overlay
 * reads — {@code SoundManager.playSound} listeners loop (:385-391, the accessor
 * gate at :376-382 is shared by subtitle display and actual playback; master
 * volume 0 (:393-396) short-circuits playback AFTER this dispatch, so a row
 * ≠ audible playback by inheritance of the user's subtitle ruling, 条 177).
 *
 * <p>Golden face: sheep shearing = exactly one
 * {@code [SoundLog] name=minecraft:entity.sheep.shear ... [client]}
 * row per successful shear (R196 ItemShears:63 / 1.12 EntitySheep:435, params
 * 1.0F/1.0F both generations — same params, DIFFERENT names: the R196 legacy
 * string hits the accessor-null gate here, so the judged key is always the
 * 1.12 registered name).</p>
 *
 * <p>{@code Minecraft.getMinecraft().getSoundHandler()} is null during
 * preInit (constructed at Minecraft:520 AFTER FMLClientHandler:252
 * preinitializeMods), so this registers from {@code FMLInitializationEvent}
 * (ETIM.init) where the handler is live; it is a static single-instance
 * listener and the SoundManager listener list is never cleared by
 * reload/unload (no registration leak). Gate:
 * {@link ETIMConfig#soundDebugLog} (devtools category, default false —
 * client cfg {@code run/obfuscated/config/etim.cfg}, preInit read-once).</p>
 */
@SideOnly(Side.CLIENT)
public final class ETIMSoundLog implements ISoundEventListener {

    private static final ETIMSoundLog INSTANCE = new ETIMSoundLog();
    private static boolean registered = false;

    private ETIMSoundLog() {
    }

    public static void register() {
        if (registered) {
            return;
        }
        Minecraft mc = Minecraft.getMinecraft();
        if (mc == null || mc.getSoundHandler() == null) {
            return;
        }
        mc.getSoundHandler().addListener(INSTANCE);
        registered = true;
        ETIM.LOGGER.info("[SoundLog] listener registered [client]");
    }

    @Override
    public void soundPlay(ISound soundIn, SoundEventAccessor accessor) {
        if (!ETIMConfig.soundDebugLog) {
            return;
        }
        ETIM.LOGGER.info("[SoundLog] name=" + soundIn.getSoundLocation().toString()
                + " pos=" + MathHelper.floor(soundIn.getXPosF()) + ","
                + MathHelper.floor(soundIn.getYPosF()) + ","
                + MathHelper.floor(soundIn.getZPosF()) + " [client]");
    }
}
