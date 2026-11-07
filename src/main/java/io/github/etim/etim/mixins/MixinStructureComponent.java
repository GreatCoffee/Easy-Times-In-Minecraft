package io.github.etim.etim.mixins;

import net.minecraft.world.gen.structure.StructureBoundingBox;
import net.minecraft.world.gen.structure.StructureComponent;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;

/**
 * Village-field batch (B-14, 条 318): the {@link #boundingBox} shadow LIVES
 * HERE because Mixin locates @Shadow fields by target-class DECLARATION
 * only — the two village-field inner mixins stand on subclasses of
 * {@code StructureComponent}, and a direct {@code @Shadow} on the inherited
 * field failed at boot with {@code @Shadow field boundingBox was not
 * located in the target class StructureVillagePieces$Field1} (f13-b13-boot
 * run 08:24:33). The canonical parent-mixin chain carries the shadow: the
 * child mixins extend this one, and the field resolves through the
 * StructureComponent hierarchy.
 */
@Mixin(StructureComponent.class)
public abstract class MixinStructureComponent {

    @Shadow
    public StructureBoundingBox boundingBox;
}
