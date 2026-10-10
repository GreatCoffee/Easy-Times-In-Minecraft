package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMFoodStats;
import io.github.etim.etim.ingest.ETIMIngestibles;
import io.github.etim.etim.nutrition.NutritionSystem;
import net.minecraft.block.BlockCake;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Task 2.4: the cake-slice gate AND the diagnosis probes on the vanilla
 * cake-slice activation pipeline (BlockCake.onBlockActivated) — the deepest
 * shared point of the eat path.
 *
 * <p>Architecture note: R196 eats cake through the very same method
 * ({@code BlockCake.onBlockActivated → tryEatCakeSlice → canIngest(item,0)},
 * audit §1.1), so the five-arg gate lives INSIDE the activation body here —
 * not in the event layer. The task-2.4 runs showed that cancelling the Forge
 * RightClickBlock event does not stop the vanilla activation on this 1.12.2
 * patch set, while an in-body HEAD refusal (client + server) both leaves the
 * prediction honest AND makes the server bite impossible at full pools.</p>
 *
 * <p>Return-probe guard: the sixth bite replaces the block with air, so the
 * post-state read is guarded (the old raw probe crashed on
 * {@code air.getValue(bites)}).</p>
 */
@Mixin(BlockCake.class)
public abstract class MixinBlockCake {

    @Inject(
            method = "onBlockActivated(Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/state/IBlockState;Lnet/minecraft/entity/player/EntityPlayer;Lnet/minecraft/util/EnumHand;Lnet/minecraft/util/EnumFacing;FFF)Z",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$activationGate(World world, BlockPos pos, IBlockState state, EntityPlayer player,
                                     EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ,
                                     CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.foodModel) {
            return;
        }
        ItemStack held = player.getHeldItem(hand);
        if (!ETIMFoodStats.canIngest(player, NutritionSystem.cakeSliceValue())) {
            ETIMIngestibles.logIngest(player, "cake slice GATE-FALSE " + (world.isRemote ? "[client]" : "[server]")
                    + " bites=" + state.getValue(BlockCake.BITES)
                    + " held=" + (held.isEmpty() ? "EMPTY" : held.getItem().getRegistryName())
                    + " pos=" + pos);
            cir.setReturnValue(Boolean.FALSE);
            return;
        }
        // Single decision point, pools evaluated BEFORE any apply. The values
        // are granted HERE (server only) so the client prediction and the
        // server gate can never disagree about the same click: the task-2.4
        // first-bite ghost came from the old event layer applying the values
        // BEFORE this gate ran, which filled the pools and flipped the very
        // gate that had just allowed the click.
        if (!world.isRemote) {
            ETIMFoodStats.applyFoodValue(player, NutritionSystem.cakeSliceValue(), "cake_slice");
        }
        if (ETIMConfig.ingestDebugLog) {
            ETIMIngestibles.logIngest(player, "cake slice gate-PASS " + (world.isRemote ? "[client]" : "[server]")
                    + " bites=" + state.getValue(BlockCake.BITES)
                    + " held=" + (held.isEmpty() ? "EMPTY" : held.getItem().getRegistryName())
                    + " pos=" + pos);
        }
    }

    @Inject(
            method = "onBlockActivated(Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/state/IBlockState;Lnet/minecraft/entity/player/EntityPlayer;Lnet/minecraft/util/EnumHand;Lnet/minecraft/util/EnumFacing;FFF)Z",
            at = @At("RETURN")
    )
    private void etim$activationProbeReturn(World world, BlockPos pos, IBlockState state, EntityPlayer player,
                                            EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ,
                                            CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.ingestDebugLog) {
            return;
        }
        IBlockState after = world.getBlockState(pos);
        String afterText = after.getBlock() instanceof BlockCake
                ? "bitesAfter=" + after.getValue(BlockCake.BITES)
                : "blockAfter=AIR/other(" + after.getBlock().getRegistryName() + ")";
        ETIMIngestibles.logIngest(player, "cake onBlockActivated RETURN " + (world.isRemote ? "[client]" : "[server]")
                + " result=" + cir.getReturnValue() + " " + afterText);
    }
}
