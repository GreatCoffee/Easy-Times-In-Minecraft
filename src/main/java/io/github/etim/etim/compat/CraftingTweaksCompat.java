package io.github.etim.etim.compat;

import io.github.etim.etim.ETIMConfig;
import net.minecraftforge.fml.common.Loader;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * CraftingTweaks compatibility shim (run26 152-round verdict).
 *
 * <p>CT's {@code rightClickCraftsStack} (default true) intercepts the
 * crafting-table result-slot RIGHT click client-side and converts it into
 * server {@code MessageCraftStack} — whose handler performs the "craft a
 * full stack" loop via repeated synthetic {@code slotClick(0, PICKUP, 0)}
 * calls. That both (a) eats the vanilla right-click ETIM needs for the
 * R196 quality picker (cycle rung) and (b) spawns a burst of PICKUP(0)
 * clicks that bogus-arms the crafting timer.</p>
 *
 * <p>Fix (user-directed): when CT is loaded, ETIM flips the public static
 * config field to false, then persists via CT's own public saveConfig() so
 * the in-instance config file agrees. The vanilla right-click then reaches
 * ETIM with button=1 (paired probe verified), CT's rotate/balance/clear
 * keep working (they arrive through CT's own packets and result in a
 * legitimate {@code result CHANGED} recompute).</p>
 */
public final class CraftingTweaksCompat {

    private static final Logger LOGGER = LogManager.getLogger("ETIMCompat");
    private static final String CT_CLASS = "net.blay09.mods.craftingtweaks.CraftingTweaks";
    private static final String CT_FIELD = "rightClickCraftsStack";

    private CraftingTweaksCompat() {
    }

    /** Call from init; CT's preInit already ran here (all preInits complete). */
    public static void apply() {
        if (!ETIMConfig.compatCraftingTweaksFix || !Loader.isModLoaded("craftingtweaks")) {
            return;
        }
        try {
            Class<?> ct = Class.forName(CT_CLASS);
            Field field = ct.getField(CT_FIELD);
            try {
                field.setBoolean(null, false);
            } catch (IllegalAccessException e) {
                throw new IllegalStateException("cannot set CraftingTweaks." + CT_FIELD, e);
            }
            // Persist via CT's own public saver so the config file matches
            // (ConfigChangedEvent reloads will read the file back true-less).
            try {
                ct.getMethod("saveConfig").invoke(null);
            } catch (ReflectiveOperationException ignored) {
                // field already flipped for this run; the file rewrite below
                // still covers future launches
            }
            Path cfg = Loader.instance().getConfigDir().toPath().resolve("craftingtweaks.cfg");
            if (Files.isRegularFile(cfg)) {
                String text = new String(Files.readAllBytes(cfg), StandardCharsets.UTF_8)
                        .replace("B:rightClickCraftsStack=true", "B:rightClickCraftsStack=false");
                Files.write(cfg, text.getBytes(StandardCharsets.UTF_8));
            }
            LOGGER.log(Level.INFO,
                    "[Compat] CraftingTweaks detected → rightClickCraftsStack=false "
                            + "(R196 quality picker owns the result-slot right-click)");
        } catch (ClassNotFoundException | NoSuchFieldException | SecurityException | IOException t) {
            LOGGER.log(Level.WARN, "[Compat] CraftingTweaks fix skipped: " + t, t);
        }
    }
}
