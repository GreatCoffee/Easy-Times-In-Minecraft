package io.github.etim.etim.mixins;

import io.github.etim.etim.farm.ETIMCompost;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.tileentity.TileEntityChest;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Manure-source batch (B-7): the per-chest compost bank — R196
 * {@code TileEntityChest} keeps {@code private float compost} (:18) persisted
 * as the {@code "compost"} float tag (:101/:119); vanilla 1.12 has no such
 * field, so the mixin owns it and soft-implements the {@link
 * ETIMCompost.Carry} duck interface the pump consults.
 */
@Mixin(TileEntityChest.class)
public abstract class MixinTileEntityChest implements ETIMCompost.Carry {

    @Unique
    private float etim$compost = 0.0F;

    @Override
    public float etim$getCompost() {
        return this.etim$compost;
    }

    @Override
    public void etim$setCompost(float value) {
        this.etim$compost = value;
    }

    @Inject(method = "readFromNBT", at = @At("TAIL"))
    private void etim$readCompost(NBTTagCompound compound, CallbackInfo ci) {
        this.etim$compost = compound.getFloat("compost");
    }

    @Inject(method = "writeToNBT", at = @At("TAIL"))
    private void etim$writeCompost(NBTTagCompound compound, CallbackInfo ci) {
        compound.setFloat("compost", this.etim$compost);
    }
}
