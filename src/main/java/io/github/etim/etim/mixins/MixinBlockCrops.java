package io.github.etim.etim.mixins;

import net.minecraft.block.Block;
import net.minecraft.block.BlockCrops;
import net.minecraft.block.state.BlockStateContainer;
import net.minecraft.block.state.IBlockState;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import io.github.etim.etim.farm.ETIMBlight;
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
        boolean fertilized = te != null && te.isFertilized();
        if (io.github.etim.etim.ETIMConfig.growthRateR196) {
            // growth-rate batch (B-9): the R196 family composition replaces the
            // F8-only path — base × fert × temp × hum × global × prox, ONE
            // 'growth rate' row (the composition face supersedes the ratio row).
            float value = io.github.etim.etim.farm.ETIMFarm.composeGrowthRateR196(worldIn, pos, blockIn,
                    base, fertilized, io.github.etim.etim.ETIMConfig.fertilizedGrowthFactor);
            cir.setReturnValue(value);
            return;
        }
        if (!fertilized) {
            return;
        }
        float value = base * io.github.etim.etim.ETIMConfig.fertilizedGrowthFactor;
        io.github.etim.etim.farm.ETIMFarm.logGrowth(worldIn, pos, base, value);
        cir.setReturnValue(value);
    }

    // ------------------------------------------------- blight batch (B-13, 条 314)

    /**
     * The metadata blight bit, R196 latest {@code getBlightBit :267-269} =
     * <b>bit 8</b> (growth rides bits 1/2/4 — {@code getMetadataNotes :26}
     * verbatim). The property is owned by {@link ETIMBlight} (headless class,
     * loadable server-side); the container here carries it so the raw
     * metadata byte round-trips bit 8 byte-identically to R196. Beetroot is
     * self-owning (its own {@code createBlockState}) and R196 has no such
     * crop — guard every touched face on the container key.
     */
    @Inject(method = "createBlockState", at = @At("RETURN"), cancellable = true, require = 1)
    private void etim$blightStateContainer(CallbackInfoReturnable<BlockStateContainer> cir) {
        cir.setReturnValue(new BlockStateContainer((Block) (Object) this, BlockCrops.AGE, ETIMBlight.BLIGHTED));
    }

    @Inject(method = "getStateFromMeta", at = @At("HEAD"), cancellable = true, require = 1)
    private void etim$blightMetaGet(int meta, CallbackInfoReturnable<IBlockState> cir) {
        if (!((Block) (Object) this).getDefaultState().getProperties().containsKey(ETIMBlight.BLIGHTED)) {
            return; // beetroot: self-owned container without the property
        }
        // R196 metadataNotes — bit 8 = blighted, bits 1/2/4 = growth
        cir.setReturnValue(((BlockCrops) (Object) this).withAge(meta & 7)
                .withProperty(ETIMBlight.BLIGHTED, java.lang.Boolean.valueOf((meta & 8) != 0)));
    }

    @Inject(method = "getMetaFromState", at = @At("HEAD"), cancellable = true, require = 1)
    private void etim$blightMetaPut(IBlockState state, CallbackInfoReturnable<Integer> cir) {
        if (!state.getProperties().containsKey(ETIMBlight.BLIGHTED)) {
            return; // beetroot
        }
        int age = state.getValue(BlockCrops.AGE);
        cir.setReturnValue(age | (((java.lang.Boolean) state.getValue(ETIMBlight.BLIGHTED)).booleanValue() ? 8 : 0));
    }

    /** R196 {@code ItemDye.tryFertilize :127-139} — bone meal reaches a crop
     *  ONLY when blighted (unblight face); R196 has no bonemeal growth face
     *  at all, so a non-blighted crop denies the item (not consumed, no
     *  particles). Age/maturity is irrelevant for the unblight arm. */
    @Inject(method = "canGrow", at = @At("HEAD"), cancellable = true, require = 1)
    private void etim$blightBonemealGate(World world, BlockPos pos, IBlockState state, boolean isClient,
                                         CallbackInfoReturnable<Boolean> cir) {
        if (!io.github.etim.etim.ETIMConfig.blightR196 || !ETIMBlight.isBlightSeat(state.getBlock())) {
            return;
        }
        cir.setReturnValue(ETIMBlight.isBlighted(state));
    }

    @Inject(method = "canUseBonemeal", at = @At("HEAD"), cancellable = true, require = 1)
    private void etim$blightBonemealDice(World world, java.util.Random rand, BlockPos pos, IBlockState state,
                                         CallbackInfoReturnable<Boolean> cir) {
        if (!io.github.etim.etim.ETIMConfig.blightR196 || !ETIMBlight.isBlightSeat(state.getBlock())) {
            return;
        }
        cir.setReturnValue(true); // R196 fertilize = diceless once blighted
    }

    @Inject(method = "grow(Lnet/minecraft/world/World;Ljava/util/Random;Lnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/state/IBlockState;)V",
            at = @At("HEAD"), cancellable = true, require = 1)
    private void etim$blightBonemealApply(World world, java.util.Random rand, BlockPos pos, IBlockState state,
                                          CallbackInfo ci) {
        if (!io.github.etim.etim.ETIMConfig.blightR196 || !ETIMBlight.isBlightSeat(state.getBlock())) {
            return;
        }
        ETIMBlight.unblight(world, pos, state);
        ci.cancel();
    }

    /**
     * R196 {@code dropBlockAsEntityItem :337-339} — a blighted crop yields
     * NOTHING (harvest, newsbreak or otherwise; the potato poisonous face is
     * the harvest batch's seat, NOT this one). The 1.12 funnel is getDrops.
     */
    @Inject(method = "getDrops", at = @At("TAIL"), require = 1, remap = false)
    private void etim$blightNoDrops(net.minecraft.util.NonNullList<net.minecraft.item.ItemStack> drops,
                                    net.minecraft.world.IBlockAccess world, BlockPos pos, IBlockState state,
                                    int fortune, CallbackInfo ci) {
        if (!io.github.etim.etim.ETIMConfig.blightR196 || !ETIMBlight.isBlightSeat(state.getBlock())) {
            return;
        }
        if (ETIMBlight.isBlighted(state)) {
            drops.clear();
            io.github.etim.etim.farm.ETIMFarm.row("blight src=noDrops block=" + state.getBlock().getRegistryName()
                    + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ()
                    + " age=" + state.getValue(BlockCrops.AGE));
        }
    }
}