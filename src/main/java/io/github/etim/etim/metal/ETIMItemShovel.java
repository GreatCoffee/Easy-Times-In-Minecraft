package io.github.etim.etim.metal;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemSpade;
import net.minecraft.item.ItemTool;

import io.github.etim.etim.ETIMConfig;

/**
 * The ETIM metal shovel (R196 ItemShovel: 基伤 1.0 / 部件 1 / decay 破块
 * 0.5 攻击 1.0 / reach +0.75 — B2 批文 §〇 衰减全表).
 */
public class ETIMItemShovel extends ItemSpade implements ETIMMetalGear {

    protected final ETIMMetals metal;
    protected final float etimEfficiencyValue;

    public ETIMItemShovel(ETIMMetals metal) {
        this(metal, 1.0F, 1, 1.0F);
    }

    protected ETIMItemShovel(ETIMMetals metal, float baseDamage, int components, float efficiencyMult) {
        super(Item.ToolMaterial.IRON);
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
        return 100; // R196 ItemTool:280-282 (wooden handle)
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

    /** R196 ItemTool.getRepairCost :290-292 — shovel component 1 × 2 (批三修理面). */
    @Override
    public int etimRepairCost() {
        return 2;
    }

    /** R196 Material.durability 列 (批三修理面). */
    @Override
    public float etimMaterialDurability() {
        return metal.durabilityFactor;
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
