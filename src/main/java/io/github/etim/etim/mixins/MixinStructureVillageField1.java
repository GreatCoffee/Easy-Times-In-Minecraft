package io.github.etim.etim.mixins;

import java.util.Random;

import net.minecraft.world.World;
import net.minecraft.world.gen.structure.StructureBoundingBox;
import net.minecraft.world.gen.structure.StructureVillagePieces;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import io.github.etim.etim.world.ETIMVillageFields;

/**
 * Village-field batch (B-14, 条 318): the R196 {@code ComponentVillageField}
 * face onto the vanilla 1.12 field body. The hand fires at every
 * {@code addComponentParts} RETURN (generateStructure runs the body once
 * per chunk window that intersects the piece — each pass re-runs the
 * vanilla fills clipped to that window, so the transpose must be equally
 * per-pass and idempotent by intersection, which the hand is).
 *
 * <p>{@link #boundingBox} is the inherited {@code StructureComponent} box
 * (post-offset once the ground level binds) — the geometry anchor; the
 * {@code structurebb} argument is the whole clip window handed in by
 * {@code StructureStart.generateStructure :50} (NOT the piece box), the
 * handler works on the intersection.</p>
 *
 * <p>Early {@code return true} (averageGroundLvl &lt; 0, :496-499) writes
 * nothing, so the injected call is a no-op there — no behavioral risk.</p>
 */
@Mixin(targets = "net.minecraft.world.gen.structure.StructureVillagePieces$Field1")
public abstract class MixinStructureVillageField1 extends MixinStructureComponent {

    /** Inherited {@code StructureComponent.boundingBox} — the shadow lives
     *  on {@link MixinStructureComponent} (Mixin locates @Shadow fields by
     *  target-class declaration only; see that class for the boot crash
     *  that proved it). */

    @Inject(method = "addComponentParts",
            at = @At("RETURN"),
            require = 1)
    private void etim$villageFieldR196ize(World worldIn, Random randomIn,
                                          StructureBoundingBox structureBoundingBoxIn, CallbackInfoReturnable<Boolean> cir) {
        ETIMVillageFields.r196ize(worldIn, structureBoundingBoxIn, this.boundingBox, "field1");
    }
}
