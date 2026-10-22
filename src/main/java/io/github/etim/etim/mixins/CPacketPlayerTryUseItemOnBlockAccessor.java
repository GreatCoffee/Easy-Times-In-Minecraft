package io.github.etim.etim.mixins;

import net.minecraft.network.play.client.CPacketPlayerTryUseItemOnBlock;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * T1 harness driver support: the six-argument convenience constructor is
 * {@code @SideOnly(Side.CLIENT)} and stripped from the dedicated-server
 * runtime jar (T1 verdict FAIL root cause), so the no-arg constructor plus
 * this accessor rebuilds the packet server-side.
 */
@Mixin(CPacketPlayerTryUseItemOnBlock.class)
public interface CPacketPlayerTryUseItemOnBlockAccessor {

    @Accessor("position")
    void etim$setPosition(BlockPos value);

    @Accessor("placedBlockDirection")
    void etim$setPlacedBlockDirection(EnumFacing value);

    @Accessor("hand")
    void etim$setHand(EnumHand value);

    @Accessor("facingX")
    void etim$setFacingX(float value);

    @Accessor("facingY")
    void etim$setFacingY(float value);

    @Accessor("facingZ")
    void etim$setFacingZ(float value);
}
