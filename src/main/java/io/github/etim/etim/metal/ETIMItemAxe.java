package io.github.etim.etim.metal;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemTool;

import io.github.etim.etim.ETIMConfig;

/**
 * The ETIM metal axe (R196 ItemAxe: 基伤 3.0 / 部件 3 / decay 破块 1.0
 * （砂岩 1.875）攻击 1.0 / 效率砂岩 ×0.5 (:19) / reach +0.75). The
 * sandstone branch is first-hand ItemAxe.java:19 (efficiency) and :34
 * (decay — the decay face rides the ETIMMining funnel).
 */
public class ETIMItemAxe extends net.minecraft.item.ItemAxe implements ETIMMetalGear {

    protected final ETIMMetals metal;
    protected final float etimEfficiencyValue;

    public ETIMItemAxe(ETIMMetals metal) {
        this(metal, 3.0F, 3, 1.0F);
    }

    protected ETIMItemAxe(ETIMMetals metal, float baseDamage, int components, float efficiencyMult) {
        // (damage, speed) placeholder pair — the R196 damage/efficiency ride
        // the assignments below; the vanilla speed stays the axe default.
        super(Item.ToolMaterial.IRON, baseDamage, -3.0F);
        this.metal = metal;
        this.etimEfficiencyValue = metal.efficiency * efficiencyMult;
        // R196 ItemTool:36-52 (批文 §一), same shape as the pickaxe.
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
        return 0.75F; // R196 ItemTool:28
    }

    @Override
    public io.github.etim.etim.quality.EnumQuality etimQuality() {
        return metal.quality;
    }

    @Override
    public int getItemEnchantability() {
        return metal.enchantability;
    }

    @Override
    public int getItemBurnTime(ItemStack stack) {
        return 100; // R196 ItemTool:280-282
    }

    /**
     * 批三修理面: the R196 nugget map (Item :1229-1246 对位) — true iff the
     * repair stack IS this item's mapped nugget. Gates live in the container
     * takeover (ETIMAnvilRepair.plan); config off = vanilla flow (T4①).
     */
    @Override
    public boolean getIsRepairable(ItemStack toRepair, ItemStack repair) {
        return ETIMConfig.metalAnvilRepair && repair.getItem() == etimRepairItem();
    }

    /** R196 Item.getRepairItem :1229-1246 对位 (批三修理面). */
    @Override
    public Item etimRepairItem() {
        return ETIMAnvilRepair.nuggetOf(metal);
    }

    /** R196 ItemTool.getRepairCost :290-292 — axe components 3 × 2 (批三修理面). */
    @Override
    public int etimRepairCost() {
        return 6;
    }

    /** R196 Material.durability 列 (批三修理面). */
    @Override
    public float etimMaterialDurability() {
        return metal.durabilityFactor;
    }

    /** R196 ItemAxe:19 — sandstone digs at half harvest efficiency. */
    @Override
    public float getDestroySpeed(ItemStack stack, net.minecraft.block.state.IBlockState state) {
        float speed = super.getDestroySpeed(stack, state);
        if (state.getBlock() == Blocks.SANDSTONE || state.getBlock() == Blocks.RED_SANDSTONE) {
            speed *= 0.5F;
        }
        return speed;
    }

    @Override
    public boolean canHarvestBlock(net.minecraft.block.state.IBlockState state, ItemStack stack) {
        String required = state.getBlock().getHarvestTool(state);
        if (required == null) {
            return super.canHarvestBlock(state, stack);
        }
        return getToolClasses(stack).contains(required) && etimGrade() >= state.getBlock().getHarvestLevel(state);
    }

    @Override
    public int getHarvestLevel(ItemStack stack, String toolClass, EntityPlayer player,
                               net.minecraft.block.state.IBlockState state) {
        if (getToolClasses(stack).contains(toolClass)) {
            return etimGrade();
        }
        return super.getHarvestLevel(stack, toolClass, player, state);
    }
}
