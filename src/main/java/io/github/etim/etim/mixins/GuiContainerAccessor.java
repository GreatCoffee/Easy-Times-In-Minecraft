package io.github.etim.etim.mixins;

import net.minecraft.client.gui.inventory.GuiContainer;
import net.minecraft.inventory.Slot;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Read access to {@link GuiContainer}'s {@code hoveredSlot} (declared by
 * GuiContainer itself, only inherited by concrete container GUIs like
 * GuiFurnace — a @Shadow cannot attach to inherited members, so consumers
 * targeting specific GUIs reach it through this accessor; same pattern as
 * {@link FoodStatsAccessor}, verified in obf since task 1.5).
 */
@Mixin(GuiContainer.class)
public interface GuiContainerAccessor {

    @Accessor("hoveredSlot")
    Slot etim$getHoveredSlot();
}
