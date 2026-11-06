package io.github.etim.etim.mixins;

import net.minecraft.entity.item.EntityItem;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * B-11 (条 306/307) — {@code EntityItem.age} is private in 1.12 with no
 * setter; R196's eat settlement (:680) resets the item's despawn age to
 * -18000 after an animal eats one unit off a non-empty pile. The accessor
 * rides the EntityAccessor precedent in this config.
 */
@Mixin(EntityItem.class)
public interface EntityItemAgeAccessor {

    @Accessor("age")
    void setAge(int age);
}
