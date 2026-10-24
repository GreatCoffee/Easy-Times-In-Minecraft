package io.github.etim.etim.metal;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.projectile.EntityArrow;
import net.minecraft.item.ItemArrow;
import net.minecraft.item.ItemStack;
import net.minecraft.world.World;

/**
 * The rusted-iron arrow (B3 批文 §〇, user ruling 裁决 2: arrow/shears ride
 * the batch; scythe/knife defer). R196 ItemArrow:22-27 shape — the shaft is
 * wood ({@code super(par1, Material.wood, "arrows/...")}), the arrowhead
 * carries the rusted material, so the multi-material quality rule lands on
 * the LOWER rung = poor (wood fine vs rusted poor, audit20-09 §2.4 note 2).
 *
 * <p>Judged values (ItemArrow.java one-hand):</p>
 * <ul>
 *   <li>damage = 0.5 + material damage × 0.5 = 0.5 + 2.0 × 0.5 = <b>1.5</b>
 *       (:82-84 getDamage → arrowhead_material.getDamageVsEntity :74-76).</li>
 *   <li>recovery chance 0.5 (:52-53) — the R196 recovery channel is the
 *       mob-contained-item face (:65-71); 1.12's ground-pickup face has no
 *       per-item hook (C 级登记, 批文 §一挂账).</li>
 * </ul>
 */
public class ETIMItemArrowRusted extends ItemArrow {

    /** R196 ItemArrow.java:82-84 — 0.5 + rusted 2.0 × 0.5. */
    public static final double DAMAGE = 0.5D + 2.0D * 0.5D;

    public ETIMItemArrowRusted() {
        super();
        this.setCreativeTab(net.minecraft.creativetab.CreativeTabs.COMBAT); // R196 :26 tabCombat
    }

    /** The judged missile damage rides every arrow this item shoots. */
    @Override
    public EntityArrow createArrow(World worldIn, ItemStack stack, EntityLivingBase shooter) {
        EntityArrow arrow = super.createArrow(worldIn, stack, shooter);
        arrow.setDamage(DAMAGE);
        return arrow;
    }
}
