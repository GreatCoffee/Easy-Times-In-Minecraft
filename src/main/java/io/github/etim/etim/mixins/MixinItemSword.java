package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMMining;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
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
        int decay = ETIMMining.getToolDecayFromAttackingEntity(stackParam,
                attacker instanceof EntityPlayer ? (EntityPlayer) attacker : null);
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

    /**
     * sworddecay 收口批 (audit20 items 129/137/138; A-2 字节直钉): the vanilla
     * dig-wear guard {@code (double)state.getBlockHardness(...) != 0.0D} in
     * {@code ItemSword.onBlockDestroyed} (:66-73, func_179218_a — the
     * func_185887_b INVOKE is unique, bc4) reads the native field, while the
     * decay chain (this mixin's {@code etim$miteSwordDigDecay}) reads the R196
     * hardness table. With the reform on, the guard must read the same
     * source: the four plant rows (tallgrass / double_plant / sapling /
     * deadbush) carry R196 0.02F where the vanilla field is 0.0, so gate ④
     * (hardness &gt; 0, R196 ItemTool :202) is unreachable through the field
     * alone — {@code ItemSword extends Item} in 1.12 (NOT ItemTool), so the
     * cropdecay @D does not reach here and sword×plant dig stays 0 磨 (B-7).
     * Judgment values via the whole chain: sword decay band 2.0F
     * (ETIMMining:336-337) → five-gate formula → tallgrass/double_plant/
     * sapling/deadbush = floor term 10 (R196 ItemTool:163-171; the vanilla
     * iron_sword fails the validity band ETIMMining:476-478 → one loss=0
     * row). Reform off → return the state's own value (zero perturbation).
     * Same shape as the MixinItemTool @Redirect precedent (etim$r196GuardHardness).
     */
    @Redirect(
            method = "onBlockDestroyed",
            at = @At(value = "INVOKE",
                     target = "Lnet/minecraft/block/state/IBlockState;getBlockHardness(Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;)F"),
            require = 1)
    private float etim$r196GuardHardness(net.minecraft.block.state.IBlockState state, net.minecraft.world.World world,
            net.minecraft.util.math.BlockPos pos) {
        if (!ETIMConfig.miningReform) {
            return state.getBlockHardness(world, pos);
        }
        return ETIMMining.getHardness(state, world, pos);
    }
}
