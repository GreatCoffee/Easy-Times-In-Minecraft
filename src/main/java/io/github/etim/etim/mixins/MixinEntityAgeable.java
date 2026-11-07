package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMLivestockEvents;
import net.minecraft.entity.EntityAgeable;
import net.minecraft.entity.passive.AbstractHorse;
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

    @Unique
    private java.util.Set<Integer> etim$entranceMarker = new java.util.HashSet<Integer>();

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

    /**
     * B-17 (audit20 条 330) — the R196 horse-family child growth face,
     * R196 {@code EntityAgeable.onLivingUpdate :81-84} verbatim: while the
     * child age is negative, a horse does NOT take the shared per-tick
     * {@code ++var1} write — instead, on the anti-clustering
     * {@code getTicksExistedWithOffset() % 200 == 0} anchor
     * ({@code ticksExisted + entityId * 47}, R196 {@code Entity.java:315-317})
     * it takes ONE burst write of {@code min(age + 200, 0)} and nothing on
     * the other 199 ticks. The mean rate equals vanilla's {@code ++1}/tick
     * (the "±10×" ledger tag was a misreading of {@code +200}-per-200-ticks)
     * but the face is burst-shaped, and R196 writes {@code min(..., 0)} so
     * the adult transition lands exactly on the burst boundary.
     *
     * <p>R196's single {@code EntityHorse} models the whole family by
     * {@code getHorseType()} (0..4 — :859-863 puts donkey/mule in the same
     * class), so the 1.12 carrier condition is the family umbrella
     * {@code AbstractHorse} (EntityHorse/Donkey/Mule/Llama/Skeleton/Zombie
     * all extend it; the per-tick path those take in vanilla).</p>
     *
     * <p>Injection seat: only the CHILD-branch {@code setGrowingAge} call
     * ({@code ++i}, the first of the two {@code onLivingUpdate} callsites,
     * 1.12 {@code EntityAgeable :230-239}) is redirected — the adult
     * {@code --i} callsite at :242-244 stays vanilla. Under the burst path
     * the vanilla {@code if (i == 0) onGrowingAdult()} tail still runs on
     * the merged local, but the horse family has no {@code onGrowingAdult}
     * override (only EntityVillager does, and villagers ride the vanilla
     * ++1 path untouched) — R196 has no onGrowingAdult concept at all, so
     * the burst write below intentionally does not ring it.</p>
     *
     * <p>Flag = {@code ETIMConfig.livestockNeedsR196} — the horses face
     * belongs to the R196 age-growth pipeline, whose B-12 seat
     * (desperate/cauldron locks) rides the same flag. Composition is
     * faithful: the burst write still passes through
     * {@code etim$ageGate} HEAD (the cauldron lock composes in R196 the
     * same way — the desperate lock never applies, horses are not
     * livestock). The judgment row {@code [FarmLog] agegate
     * src=horseBurst} lands per burst write via the shared ageGateRow
     * lane.</p>
     */
    @Redirect(
        method = "onLivingUpdate",
        at = @At(value = "INVOKE",
                 target = "Lnet/minecraft/entity/EntityAgeable;setGrowingAge(I)V",
                 ordinal = 0),
        require = 1)
    private void etim$horseAgeBurst(EntityAgeable ageable, int vanillaAge) {
        if (ETIMConfig.mobDebugLog && !etim$entranceMarker.contains(ageable.getEntityId())) {
            etim$entranceMarker.add(ageable.getEntityId());
            ETIMLivestockEvents.ageGateRow("horseEntranceGuard", ageable, vanillaAge);
        }
        if (ETIMConfig.livestockNeedsR196
            && (Object) ageable instanceof AbstractHorse
            && !ageable.world.isRemote) {
            int tick = ageable.ticksExisted + ageable.getEntityId() * 47; // R196 Entity.java:315-317 verbatim
            if (tick % 200 == 0) {
                int burst = Math.min(ageable.getGrowingAge() + 200, 0);
                ETIMLivestockEvents.ageGateRow("horseBurst", ageable, burst);
                ageable.setGrowingAge(burst);
            }
            // non-anchor ticks: the burst face writes NOTHING (R196 :82-84)
            return;
        }
        ageable.setGrowingAge(vanillaAge);
    }
}
