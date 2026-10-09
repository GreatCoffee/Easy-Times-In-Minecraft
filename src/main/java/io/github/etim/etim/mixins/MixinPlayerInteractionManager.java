package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMMiningEvents;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.server.management.PlayerInteractionManager;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Task 2.2 post-harvest chain (server only, ToolSuite 终审 §四): after a
 * successful {@code tryHarvestBlock} the R196 managers scan the above +
 * horizontal neighbours for underminable blocks (dirt/soulsand) and run the
 * tree-felling recursion when the removed block was wood. The block state is
 * captured at HEAD because removal may have already happened by TAIL.
 */
@Mixin(PlayerInteractionManager.class)
public abstract class MixinPlayerInteractionManager {

    @Shadow
    public World world;

    @Shadow
    public EntityPlayerMP player;

    private static final ThreadLocal<IBlockState> etim$harvested = new ThreadLocal<IBlockState>();

    @Inject(method = "tryHarvestBlock", at = @At("HEAD"))
    private void etim$captureState(BlockPos pos, CallbackInfoReturnable<Boolean> cir) {
        etim$harvested.set(this.world.getBlockState(pos));
    }

    @Inject(method = "tryHarvestBlock", at = @At("TAIL"))
    private void etim$postHarvest(BlockPos pos, CallbackInfoReturnable<Boolean> cir) {
        IBlockState harvested = etim$harvested.get();
        etim$harvested.remove();
        if (!ETIMConfig.miningReform || !cir.getReturnValue() || harvested == null) {
            return;
        }
        ETIMMiningEvents.postHarvest(this.world, pos, harvested, this.player);
    }
}
