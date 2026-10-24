package io.github.etim.etim.metal;

import com.google.common.collect.Multimap;

import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.attributes.AttributeModifier;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemSword;
import net.minecraft.item.ItemStack;

/**
 * The flint knife (R196 ItemKnife(767, Material.flint) extends ItemDagger —
 * the ONLY live knife crafting chain, A-1 定谳：metal knives are dead data
 * shadowed by the dagger rows). T1=① user ruling, 2026-10-24.
 *
 * <p>Judged values (ItemKnife.java / ItemDagger.java / Material.java one-hand,
 * 批文 §一):</p>
 *
 * <ul>
 *   <li>base damage = dagger base 2.0 − 1.0 = 1.0 (ItemKnife:16-18);
 *       + Material.flint damage 1.0 (Material.java:437) → total <b>2.0</b>.</li>
 *   <li>components 1 (承 dagger, ItemDagger:25-27) × flint durability factor
 *       1.0 (EnumEquipmentMaterial.flint :6) → maxDamage 400.</li>
 *   <li>reach +0.25 (ItemKnife:6); attack decay 0.5 (no override — the sword
 *       chain); breaking decay cloth/plants/vine 0.5 else 1.0 (the dagger
 *       2.0 base ÷4 / ÷2, ItemKnife:21-25) — the decay rides MixinItemSword
 *       (this class extends ItemSword) into the ETIMMining chains.</li>
 *   <li>grade 1 (Material.flint min 2, rocky non-metal → 2−1, R196
 *       ItemTool:62-66); quality FINE (EnumEquipmentMaterial.flint :6);
 *       enchantability 0 (same row, second field); burn 100 (wooden handle,
 *       ItemKnife has no hasWoodenHandle override); reach-tab TOOLS rides the
 *       1.12 ItemSword ctor.</li>
 * </ul>
 */
public class ETIMItemKnifeFlint extends ItemSword implements ETIMMetalGear {

	/** R196 ItemKnife:16-18 + Material.java:437 — 1.0 + 1.0. */
	public static final float TOTAL_DAMAGE = 2.0F;

	public ETIMItemKnifeFlint() {
		super(Item.ToolMaterial.IRON);
		this.setMaxDamage((int) (4.0F * 1 * 1.0F * 100.0F)); // = 400
	}

	@Override
	public final int etimGrade() {
		return 1; // Material.flint min 2, rocky non-metal → 2−1 (R196 ItemTool:62-66)
	}

	@Override
	public final float etimEfficiency() {
		return 1.25F * 0.5F; // flint material efficiency (ItemTool:73-75) × sword 0.5 (ItemSword:18-19)
	}

	@Override
	public final float etimAttackDamage() {
		return TOTAL_DAMAGE;
	}

	@Override
	public float etimReachBonus() {
		return 0.25F; // R196 ItemKnife:6
	}

	@Override
	public io.github.etim.etim.quality.EnumQuality etimQuality() {
		return io.github.etim.etim.quality.EnumQuality.FINE; // EnumEquipmentMaterial.flint :6
	}

	@Override
	public int getItemEnchantability() {
		return 0; // EnumEquipmentMaterial.flint :6 second field
	}

	/** R196 ItemTool:280-282 wooden-handle burn face (ItemKnife never opts out). */
	@Override
	public int getItemBurnTime(ItemStack stack) {
		return 100;
	}

	/** R196 repairs via skillsets — no vanilla anvil face (C 级登记). */
	@Override
	public boolean getIsRepairable(ItemStack toRepair, ItemStack repair) {
		return false;
	}

	/** Re-put the vanilla attack modifier with the R196 total (ETIMItemSword mirror). */
	@Override
	public Multimap<String, AttributeModifier> getItemAttributeModifiers(EntityEquipmentSlot slot) {
		Multimap<String, AttributeModifier> multimap = super.getItemAttributeModifiers(slot);
		if (slot == EntityEquipmentSlot.MAINHAND) {
			multimap.removeAll(SharedMonsterAttributes.ATTACK_DAMAGE.getName());
			multimap.put(SharedMonsterAttributes.ATTACK_DAMAGE.getName(),
					new AttributeModifier(ATTACK_DAMAGE_MODIFIER, "Weapon modifier", (double) TOTAL_DAMAGE, 0));
		}
		return multimap;
	}
}
