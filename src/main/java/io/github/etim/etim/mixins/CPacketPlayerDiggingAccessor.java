package io.github.etim.etim.mixins;

import net.minecraft.network.play.client.CPacketPlayerDigging;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.BlockPos;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * T1 harness driver support: the {@code CPacketPlayerDigging(Action, BlockPos,
 * EnumFacing)} convenience constructor is {@code @SideOnly(Side.CLIENT)} and
 * therefore absent from the dedicated-server runtime jar (compiles against the
 * srg-merged jar, dies with NoSuchMethodError at runtime — T1 verdict FAIL
 * root cause). Field injection through this accessor keeps the packet object
 * identical to what a real client sends.
 */
@Mixin(CPacketPlayerDigging.class)
public interface CPacketPlayerDiggingAccessor {

    @Accessor("action")
    void etim$setAction(CPacketPlayerDigging.Action value);

    @Accessor("position")
    void etim$setPosition(BlockPos value);

    @Accessor("facing")
    void etim$setFacing(EnumFacing value);
}
