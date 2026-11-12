package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMMobEquip;
import io.github.etim.etim.mob.ETIMEntityAISeekFiringPosition;
import net.minecraft.entity.monster.AbstractSkeleton;
import net.minecraft.world.DifficultyInstance;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B3 批文 §〇-获取机制面: the R196 skeleton random-equipment chain
 * (weapon :189-202 + armor) replaces the vanilla face WHOLE (HEAD+cancel,
 * 终审伪码批注 — TAIL would leave the vanilla bow/armor rows behind).
 * Covers normal + stray (both ride this override); the wither skeleton
 * keeps its own 1.12 override (批文 §四, wither 分流坐实 — C 级登记).
 * Server side only.
 *
 * <p>B-37 — the R196 {@code EntitySkeleton :251-261} seek-firing-position
 * seat (second handler): inside {@code setCombatTask} the bow branch adds
 * {@code addTask(4, aiArrowAttack)} then
 * {@code addTask(3, new EntityAISeekFiringPosition(this, 1.0F, true))}.
 * 1.12's {@code setCombatTask :223-248} adds only the bow-attack task, so
 * the TAIL arm appends the seek task when the mainhand is a bow. C-note:
 * every {@code setCombatTask} call re-registers the task (R196 {@code
 * :257} same re-add semantics; vanilla {@code addTask} does not dedupe).
 * Family flag <b>livestockNeedsR196</b> (the sixteenth reuse).</p>
 */
@Mixin(AbstractSkeleton.class)
public abstract class MixinAbstractSkeletonEquip {

    @Inject(method = "setEquipmentBasedOnDifficulty(Lnet/minecraft/world/DifficultyInstance;)V",
            at = @At("HEAD"), cancellable = true)
    private void etim$mobEquip(DifficultyInstance difficulty, CallbackInfo ci) {
        AbstractSkeleton skeleton = (AbstractSkeleton) (Object) this;
        if (!skeleton.world.isRemote) {
            ETIMMobEquip.skeletonEquip(skeleton);
            ci.cancel();
        }
    }

    /**
     * B-37 — the R196 {@code EntitySkeleton :257} seek seat (see the class
     * javadoc). TAIL of {@code setCombatTask} so the vanilla bow branch
     * ({@code addTask(4, aiArrowAttack)}, {@code :241}) lands first — the
     * R196 order (combat 4, then seek 3).
     */
    @Inject(method = "setCombatTask()V", at = @At("TAIL"))
    private void etim$seekFiringPositionAITask(CallbackInfo ci) {
        AbstractSkeleton skeleton = (AbstractSkeleton) (Object) this;
        if (skeleton.world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its shape (the pass-through)
        }
        net.minecraft.item.ItemStack held = skeleton.getHeldItemMainhand();
        if (held != null && held.getItem() instanceof net.minecraft.item.ItemBow) { // R196 EntitySkeleton :255
            skeleton.tasks.addTask(3,
                    new ETIMEntityAISeekFiringPosition(skeleton, 1.0F, true)); // R196 :257
        }
    }
}
