package io.github.etim.etim.hunger;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.hunger.ETIMFoodStats;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraftforge.event.entity.player.AttackEntityEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * R196 hunger action gates (task 2.3), server-authoritative via Forge
 * events, mirroring the decompiled MITE decision points:
 *
 * <ul>
 *   <li><b>Weak strike</b> (R196 EntityPlayer.java:2789-2791 +
 *       EntityLivingBase attackEntityFromHelper :705-718): with a bare hand
 *       and health &lt; 2.0 or no food energy, the melee damage body is
 *       skipped outright (no damage, no hurt sound); the knockback still
 *       fires at 0.6 of the normal strength.</li>
 * </ul>
 *
 * <p>The placement deny has moved into {@code MixinItemBlock.onItemUse}
 * (pre-try verdict on both sides — the post-place PlaceEvent revert flashed
 * a ghost block); the craft deny lives in {@code MixinSlotCrafting}, and the
 * move/sprint/dig penalties live in {@code MixinEntityPlayer} /
 * {@code MixinEntityPlayerSP} / {@code ETIMMining.getCurrentPlayerStrVsBlock
 * }.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class ETIMHungerEvents {

    @SubscribeEvent
    public static void onAttackEntity(AttackEntityEvent event) {
        EntityPlayer player = event.getEntityPlayer();
        // Weak-strike deny runs first: a denied strike = zero damage = the
        // R196 damage<=0 early-out (EntityPlayer:1211-1213) ⇒ no charge (G3).
        if (ETIMConfig.hungerWeakStrike
                && ETIMHunger.canOnlyPerformWeakStrike(player)
                && event.getTarget() instanceof EntityLivingBase) {
            event.setCanceled(true);
            EntityLivingBase target = (EntityLivingBase) event.getTarget();

            // R196 attackEntityFromHelper: knockback_amount = 0.6 (weak) vs 1.0
            // (normal). Vanilla 1.12 charges normal melee knockback at 0.4, so the
            // ratio maps onto it. Vanilla jitter-degenerates the ratio axes the
            // same way (EntityLivingBase.java:1105-1111).
            double dx = player.posX - target.posX;
            double dz = player.posZ - target.posZ;
            // A-2 (2026-10-25, watchdog crash evidence): when both axes are ±0
            // dead-on (dx=0, |dz|<1e-2) the jitter can never clear the 1.0E-4
            // threshold -> unbounded spin -> server watchdog. Vanilla's loop is
            // seeded from real offsets; degenerate cases are player+target
            // perfectly stacked. Add a bounded guard and a deterministic
            // diagonal fallback so the loop always exits on the first pass.
            if (dx * dx + dz * dz < 1.0E-4D) {
                dx = 0.01D;
                dz = 0.01D;
            }
            target.knockBack(player, 0.4F * ETIMConfig.weakStrikeKnockbackFactor, dx, dz);
            if (ETIMConfig.foodDebugLog) {
                // A-2 判行：弱击拒绝 + 叠位轴（回归判点 = 出行且 dx/dz 均为有效轴）
                ETIMFoodStats.logFoodEntry(player, "weakStrike deny degenerate-fix dx=" + dx
                        + " dz=" + dz);
            }
            ETIMHunger.sendDeniedFeedback(player, "etim.hunger.weakStrike");
            return;
        }

        // Endurance attack charge (v2+ Endurance order, G3; R196 EntityPlayer:
        // 1313-1315): server-side, per landed swing, no target_was_harmed gate
        // (R196 :1313 is a sibling of the :1247 harmed block, inside the
        // canAttackWithItem block :1208 after the damage>0 early-out :1211).
        // The damage proxy = the attackDamage attribute (D-E1: sharpness adds
        // are not in the attribute — sign-safe; weakness can cross the gate =
        // the registered +1-charge corner). Sweep immunity is structural:
        // AttackEntityEvent fires once per swing (rfg EntityPlayer:1472-1477).
        if (player.world.isRemote
                || !ETIMConfig.foodModel
                || !event.getTarget().canBeAttackedWithItem()
                || player.getEntityAttribute(net.minecraft.entity.SharedMonsterAttributes.ATTACK_DAMAGE).getAttributeValue() <= 0.0F) {
            return;
        }
        ETIMEndurance.chargeAttack(player);
    }

    private ETIMHungerEvents() {
    }
}
