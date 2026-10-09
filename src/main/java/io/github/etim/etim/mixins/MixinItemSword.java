package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMMining;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Task 2.2 tool decay, sword section: {@code ItemSword extends Item} in
 * vanilla 1.12 (NOT ItemTool), so the attack path needs its own redirect —
 * MITE swords lose 0.5 × 100 durability per hit instead of 1.
 */
@Mixin(net.minecraft.item.ItemSword.class)
public abstract class MixinItemSword {

    @Redirect(
            method = "hitEntity",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/item/ItemStack;damageItem(ILnet/minecraft/entity/EntityLivingBase;)V"),
            require = 1)
    private void etim$miteSwordAttackDecay(ItemStack stack, int vanillaAmount, EntityLivingBase entityLiving,
            ItemStack stackParam, EntityLivingBase target, EntityLivingBase attacker) {
        if (attacker.world.isRemote) {
            return;
        }
        if (!ETIMConfig.miningReform) {
            // Master switch off → vanilla behaviour (1 damage per hit).
            stack.damageItem(vanillaAmount, attacker);
            return;
        }
        int decay = ETIMMining.getToolDecayFromAttackingEntity(stackParam);
        if (decay > 0) {
            stack.damageItem(decay, attacker);
        }
    }

    @Redirect(
            method = "onBlockDestroyed",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/item/ItemStack;damageItem(ILnet/minecraft/entity/EntityLivingBase;)V"),
            require = 1)
    private void etim$miteSwordDigDecay(ItemStack stack, int vanillaAmount, EntityLivingBase entityLiving,
            ItemStack stackParam, net.minecraft.world.World world, net.minecraft.block.state.IBlockState state,
            net.minecraft.util.math.BlockPos pos, EntityLivingBase harvester) {
        if (world.isRemote) {
            return;
        }
        if (!ETIMConfig.miningReform) {
            // Master switch off → vanilla behaviour (2 damage per dig).
            stack.damageItem(vanillaAmount, entityLiving);
            return;
        }
        if (!(entityLiving instanceof net.minecraft.entity.player.EntityPlayer)) {
            return;
        }
        int decay = ETIMMining.getToolDecayFromBreakingBlock(
                (net.minecraft.entity.player.EntityPlayer) entityLiving, state, world, pos);
        if (decay > 0) {
            stack.damageItem(decay, entityLiving);
        }
    }
}
