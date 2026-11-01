package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMArrowAccuracyEvent;
import io.github.etim.etim.combat.ETIMPotionPoison;
import io.github.etim.etim.mining.ETIMEnchantments;
import io.github.etim.etim.mob.ETIMArrowLog;

import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.projectile.EntityArrow;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemStack;
import net.minecraftforge.common.MinecraftForge;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.ModifyVariable;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Arrow-family shared hooks (batch enchant1, ＿裁定 ④共享钩 — 条 245).
 *
 * <p>The three bow enchantments land on the {@code EntityArrow} BASE, so
 * ETIM metal arrows ({@code ETIMEntityArrow extends EntityArrow}), vanilla
 * arrows and tipped arrows travel the same code path (摸底 A-2: the metal
 * arrow is the ONLY route into onHit — the vanilla Items.ARROW recipe is
 * alive, and a bow must enchant its whole quirk). Two faces:</p>
 *
 * <ul>
 *   <li><b>true_flight</b> — {@code shoot(Entity,float,float,float,float,
 *       float)} (1.12 :119) carries {@code inaccuracy} as its 6th local slot
 *       (index 6: this=0, shooter=1, pitch=2, yaw=3, p=4, velocity=5,
 *       inaccuracy=6). α2 (条 245): the R196 skill gate is NOT ported —
 *       {@code eff = expLevel + round(bonusLevels × L/maxLevel)}, then the
 *       R196 dual curve ({@code EntityArrow:144-148}) and the liquid ×2
 *       face ride the same stock. Extendability: the level is posted on the
 *       {@link ETIMArrowAccuracyEvent} bus (条 245 user red line) — add-ons
 *       layer their increments, zero subscribers = α2 verbatim.</li>
 *   <li><b>poison</b> — {@code arrowHit(EntityLivingBase)} head hook
 *       (1.12 :496): fired exactly once per landed hit from vanilla onHit
 *       (:391-424, order arrowCount→knockback→thorns→arrowHit) and from
 *       ETIMEntityArrow (:634, same order — C-1 intra-tick sense equal).
 *       Apply face = {@link ETIMPotionPoison#applyFromLauncher}.</li>
 * </ul>
 */
@Mixin(EntityArrow.class)
public abstract class MixinEntityArrow {

    @ModifyVariable(
            method = "shoot(Lnet/minecraft/entity/Entity;FFFFF)V",
            at = @At("HEAD"),
            index = 6,
            remap = true
    )
    private float etim$trueFlightWander(float inaccuracy) {
        Entity self = (Entity) (Object) this;
        EntityArrow arrow = (EntityArrow) self;
        if (arrow.world.isRemote) {
            return inaccuracy; // client face rides the server-seeded motion sync
        }
        if (!(arrow.shootingEntity instanceof EntityPlayer)) {
            return inaccuracy; // R196 :150 else branch — non-player face stays the constant
        }
        EntityPlayer player = (EntityPlayer) arrow.shootingEntity;
        // R196 :163-170 getLauncher — main-hand face (ZMQ §4.6).
        ItemStack launcher = player.getHeldItemMainhand();
        int level = (launcher == null || launcher.isEmpty()) ? 0
                : EnchantmentHelper.getEnchantmentLevel(ETIMEnchantments.TRUE_FLIGHT, launcher);
        int bonus = level > 0
                ? Math.round(ETIMConfig.trueFlightBonusLevels
                        * ((float) level / ETIMConfig.trueFlightMaxLevel))
                : 0;
        ETIMArrowAccuracyEvent event = new ETIMArrowAccuracyEvent(player, player.experienceLevel, bonus);
        MinecraftForge.EVENT_BUS.post(event);
        int eff = event.getEffectiveLevel();
        float wander;
        if (eff < 0) {
            wander = 5.0F + eff * -0.5F; // R196 :144-145 debt branch
        } else {
            wander = (float) (0.5 + 4.5 / Math.pow(0.8F + (eff + 1) / 5.0F, 2.0)); // :147
        }
        if (arrow.isInWater() || arrow.isInLava()) {
            wander *= 2.0F; // R196 :153-154 isSuspendedInLiquid — 1.12 water/lava lane
        }
        ETIMArrowLog.row("shot wander=" + String.format("%.4f", wander)
                + " eff=" + eff + " exp=" + player.experienceLevel + " lvl=" + level);
        return wander;
    }

    @Inject(
            method = "arrowHit(Lnet/minecraft/entity/EntityLivingBase;)V",
            at = @At("HEAD"),
            remap = true
    )
    private void etim$bowPoisonApply(EntityLivingBase target, CallbackInfo ci) {
        Entity self = (Entity) (Object) this;
        EntityArrow arrow = (EntityArrow) self;
        if (arrow.world.isRemote || target == null) {
            return;
        }
        if (!(arrow.shootingEntity instanceof EntityPlayer)) {
            return; // R196 instant applies only from a player-launcher bow
        }
        ETIMPotionPoison.applyFromLauncher(target, (EntityPlayer) arrow.shootingEntity);
    }
}
