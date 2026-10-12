package io.github.etim.etim.quality;

import io.github.etim.etim.Tags;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.client.resources.I18n;
import net.minecraft.item.ItemStack;
import net.minecraft.util.text.TextFormatting;
import net.minecraftforge.event.entity.player.ItemTooltipEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.EventPriority;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

import java.util.List;

/**
 * Batch 3 (stage 3): the quality tooltip row, R196 ItemStack:713-715 — the
 * quality renders as an INDEPENDENT tooltip line (plain color-none text
 * styled GRAY by the audit reading, §3.3), followed by the durability
 * modifier line ({@code (mod−1)×100%}, red when &lt; 1, blue when &gt; 1,
 * ItemStack:797-804).
 *
 * <p>Forge-side hook instead of a Mixin{@code addInformation}: the Forge
 * tooltip event fires for every stack and stays out of the vanilla display
 * chain — the R196 line content is copied verbatim, so the presentation path
 * difference (event vs override) does not touch the visible semantics.</p>
 *
 * <p>Client-only: the Forge event fires on any logical side it is subscribed
 * for, so the side check keeps the server build inert. {@link GlStateManager}
 * is imported nowhere — this class only touches strings.</p>
 */
@SideOnly(Side.CLIENT)
@Mod.EventBusSubscriber(value = Side.CLIENT, modid = Tags.MOD_ID)
public final class QualityTooltip {

    private QualityTooltip() {
    }

    @SubscribeEvent(priority = EventPriority.HIGHEST)
    public static void onTooltip(ItemTooltipEvent event) {
        if (!ETIMConfig.qualitySystem) {
            return;
        }
        ItemStack stack = event.getItemStack();
        EnumQuality quality = ETIMQuality.get(stack);
        if (quality == null) {
            return;
        }
        List<String> tooltip = event.getToolTip();
        tooltip.add(1, TextFormatting.GRAY + I18n.format(quality.getTranslationKey()));
        float modifier = quality.getDurabilityModifier();
        if (modifier < 1.0F) {
            tooltip.add(2, TextFormatting.RED + I18n.format("etim.quality.durability_penalty",
                    Math.round((1.0F - modifier) * 100.0F)));
        } else if (modifier > 1.0F) {
            tooltip.add(2, TextFormatting.BLUE + I18n.format("etim.quality.durability_bonus",
                    Math.round((modifier - 1.0F) * 100.0F)));
        }
    }
}
