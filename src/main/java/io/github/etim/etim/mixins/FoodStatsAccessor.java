package io.github.etim.etim.mixins;

import net.minecraft.util.FoodStats;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Exposes the private {@code FoodStats.foodExhaustionLevel} (vanilla 1.12 has
 * no exhaustion getter) for the HUD hunger diagnostic row.
 */
@Mixin(FoodStats.class)
public interface FoodStatsAccessor {

    @Accessor("foodExhaustionLevel")
    float etim$getFoodExhaustion();
}
