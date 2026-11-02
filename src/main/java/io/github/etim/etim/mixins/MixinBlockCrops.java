package io.github.etim.etim.mixins;

import net.minecraft.block.Block;
import net.minecraft.block.BlockCrops;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

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
 * super ctor. (Stale sentence corrected, audit20 item 137 C-7: tallGrass
 * AND deadBush DO carry R196 setHardness(0.02F) — Block.java:180-181 /
 * :185-186 — against the vanilla 0.0; those plant faces live in the
 * ETIMMining hardness-table rows plus the @D guard redirects, not here.)
 */
@Mixin(BlockCrops.class)
public abstract class MixinBlockCrops {

    @Inject(method = "<init>", at = @At("TAIL"))
    private void etim$cropHardness(CallbackInfo ci) {
        ((Block) (Object) this).setHardness(0.02F);
    }

    /**
     * farm1 (batch B4, audit20 条 254-257 F8): R196's fertilized growth-rate
     * ×1.5 (BlockCrops.java:205-207 / BlockStem.java:214-216 — the SAME
     * protected static 1.12 anchor is called by crops :87 and stems :83,
     * 终审亲证) rides ONE injection: TAIL-RETURN of the static chance.
     * Client-side calls behave vanilla (gated inside ETIMFarm.logGrowth /
     * the TE is server-authoritative, no sync).
     */
    @Inject(
            method = "getGrowthChance(Lnet/minecraft/block/Block;Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;)F",
            at = @At("RETURN"),
            cancellable = true,
            remap = true
    )
    private static void etim$fertilizedGrowth(Block blockIn, World worldIn, BlockPos pos,
                                              CallbackInfoReturnable<Float> cir) {
        if (worldIn.isRemote) {
            return;
        }
        float base = cir.getReturnValueF();
        if (base <= 0.0F) {
            return;
        }
        io.github.etim.etim.tileentity.ETIMFarmlandTile te =
                io.github.etim.etim.farm.ETIMFarm.farmlandTile(worldIn, pos.down());
        if (te == null || !te.isFertilized()) {
            return;
        }
        float value = base * io.github.etim.etim.ETIMConfig.fertilizedGrowthFactor;
        io.github.etim.etim.farm.ETIMFarm.logGrowth(worldIn, pos, base, value);
        cir.setReturnValue(value);
    }
}