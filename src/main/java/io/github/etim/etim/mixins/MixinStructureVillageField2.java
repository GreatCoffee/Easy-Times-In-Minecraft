package io.github.etim.etim.mixins;

import java.util.Random;

import net.minecraft.world.World;
import net.minecraft.world.gen.structure.StructureBoundingBox;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import io.github.etim.etim.world.ETIMVillageFields;

/**
 * Village-field batch (B-14, 条 318): the R196 {@code ComponentVillageField2}
 * face onto the vanilla 1.12 small field body. Same RETURN-per-pass shape
 * as {@link MixinStructureVillageField1} — R196 :37-48 (six-face all-dead
 * die, :54 default face), :78-91 ages 2..6, no water strip (:640 vanilla
 * x=3 strip removed by the hand), plain Block.wood frame (:73-76, no biome
 * theming vs the vanilla :632 {@code getBiomeSpecificBlockState}).
 */
@Mixin(targets = "net.minecraft.world.gen.structure.StructureVillagePieces$Field2")
public abstract class MixinStructureVillageField2 extends MixinStructureComponent {

    /** Inherited {@code StructureComponent.boundingBox} — the shadow lives
     *  on {@link MixinStructureComponent} (see it for the boot crash that
     *  proved Mixin locates @Shadow fields by target-class declaration). */

    @Inject(method = "addComponentParts",
            at = @At("RETURN"),
            require = 1)
    private void etim$villageFieldR196ize(World worldIn, Random randomIn,
                                          StructureBoundingBox structureBoundingBoxIn, CallbackInfoReturnable<Boolean> cir) {
        ETIMVillageFields.r196ize(worldIn, structureBoundingBoxIn, this.boundingBox, "field2");
    }
}
