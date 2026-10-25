package io.github.etim.etim.metal;

import io.github.etim.etim.mob.ETIMEntityArrow;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.projectile.EntityArrow;
import net.minecraft.item.ItemArrow;
import net.minecraft.item.ItemStack;
import net.minecraft.world.World;

/**
 * The ETIM metal arrow (generalization of the B3 rusted arrow — 纪律 1, the
 * old ETIMItemArrowRusted class is gone, no compat layer). R196 ItemArrow:22-27
 * shape — the shaft is wood ({@code super(par1, Material.wood, "arrows/...")}),
 * the arrowhead carries the metal, so the multi-material quality rule lands on
 * the LOWER rung (wood fine vs the metal — see ETIMQuality).
 *
 * <p>Judged values (ItemArrow.java one-hand):</p>
 * <ul>
 *   <li>damage = 0.5 + material damage × 0.5 (:82-84 getDamage →
 *       arrowhead_material.getDamageVsEntity :74-76): copper/silver 2.0,
 *       ancient 2.5, mithril 3.0, adamantium 3.5, rusted 1.5.</li>
 *   <li>recovery chance 0.5 (:52-53) — the R196 recovery channel is the
 *       mob-contained-item face (:65-71); 1.12's ground-pickup face has no
 *       per-item hook (C 级登记, B3 批文 §一挂账).</li>
 *   <li>crafting difficulty as component 40.0 (Item.java:434-459) not ported
 *       (C-2, no per-recipe difficulty face).</li>
 * </ul>
 */
public class ETIMItemArrow extends ItemArrow {

	/** R196 ItemArrow.java:82-84 — 0.5 + arrowhead material damage × 0.5. */
	public static double damage(ETIMMetals metal) {
		return 0.5D + metal.damageBonus * 0.5D;
	}

	private final ETIMMetals metal;

	public ETIMItemArrow(ETIMMetals metal) {
		super();
		this.metal = metal;
		this.setCreativeTab(net.minecraft.creativetab.CreativeTabs.COMBAT); // R196 :26 tabCombat
	}

	/** The metal this arrow's head is made of (the quality face reads it). */
	public ETIMMetals etimMetal() {
		return metal;
	}

	/** The judged missile damage rides every arrow this item shoots; the exit
	 *  entity is the identity carrier (D-19/D-21 — thin subclass, not Tipped). */
	@Override
	public EntityArrow createArrow(World worldIn, ItemStack stack, EntityLivingBase shooter) {
		ETIMEntityArrow arrow = new ETIMEntityArrow(worldIn, shooter, this,
				isLauncherEnchanted(shooter)); // R196 :37 — damage = item_arrow.getDamage()
		arrow.setDamage(damage(metal)); // NE-01 in-service form (ItemArrow.java:82-84)
		return arrow;
	}

	/**
	 * B-1 — R196 samples {@code launcher_was_enchanted} at bow release
	 * (ItemBow.java:66; the bow stack {@code isItemEnchanted()}). 1.12's
	 * {@code createArrow} carries no bow reference (item/ItemArrow.java:16), so
	 * the closest same-tick sample is the shooter's held bow — sampled right
	 * here (the bow is still in hand inside onPlayerStoppedUsing), not via an
	 * EntityJoinWorldEvent one-tick-later replay (report §5.4, leaner face).
	 * Skeleton arrows take the same path (their bow is their mainhand).
	 */
	public static boolean isLauncherEnchanted(net.minecraft.entity.EntityLivingBase shooter) {
		return isEnchantedBow(shooter.getHeldItemMainhand())
				|| isEnchantedBow(shooter.getHeldItemOffhand());
	}

	private static boolean isEnchantedBow(net.minecraft.item.ItemStack stack) {
		return !stack.isEmpty()
				&& stack.getItem() instanceof net.minecraft.item.ItemBow
				&& stack.isItemEnchanted();
	}
}
