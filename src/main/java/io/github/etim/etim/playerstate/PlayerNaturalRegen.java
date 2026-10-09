package io.github.etim.etim.playerstate;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

import io.github.etim.etim.nutrition.NutritionSystem;

/**
 * MITE-style slow natural regeneration (task 1.3).
 *
 * <p>R196 pacing: accumulate heal_progress each tick at
 * {@code base + nutrition * perNutrition}; on reaching 1.0 the player
 * heals 1 HP (half a heart) and pays a small food cost. Consequences:
 * at richest nutrition (~19-20) this is the documented ~64 s/HP, while a
 * fresh player (nutrition 6) heals roughly every 1.5 minutes.</p>
 *
 * <p>Bed regen: R196 FoodStats confirms LYING IN A BED multiplies the
 * rate by 4 (the task doc's 8x is a misreading), and the condition is the
 * lying-in-bed state (any hour of day — MITE's daytime lying for regen),
 * not being asleep. Daytime bed entry is enabled by {@link ETIMConfig}.</p>
 *
 * <p>Malnourishment slow-down (x0.25) arrives with the nutrition system
 * of task 1.4 and is intentionally not implemented here yet.</p>
 *
 * <p>Vanilla's food-driven regeneration (fast saturation heal + 18+ slow
 * heal) is removed by {@code io.github.etim.etim.mixins.MixinFoodStats};
 * the hunger-counter and starvation branches there are untouched.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class PlayerNaturalRegen {

    private static final String KEY_REGEN_PROGRESS = "etim:regen_progress";

    private PlayerNaturalRegen() {
    }

    @SubscribeEvent
    public static void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || event.player.world == null || event.player.world.isRemote) {
            return;
        }
        tick(event.player);
    }

    private static void tick(EntityPlayer player) {
        if (player.getFoodStats().getFoodLevel() <= 0 || !player.shouldHeal()
                || !player.world.getGameRules().getBoolean("naturalRegeneration")) {
            return;
        }

        float nutrition = player.getFoodStats().getFoodLevel();
        float rate = (ETIMConfig.regenBasePerTick + nutrition * ETIMConfig.regenPerFoodPerTick)
                * (player.isPlayerSleeping() ? ETIMConfig.bedRegenFactor : 1.0F)
                * (NutritionSystem.isMalnourished(player) ? ETIMConfig.malnourishedRegenFactor : 1.0F);

        float progress = PlayerPersistedValues.getFloat(player, KEY_REGEN_PROGRESS) + rate;
        if (progress >= 1.0F) {
            progress -= 1.0F;
            player.heal(1.0F);
            player.getFoodStats().addExhaustion(ETIMConfig.exhaustionPerHealedHp);
        }
        PlayerPersistedValues.setFloat(player, KEY_REGEN_PROGRESS, progress);
    }
}
