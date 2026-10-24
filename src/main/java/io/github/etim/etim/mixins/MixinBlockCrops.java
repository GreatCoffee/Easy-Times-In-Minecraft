package io.github.etim.etim.mixins;

import net.minecraft.block.Block;
import net.minecraft.block.BlockCrops;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-SK-1 (mob 批 T8①, 2026-10-24): the R196 crop hardness. R196 BlockCrops
 * :18 {@code setHardness(0.02F)} vs the vanilla 0.0 — the R196 tool-decay
 * gate ④ {@code !(hardness <= 0.0F)} (R196 ItemTool :199-208 + the
 * getToolDecayFromBreakingBlock zero early-out) is first-hand semantics and
 * STAYS; the vanilla zero hardness short-circuits it, so the scythe-on-crop
 * decay (max(1, 2, 1) = 2/plant at the 0.5 grass rate) never fired. The
 * 0.02 face restores the R196 chain (the vanilla != 0 damage guard then
 * passes and the MixinItemTool redirect hands the decay over). Covers every
 * BlockCrops subclass — carrot/potato/beetroot never set hardness after the
 * super ctor. tallGrass carries no R196 setHardness (= 0.0 both sides, no
 * decay in either universe — no face, untouched).
 */
@Mixin(BlockCrops.class)
public abstract class MixinBlockCrops {

    @Inject(method = "<init>", at = @At("TAIL"))
    private void etim$cropHardness(CallbackInfo ci) {
        ((Block) (Object) this).setHardness(0.02F);
    }
}