package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.BlockFalling;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.item.EntityFallingBlock;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Task 2.2 fallout settle rule, R196 foot-cell semantics
 * ({@code EntityFallingSand.onUpdate}: settle requires
 * {@code !Block.sand.canFallDownTo(world, footX, footY - 1, footZ)} — the
 * block BELOW the entity's feet cell decides).
 *
 * <p>Vanilla 1.12's settle check here reads the {@code posY - 0.01} cell
 * instead — the cell the entity's FEET are in. Partial-top collisions break
 * that: a fence's collision box tops out at cell+1.5, so a landing falling
 * block rests with its feet INSIDE the air part of the fence's upper-cell
 * roof and the vanilla check keeps force-resetting {@code onGround} — the
 * entity loops fall→collide→reset every tick, never settles, never drops
 * (only the 600-tick timeout would). R196's cell math (1.6.4 {@code
 * posY - yOffset} ≡ this engine's {@code posY}) looks ONE cell deeper and
 * settles on top — a dirt placed over water next to a fence lands snugly on
 * the fence top, exactly like MITE.</p>
 *
 * <p>The redirect only changes WHICH state feeds the fall-through test; the
 * entire vanilla settle branch (mayPlace → setBlock → else drop) runs
 * untouched after it.</p>
 */
@Mixin(EntityFallingBlock.class)
public abstract class MixinEntityFallingBlock {

    /**
     * The method contains TWO canFallThrough calls: this one (Forge's
     * keep-falling patch, ordinal 0) and the settle precondition reading
     * {@code blockpos1.down()} (ordinal 1) — only the patch call is
     * redirected; the settle precondition keeps its raw state.
     */
    @Redirect(
            method = "onUpdate",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/block/BlockFalling;canFallThrough(Lnet/minecraft/block/state/IBlockState;)Z",
                    ordinal = 0
            ),
            require = 1
    )
    private boolean etim$settleBySupportCell(IBlockState patchCellState) {
        EntityFallingBlock self = (EntityFallingBlock) (Object) this;
        if (!ETIMConfig.miningReform) {
            // Reform off: the old behavior rules over everything.
            return BlockFalling.canFallThrough(patchCellState);
        }
        World world = self.world;
        BlockPos foot = new BlockPos(
                MathHelper.floor(self.posX),
                MathHelper.floor(self.posY),
                MathHelper.floor(self.posZ));
        return BlockFalling.canFallThrough(world.getBlockState(foot.down()));
    }
}
