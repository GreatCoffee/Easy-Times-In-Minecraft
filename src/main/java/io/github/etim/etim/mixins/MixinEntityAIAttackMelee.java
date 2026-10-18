package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMDigging;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.ai.EntityAIAttackMelee;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.util.math.MathHelper;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * AI-02 (补裁 C-9b, must-add E2) — the second {@code is_destroying_block}
 * write-in face: R196 {@code EntityAIAttackOnCollide.updateTask :153-165}
 * runs the dig gate when the strike is out of reach. The vanilla carrier is
 * {@link EntityAIAttackMelee#updateTask} — its single
 * {@code checkAndPerformAttack} call site is redirected (require=1):
 * reachable ⇒ the vanilla body runs unchanged; unreachable ⇒ the R196 dig
 * gate (both y with the +0.5 floor, {@code setBlockToDig(target, below)}
 * then {@code attackTick = 20} unconditionally — R196 :162-163 ignores the
 * write-in return). Skeletons and other melee mobs carry no dig capability,
 * so the gates zero them back to vanilla.
 */
@Mixin(EntityAIAttackMelee.class)
public abstract class MixinEntityAIAttackMelee {

    @Shadow protected net.minecraft.entity.EntityCreature attacker;

    @Shadow protected int attackTick;

    @Shadow protected abstract double getAttackReachSqr(EntityLivingBase attackTarget);

    @Shadow protected abstract void checkAndPerformAttack(EntityLivingBase enemy, double distToEnemySqr);

    @Redirect(method = "updateTask",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/entity/ai/EntityAIAttackMelee;checkAndPerformAttack(Lnet/minecraft/entity/EntityLivingBase;D)V"),
            require = 1)
    private void etim$attackOrDig(EntityAIAttackMelee self, EntityLivingBase enemy, double distToEnemySqr) {
        // self is the mixin receiver of the redirected this.checkAndPerformAttack
        // virtual call (virtual invoke ⇒ handler must carry the receiver as its
        // first parameter — f5f2563 window A1: its absence is a compile-green /
        // apply-FATAL refmap face). self ≡ this.
        ETIMDigging.IState dig = ETIMConfig.zombieDigAI && this.attacker != null
                ? ETIMDigging.get(this.attacker) : null;
        if (dig != null // dig capability = zombie host (裁 3)
                && ETIMDigging.isDiggingEnabled((EntityZombie) this.attacker) // C-9a fourth consumer face
                && distToEnemySqr > this.getAttackReachSqr(enemy)) { // v1 unreachable single gate (补裁 B 级精度替代)
            int attackerY = MathHelper.floor(this.attacker.posY + 0.5D); // R196 :156
            int targetY = MathHelper.floor(enemy.posY + 0.5D); // R196 :158
            if (targetY > attackerY) { // R196 :159
                ETIMDigging.setBlockToDig((EntityZombie) this.attacker, dig,
                        MathHelper.floor(enemy.posX), targetY - 1, MathHelper.floor(enemy.posZ), true); // R196 :162
                this.attackTick = 20; // R196 :163 — unconditional
            }
            return;
        }
        this.checkAndPerformAttack(enemy, distToEnemySqr); // vanilla 原样 (virtual dispatch preserved)
    }
}
