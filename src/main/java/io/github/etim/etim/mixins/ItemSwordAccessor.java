package io.github.etim.etim.mixins;

import net.minecraft.item.Item;
import net.minecraft.item.ItemSword;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Exposes the private {@code ItemSword.material} (vanilla 1.12 ItemSword has
 * no material getter) so the R196 durability table can apply to swords too.
 */
@Mixin(ItemSword.class)
public interface ItemSwordAccessor {

    @Accessor("material")
    Item.ToolMaterial etim$getMaterial();
}
