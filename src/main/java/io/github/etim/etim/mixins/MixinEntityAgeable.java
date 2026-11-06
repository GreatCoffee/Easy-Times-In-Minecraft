package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.EntityAgeable;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-12 (audit20 条 309) — the two R196 age-chain value faces that live on
 * the shared {@code EntityAgeable} base, plus the spawn-egg newborn face:
 * <ul>
 *   <li>F-D the desperate growth lock — R196
 *       {@code EntityLivestock.setGrowingAge :389-393}: a child whose
 *       next write advances the age ({@code par1 > current}) is silently
 *       NOT grown while {@code isDesperateForFood()} or
 *       {@code isDesperateForWater()} holds (both {@code < 0.05F},
 *       EntityLivestock:136-146). The write is dropped, not shifted —
 *       vanilla carries no equivalent. Livestock-only (R196 subclass
 *       seat): the four-host instance check rides
 *       {@code ETIMLivestockEvents.isLivestock}.</li>
 *   <li>F-B(1) the cauldron lock — R196
 *       {@code EntityAgeable.setGrowingAge :33-47}: a child standing in a
 *       cauldron whose head cell is air-OR-passable-blocked
 *       ({@code !isAirOrPassableBlock(y+1, true)}) cannot reach
 *       {@code par1 >= 0} — the write is re-issued as {@code -1}. Base
 *       level in R196 (every ageable passes it), so this mixin carries no
 *       livestock restriction either.</li>
 *   <li>F-B(2) the spawn-egg newborn face — R196
 *       {@code ItemMonsterPlacer :62} calls
 *       {@code setGrowingAgeToNewborn()} = {@code -64000}; vanilla writes
 *       {@code -24000} at {@code EntityAgeable.processInteract :49}.</li>
 * </ul>
 *
 * <p>The desperate lock cancels (drops) the vanilla body — an exact
 * R196 :389-392 mirror, where the gate skips
 * {@code super.setGrowingAge}. The cauldron lock re-issues
 * {@code setGrowingAge(-1)}: the re-entry lands on a child current minus
 * (-64000 …) so {@code par1 <= current} reads false and the desperate
 * gate would catch it — hence the instance-level re-entry guard, which
 * lets the guarded call reach the vanilla body verbatim. The vanilla body
 * is byte-identical when both faces stand down.</p>
 */
@Mixin(EntityAgeable.class)
public abstract class MixinEntityAgeable {

    @Unique
    private boolean etim$ageGateReentry;

    @Shadow
    public abstract void setGrowingAge(int age);

    @Inject(method = "setGrowingAge", at = @At("HEAD"), cancellable = true, require = 1)
    private void etim$ageGate(int age, CallbackInfo ci) {
        if (this.etim$ageGateReentry) {
            return; // the -1 re-dispatch goes straight to the vanilla body
        }
        EntityAgeable self = (EntityAgeable) (Object) this;
        if (ETIMLivestockEvents.desperateAgeLock(self, age)) {
            ETIMLivestockEvents.ageGateRow("desperate cancel", self, age); // smoke probe: cancel fired
            ci.cancel(); // R196 :390-392 — the body is skipped, not shifted
            return;
        }
        int locked = ETIMLivestockEvents.cauldronAgeLock(self, age);
        if (locked != age) {
            ETIMLivestockEvents.ageGateRow("cauldron cancel", self, age); // smoke probe: cancel fired
            this.etim$ageGateReentry = true;
            try {
                this.setGrowingAge(locked); // R196 :39 — par1 = -1, then the body
            } finally {
                this.etim$ageGateReentry = false;
            }
            ci.cancel();
        }
    }

    @Redirect(
        method = "processInteract",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/EntityAgeable;setGrowingAge(I)V"),
        require = 1)
    private void etim$spawnEggAge(EntityAgeable ageable, int age) {
        ageable.setGrowingAge(ETIMLivestockEvents.r196NewbornAge(age));
    }
}
