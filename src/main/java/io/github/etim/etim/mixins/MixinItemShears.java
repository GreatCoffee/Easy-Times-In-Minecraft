package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMMining;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.EntitySheep;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

/**
 * Toolcarrier batch (audit20 items 145/146/147): vanilla 1.12
 * {@code ItemShears.onBlockDestroyed} (:24-28) unconditionally
 * {@code stack.damageItem(1, …)} inside the {@code !isRemote} gate, stacked on
 * top of the R196 decay-only semantics — the double-wear face shows up as
 * {@code dur = R196 decay + 1} (W-35c dur 9 = decay 8 + vanilla 1, verdict
 * receipt reeds-W35). R196 ItemShears carries no {@code damageItem} at all
 * (whole-class negative; wear rides {@code tryDamageHeldItem} +
 * {@code getToolDecayFromBreakingBlock}, R196 ItemShears:89), so the vanilla
 * +1 is a class-family semantic drift, not a decay.
 *
 * <p>The redirect: reform on + ETIM shears + player hand → skip the vanilla +1
 * ({@link io.github.etim.etim.metal.ETIMItemShearsRusted#onBlockDestroyed} adds
 * the R196 decay itself, so the redirected +1 would be pure over-wear);
 * vanilla shears / off phase / mob hands stay on the vanilla call (the zombie
 * dig callback at {@code ETIMDigging} reaches this method for the ETIM-shears
 * item too, hence the {@link EntityPlayer} gate). The remote face needs no
 * extra gate: the vanilla +1 only executes under {@code !isRemote}, so the
 * redirect target is server-side only.</p>
 */
@Mixin(net.minecraft.item.ItemShears.class)
public abstract class MixinItemShears {

    @Redirect(
            method = "onBlockDestroyed",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/item/ItemStack;damageItem(ILnet/minecraft/entity/EntityLivingBase;)V"),
            require = 1)
    private void etim$r196GuardShearsDamage(ItemStack stack, int vanillaAmount, EntityLivingBase entityLiving,
            ItemStack stackParam, World world, IBlockState state, BlockPos pos, EntityLivingBase harvester) {
        if (!ETIMConfig.miningReform) {
            // Master switch off → vanilla behaviour (+1 per dig).
            stack.damageItem(vanillaAmount, entityLiving);
            return;
        }
        if (stackParam.getItem() instanceof io.github.etim.etim.metal.ETIMItemShearsRusted
                && entityLiving instanceof EntityPlayer) {
            // R196 decay-only: the ETIM decay is added by the item itself —
            // the vanilla +1 here is pure over-wear, skip it.
            return;
        }
        // vanilla shears / mob hands → vanilla behaviour (+1 per dig).
        stack.damageItem(vanillaAmount, entityLiving);
    }

