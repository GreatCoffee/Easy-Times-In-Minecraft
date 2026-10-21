package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMEndurance;
import io.github.etim.etim.mining.ETIMMiningEvents;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.server.management.PlayerInteractionManager;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
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

    /**
     * Endurance dig drain, per-tick face (v2+ Endurance order, R196
     * PlayerControllerMP:221-222 = 0.01×endurance per dig progress tick,
     * failed digs included; instant one-shots end here with no second charge
     * = R196 :238-245). G2 = server-direct: the R196 client-prediction faces
     * map onto this server dig loop. The active-dig flags are false during
     * the vanilla re-click gap, so delay ticks charge nothing (R196
     * :207-211 blockHitDelay face), and creative digs never set them
     * (R196 :209-212) — the pool-side pre-gate is the second guard.
     */
    @Shadow
    private boolean isDestroyingBlock;

    @Shadow
    private boolean receivedFinishDiggingPacket;

    @Inject(method = "updateBlockRemoving", at = @At("TAIL"))
    private void etim$digDrain(CallbackInfo ci) {
        if (this.isDestroyingBlock || this.receivedFinishDiggingPacket) {
            ETIMEndurance.chargeDig(this.player);
        }
    }

    /**
     * Endurance dig drain, instant-break face (R196 PlayerControllerMP:
     * 179-181 = one charge on the click that one-shots the block). 1.12
     * breaks instant blocks straight inside onBlockClicked
     * ({@code f >= 1.0F -> tryHarvestBlock}, :231-234) without ever entering
     * the dig loop, so the per-tick hook above cannot see them — this
     * INVOKE-position hook completes the verdict's判值 row 1 (瞬拆 = 恰 1
     * 充). Fires at the creative branch too (:171); the charge funnel's
     * creative guard no-ops it.
     */
    @Inject(
            method = "onBlockClicked",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/server/management/PlayerInteractionManager;tryHarvestBlock(Lnet/minecraft/util/math/BlockPos;)Z"))
    private void etim$instantDigDrain(BlockPos pos, EnumFacing side, CallbackInfo ci) {
        ETIMEndurance.chargeDig(this.player);
    }
}
