package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.item.ETIMVesselEvents;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.init.MobEffects;
import net.minecraft.item.ItemAppleGold;
import net.minecraft.item.ItemStack;
import net.minecraft.potion.PotionEffect;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-65 census F :162 — the R196 enchanted golden apple
 * ({@code ItemAppleGold.java:15-40}).
 *
 * <p>R196 gives the enchanted subtype (meta 1) three long effects on top of
 * the food value: regeneration 1200 t amp 1, resistance 1200 t amp 0 and
 * fire resistance 1200 t amp 0. The 1.12 golden apple keeps its own vanilla
 * rows (absorption etc.) — this mixin only adds the three R196 rows for the
 * enchanted meta, matching 摸底 §2 (true delta).</p>
 *
 * <p>Zombie-villager conversion lives in {@code ETIMAppleGoldEvents} (the
 * entity-right-click arm); this mixin is the eat arm only.</p>
 */
@Mixin(ItemAppleGold.class)
public abstract class MixinItemAppleGold {

    @Inject(method = "onFoodEaten", at = @At("TAIL"))
    private void etim$enchantedEffects(ItemStack stack, World world, EntityPlayer consumer,
                                       CallbackInfo ci) {
        if (!ETIMConfig.foodR196Extra || world.isRemote) {
            return;
        }
        if ((Object) this != Items.GOLDEN_APPLE || stack.getMetadata() != 1) {
            return;
        }
        consumer.addPotionEffect(new PotionEffect(MobEffects.REGENERATION, 1200, 1));
        consumer.addPotionEffect(new PotionEffect(MobEffects.RESISTANCE, 1200, 0));
        consumer.addPotionEffect(new PotionEffect(MobEffects.FIRE_RESISTANCE, 1200, 0));
        ETIMVesselEvents.row("applegold enchanted consumer=" + consumer.getName());
    }
}

