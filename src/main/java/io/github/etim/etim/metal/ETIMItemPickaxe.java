package io.github.etim.etim.metal;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.Item;
import net.minecraft.item.ItemPickaxe;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemTool;

/**
 * The ETIM metal pickaxe (R196 ItemPickaxe: 基伤 2.0 / 部件 3 / decay 破块
 * 1.0 攻击 1.0 / reach +0.75 — B2 批文 §〇 衰减全表). Vanilla 1.12's
 * ItemTool face keeps working untouched: the {@code
 * MixinItemTool} redirects route the MITE decay chain, and the numbers
 * below are per-instance constructor overrides (ToolMaterial is an enum —
 * 批文 §二.1, never instantiate per metal).
 */
public class ETIMItemPickaxe extends ItemPickaxe implements ETIMMetalGear {

    /** The R196 material of this instance. */
    protected final ETIMMetals metal;
    /** R196 material efficiency × per-type multiplier. */
    protected final float etimEfficiencyValue;

    public ETIMItemPickaxe(ETIMMetals metal) {
        this(metal, 2.0F, 3, 1.0F);
    }

    protected ETIMItemPickaxe(ETIMMetals metal, float baseDamage, int components, float efficiencyMult) {
        super(Item.ToolMaterial.IRON);
        this.metal = metal;
        this.etimEfficiencyValue = metal.efficiency * efficiencyMult;
        // R196 ItemTool:36-52 (批文 §一): durability = 4.0 × components ×
        // factor × 100; efficiency = materialEff × typeMult; damage = base + material.
        this.setMaxDamage((int) (4.0F * components * metal.durabilityFactor * 100.0F));
        this.efficiency = etimEfficiencyValue;
        this.attackDamage = baseDamage + metal.damageBonus;
    }

    @Override
    public final int etimGrade() {
        return metal.grade;
    }

    @Override
    public final float etimEfficiency() {
        return etimEfficiencyValue;
    }

    @Override
    public final float etimAttackDamage() {
        return attackDamage;
    }

    @Override
    public float etimReachBonus() {
        return 0.75F; // R196 ItemTool:28 setReachBonus(0.75F)
    }

    @Override
    public int getItemEnchantability() {
        return metal.enchantability;
    }

    /** R196 ItemTool.getBurnTime:100 — the wooden handle rides every metal tool. */
    @Override
    public int getItemBurnTime(ItemStack stack) {
        return 100;
    }

    /** R196 repairs via skillsets — no vanilla anvil face (C 级登记). */
    @Override
    public boolean getIsRepairable(ItemStack toRepair, ItemStack repair) {
        return false;
    }

    /** Drop gate with the direct-read grade (G-FB-12 绕 fold). */
    @Override
    public boolean canHarvestBlock(net.minecraft.block.state.IBlockState state, ItemStack stack) {
        String required = state.getBlock().getHarvestTool(state);
        if (required == null) {
            return super.canHarvestBlock(state, stack);
        }
        return getToolClasses(stack).contains(required) && etimGrade() >= state.getBlock().getHarvestLevel(state);
    }

    /** Forge harvest-level face: direct-read grade for the own tool class. */
    @Override
    public int getHarvestLevel(ItemStack stack, String toolClass, EntityPlayer player,
                               net.minecraft.block.state.IBlockState state) {
        if (getToolClasses(stack).contains(toolClass)) {
            return etimGrade();
        }
        return super.getHarvestLevel(stack, toolClass, player, state);
    }
}
