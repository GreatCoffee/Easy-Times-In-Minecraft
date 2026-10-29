package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMMining;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Task 2.2 tool decay (ToolSuite 终审 §三): vanilla {@code onBlockDestroyed}
 * flattens every dig to 1 damage; the MITE chain is five gates + the
 * class-based decay formula ({@link ETIMMining#getToolDecayFromBreakingBlock})
 * — including "digging something you cannot dig wears the tool down 0".
 * {@code hitEntity} maps to the attack decay table (attack 0.5/1.0 per class).
 */
@Mixin(net.minecraft.item.ItemTool.class)
public abstract class MixinItemTool {

    @Redirect(
            method = "onBlockDestroyed",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/item/ItemStack;damageItem(ILnet/minecraft/entity/EntityLivingBase;)V"),
            require = 1)
    private void etim$miteDigDecay(ItemStack stack, int vanillaAmount, EntityLivingBase entityLiving,
            ItemStack stackParam, World world, IBlockState state, BlockPos pos, EntityLivingBase harvester) {
        if (world.isRemote) {
            return;
        }
        if (!ETIMConfig.miningReform) {
            // Task-2.2 master switch off → vanilla behaviour (1 damage per dig).
            stack.damageItem(vanillaAmount, entityLiving);
            return;
        }
        if (!(entityLiving instanceof EntityPlayer)) {
            return;
        }
        int decay = ETIMMining.getToolDecayFromBreakingBlock((EntityPlayer) entityLiving, state, world, pos);
        if (decay > 0) {
            stack.damageItem(decay, entityLiving);
        }
    }

    /**
     * B-SK-1 tail (cropdecay 终审, 2026-10-29): the vanilla dig-wear guard
     * {@code (double)state.getBlockHardness(...) != 0.0D} reads the native
     * field, while the decay chain reads the R196 hardness table
     * ({@code null} rows fall back native). With the reform on, the guard
     * must read the same source — the four plant rows (tallgrass /
     * double_plant / sapling / deadbush) carry R196 0.02F where the vanilla
     * field is 0.0, so the R196 gate ④ (hardness &gt; 0, R196 ItemTool :202)
     * is unreachable through the field alone. Reform off → return the
     * state's own value (zero perturbation).
     */
    @Redirect(
            method = "onBlockDestroyed",
            at = @At(value = "INVOKE",
                     target = "Lnet/minecraft/block/state/IBlockState;getBlockHardness(Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;)F"),
            require = 1)
    private float etim$r196GuardHardness(IBlockState state, World world, BlockPos pos) {
        if (!ETIMConfig.miningReform) {
            return state.getBlockHardness(world, pos);
        }
        return ETIMMining.getHardness(state, world, pos);
    }

    @Redirect(
            method = "hitEntity",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/item/ItemStack;damageItem(ILnet/minecraft/entity/EntityLivingBase;)V"),
            require = 1)
    private void etim$miteAttackDecay(ItemStack stack, int vanillaAmount, EntityLivingBase entityLiving,
            ItemStack stackParam, EntityLivingBase target, EntityLivingBase attacker) {
        if (attacker.world.isRemote) {
            return;
        }
        if (!ETIMConfig.miningReform) {
            // Master switch off → vanilla behaviour.
            stack.damageItem(vanillaAmount, attacker);
            return;
        }
        int decay = ETIMMining.getToolDecayFromAttackingEntity(stackParam);
        if (decay > 0) {
            stack.damageItem(decay, attacker);
        }
    }
}
