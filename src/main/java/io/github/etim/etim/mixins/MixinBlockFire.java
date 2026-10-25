package io.github.etim.etim.mixins;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

import net.minecraft.block.BlockPortal;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import io.github.etim.etim.world.ETIMBlockPortal;
import io.github.etim.etim.metal.ETIMBlocks;

/**
 * underworld 二阶段 T2 — the ignition chain (A2-2). R196: the flint falls a
 * spark block whose onBlockAdded drives {@code tryToCreatePortal}
 * ({\code BlockSpark.java:21-26} + {\code ItemFlintAndSteel.java:88}); 1.12
 * has no spark, the flint places fire (B2-1), and the fire-added branch is
 * hard anchored to the vanilla portal ({\code block/BlockFire.java:402}
 * {@code Blocks.PORTAL.trySpawnPortal}). The redirect forwards the call to
 * the ETIM block. R196 :278-280 condition shape kept: the vanilla
 * dimensionId&gt;0 short-circuit (1.12 :402, same face) survives untouched
 * and the below-cell obsidian quick gate (R196 :279) rides inside this
 * replacement; the The-End reject lives in
 * {\link ETIMBlockPortal#tryToCreatePortal} (R196 :98-100). require=1: the
 * single {\code trySpawnPortal} invoke inside {\code onBlockAdded}.
 */
@Mixin(net.minecraft.block.BlockFire.class)
public abstract class MixinBlockFire {

    @Redirect(
            method = "onBlockAdded",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/block/BlockPortal;trySpawnPortal(Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;)Z"),
            require = 1
    )
    private boolean etim$ignitePortal(BlockPortal portal, World world, BlockPos pos) {
        if (world.getBlockState(pos.down()).getBlock() != Blocks.OBSIDIAN) {
            return false; // R196 BlockFire.java:279 quick gate
        }
        return ETIMBlocks.PORTAL.tryToCreatePortal(world, pos);
    }
}
