package io.github.etim.etim.mixins;

import net.minecraft.entity.EntityLiving;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * B-38 drop-face pack — the 1.12 drop-chance arrays (EntityLiving :83-86,
 * the vanilla face has no slot getter — the vanilla dropEquipment :1034-1044
 * switches inline). The R196 rules (EntityLiving :982-1020) need the slot
 * chance by {@code EntityEquipmentSlot}, so the accessor exposes both arrays.
 */
@Mixin(EntityLiving.class)
public interface ETIMEntityLivingDropsAccessor {

    @Accessor("inventoryHandsDropChances")
    float[] etim$inventoryHandsDropChances();

    @Accessor("inventoryArmorDropChances")
    float[] etim$inventoryArmorDropChances();
}