    /**
     * Path-① batch (audit20 items 150/151): for IShearable blocks
     * ({@code ItemShears.onBlockStartBreak}, :81-115) the vanilla +1 at
     * {@code :108} is the <em>only</em> wear — the {@code true} return at
     * {@code :111} short-circuits {@code PlayerInteractionManager.tryHarvestBlock}
     * (:328), so {@code onBlockDestroyed} (and the first redirect above) never
     * runs for sheared blocks. R196 replaces the flat +1 with the decay-only
     * semantics ({@code ItemShears:89 ride through} the six-block IShearable
     * faces ride {@code getToolDecayFromBreakingBlock}, R196 ItemShears:89).
     *
     * <p>The redirect swaps the vanilla +1 for the funnel decay; the funnel
     * itself issues the single {@code [MiningLog] tool decay} row
     * (ETIMMining :282 — unconditional, zero-loss rows included, the tripwire
     * shape of W-36d) — deliberately no extra logging here (no double
     * issuance; the W-37 driver reads that row verbatim). {@code isShearable}
     * = false targets never reach :108, so they stay on the normal
     * break path untouched. Vanilla shears stay on the vanilla call.</p>
     */
    @Redirect(
            method = "onBlockStartBreak",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/item/ItemStack;damageItem(ILnet/minecraft/entity/EntityLivingBase;)V"),
            require = 1)
    private void etim$r196GuardShearsStartBreakDamage(ItemStack stack, int vanillaAmount, EntityLivingBase entityLiving,
            ItemStack stackParam, BlockPos pos, EntityPlayer player) {
        if (!ETIMConfig.miningReform) {
            // Master switch off → vanilla behaviour (+1 per shear).
            stack.damageItem(vanillaAmount, entityLiving);
            return;
        }
        if (stackParam.getItem() instanceof io.github.etim.etim.metal.ETIMItemShearsRusted) {
            // R196 decay-only on the shear path: wear = funnel decay, and the
            // funnel's :282 row is the Judgment-log anchor (loss column = decay).
            int decay = ETIMMining.getToolDecayFromBreakingBlock(player, player.world.getBlockState(pos), player.world, pos);
            if (decay > 0) {
                stack.damageItem(decay, entityLiving);
            }
            return;
        }
        // vanilla shears → vanilla behaviour (+1 per shear).
        stack.damageItem(vanillaAmount, entityLiving);
    }

    /**
     * Shear-wear batch (audit20 items 153/154): vanilla 1.12
     * {@code ItemShears.itemInteractionForEntity} (:50-78) wears the shears by
     * {@code damageItem(1, entity)} at {@code :73} when shearing any
     * IShearable entity — R196 charges the full 50 points instead
     * ({@code ItemShears:62 player.tryDamageHeldItem(DamageSource.generic, 50)},
     * a flat point count with no decay funnel: the entity face has no block
     * hardness). R196 has a sheep face only — its mooshroom/snowman carry
     * zero Shears references — so the EntitySheep gate keeps 1.12's other two
     * IShearable implementers (mooshroom/snowman) on the vanilla +1.
     *
     * <p>Handler note (javap bc 207-210, the recompiled jar): the vanilla call
     * is {@code aload_1 / iconst_1 / aload_3} — the damager argument is the
     * sheared entity (host param 3), NOT the player (host param 2).
     * Deliberately no {@code EntityPlayer} instanceof gate: the player hand is
     * the static host parameter (param 5); copying the first redirect's player
     * gate here would test the sheared sheep and be silently always-false
     * (终审 T-7 red line).</p>
     */
    @Redirect(
            method = "itemInteractionForEntity",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/item/ItemStack;damageItem(ILnet/minecraft/entity/EntityLivingBase;)V"),
            require = 1)
    private void etim$r196SheepShearWear(ItemStack stack, int vanillaAmount, EntityLivingBase shearedEntity,
            ItemStack stackParam, EntityPlayer player, EntityLivingBase entity, EnumHand hand) {
        if (!ETIMConfig.miningReform) {
            // Master switch off → vanilla behaviour (+1 per shear).
            stack.damageItem(vanillaAmount, shearedEntity);
            return;
        }
        if (stackParam.getItem() instanceof io.github.etim.etim.metal.ETIMItemShearsRusted
                && entity instanceof EntitySheep) {
            // R196 flat 50 on the sheep face (R196 ItemShears:62). The helper
            // gates creative zero-wear BEFORE issuing the face=shearing row
            // (held rides the host stack param — the creative copy — so the
            // row can never lie about the real stack); the damage target stays
            // the sheared entity exactly as the vanilla call did (same
            // damager argument → identical RNG / damager=null semantics).
            int wear = ETIMMining.getToolDecayFromShearingEntity(stackParam, player);
            if (wear > 0) {
                stack.damageItem(wear, shearedEntity);
            }
            return;
        }
        // vanilla shears / mooshroom / snowman → vanilla behaviour (+1).
        stack.damageItem(vanillaAmount, shearedEntity);
    }
}
