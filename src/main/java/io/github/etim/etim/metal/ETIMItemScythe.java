package io.github.etim.etim.metal;

import net.minecraft.block.Block;
import net.minecraft.block.BlockCrops;
import net.minecraft.block.BlockTallGrass;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemTool;

import com.google.common.collect.Sets;

import io.github.etim.etim.ETIMConfig;

/**
 * The ETIM metal scythe (R196 ItemScythe extends ItemTool, 一手
 * ItemScythe.java). Judged values:
 *
 * <ul>
 *   <li>base damage 1.0 (:16-18); components 2 (:21-23) → durability =
 *       4.0 × 2 × factor × 100 (ItemTool:40-42, A-3 真值).</li>
 *   <li>reach +1.0 (:7); effective set tallGrass + crops (:6) → the 1.12
 *       Blocks.TALLGRASS + BlockCrops family (对照 B-1).</li>
 *   <li>decay breaking: grass/crops 0.5 else 2.0 (:26-28); attacking 4.0
 *       (:31-37 — the sharpness/vampiric branches are dead, ETIM lacks both
 *       enchants, C-4).</li>
 *   <li>efficiency: no R196 base override → the ItemTool default 4.0 base
 *       = the ×1.0 correction (R196 ItemTool:44-46, 终审 补-2) — same as the
 *       pickaxe band.</li>
 *   <li>fertility re-fertilize face (:40-53) not ported (C-3, no fertility
 *       enchant); getSimilarClasses (:56-58) not ported (C 级, 终审 补-1).</li>
 * </ul>
 */
public class ETIMItemScythe extends ItemTool implements ETIMMetalGear {

	/** R196 ItemScythe:6 addBlocksEffectiveAgainst — the 1.12 mapping (B-1). */
	private static final java.util.Set<Block> EFFECTIVE = Sets.newHashSet(
			net.minecraft.init.Blocks.TALLGRASS,
			net.minecraft.init.Blocks.WHEAT,
			net.minecraft.init.Blocks.CARROTS,
			net.minecraft.init.Blocks.POTATOES,
			net.minecraft.init.Blocks.BEETROOTS);

	/** The R196 material of this instance. */
	private final ETIMMetals metal;

	public ETIMItemScythe(ETIMMetals metal) {
		// 1.12 has no scythe class in the toolClass switch (RFG ItemTool:38-48)
		// → toolClass stays null; the class hangs off setHarvestLevel below.
		super(Item.ToolMaterial.IRON, EFFECTIVE);
		this.metal = metal;
		// R196 ItemTool:36-52 formulas (A-3 真值 factor 表): durability =
		// 4.0 × components 2 × factor × 100; damage = base 1.0 + material.
		this.setMaxDamage((int) (4.0F * 2 * metal.durabilityFactor * 100.0F));
		this.efficiency = metal.efficiency; // correction ×1.0 (R196 ItemTool:44-46)
		this.attackDamage = 1.0F + metal.damageBonus;
		this.setHarvestLevel("scythe", metal.grade);
	}

	@Override
	public final int etimGrade() {
		return metal.grade;
	}

	@Override
	public final float etimEfficiency() {
		return metal.efficiency; // ×1.0 correction — the ItemTool default band
	}

	@Override
	public final float etimAttackDamage() {
		return attackDamage;
	}

	@Override
	public float etimReachBonus() {
		return 1.0F; // R196 ItemScythe:7
	}

	@Override
	public io.github.etim.etim.quality.EnumQuality etimQuality() {
		return metal.quality;
	}

	@Override
	public int getItemEnchantability() {
		return metal.enchantability;
	}

	/** R196 ItemTool:280-282 — the wooden handle rides every metal tool. */
	@Override
	public int getItemBurnTime(ItemStack stack) {
		return 100;
	}

	/**
	 * 批三修理面: the R196 nugget map (Item :1229-1246 对位) — true iff the
	 * repair stack IS this item's mapped nugget (rusted iron rides :1237).
	 * The anvil-metal/quality gates live in the container takeover
	 * (ETIMAnvilRepair.plan); config off = the vanilla flow untouched (T4①).
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

	/** R196 ItemTool.getRepairCost :290-292 — components 2 × 2 (批三修理面). */
	@Override
	public int etimRepairCost() {
		return 4;
	}

	/** R196 Material.durability 列 (EnumEquipmentMaterial 对位; 批三修理面). */
	@Override
	public float etimMaterialDurability() {
		return metal.durabilityFactor;
	}

	/** Drop gate with the direct-read grade (G-FB-12 绕 fold, pickaxe mirror). */
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

	/** The scythe effective-block test for the ETIMMining gate (B-4/B-8 face). */
	public static boolean isScytheBlock(net.minecraft.block.state.IBlockState state) {
		Block block = state.getBlock();
		return block instanceof BlockTallGrass || block instanceof BlockCrops;
	}
}
