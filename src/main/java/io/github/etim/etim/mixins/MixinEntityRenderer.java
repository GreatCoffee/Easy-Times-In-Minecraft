package io.github.etim.etim.mixins;

import io.github.etim.etim.reach.ETIMReach;
import net.minecraft.block.state.IBlockState;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.EntityRenderer;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.RayTraceResult;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Task 2.1, v2: mirrors the R196 {@code EntityRenderer.getMouseOver}
 * (decompile :224-249) — the client selection embeds the block reach filter
 * (body point → block center vs {@code getReach(Block, metadata)}), so
 * unreachable blocks are never highlighted, while entity selection stays
 * generous and the melee/interaction contexts are judged at click time
 * ({@code ETIMReachEvents}, same functions).
 *
 * <p>After vanilla picks a block target beyond the R196 reach, the target is
 * discarded (nothing selected — the R196 behaviour). This also keeps
 * predictions aligned on both sides: one metric, no ghost blocks.</p>
 */
@Mixin(EntityRenderer.class)
public abstract class MixinEntityRenderer {

    @Inject(method = "getMouseOver", at = @At("TAIL"))
    private void etim$blockReachSelection(CallbackInfo ci) {
        Minecraft mc = Minecraft.getMinecraft();
        if (mc.player == null || mc.world == null) {
            return;
        }
        RayTraceResult over = mc.objectMouseOver;
        if (over == null || over.typeOfHit != RayTraceResult.Type.BLOCK) {
            return;
        }
        BlockPos pos = over.getBlockPos();
        IBlockState state = mc.world.getBlockState(pos);
        int metadata = state.getBlock().getMetaFromState(state);
        double bodyDistance = ETIMReach.getBodyCenterDistance(mc.player, pos);
        if (bodyDistance > ETIMReach.getBlockReach(mc.player, state.getBlock(), metadata)) {
            mc.objectMouseOver = null;
        }
    }
}
