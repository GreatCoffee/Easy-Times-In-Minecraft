package io.github.etim.etim.metal;

import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemTool;

import java.util.Collections;

/**
 * R196 {@code ItemCudgel} (ItemCudgel.java:3-49) — the wooden cudgel.
 *
 * <p>Only the wood row exists in R196 (Item.java:418); the class rides the
 * 1.12 {@link ItemTool} tree so the mining rework sees it as a tool, while
 * the R196 numbers are read directly through {@link ETIMMetalGear}: grade 0
 * (wood), harvest efficiency 2.0, base damage 1.0, reach +0.25, durability
 * 4.0 × 1 × 0.5 × 100 = 200, enchantability 10, decay 0.25 on both faces.
 * The effective-material set is cake/coral/glass/ice/pumpkin
 * (ItemCudgel.java:6); 1.12 has the {@code CORAL} material constant even
 * though no coral block uses it — the dead row is kept for parity.</p>
 *
 * <p>This is not a metal item despite the package: the package is the
 * shared R196 gear contract home (the interface is named for its first
 * users). {@code ETIMToolDurability} skips every {@link ETIMMetalGear}
 * instance, so the constructor-judged 200/400 survives the init pass.</p>
 */
public class ETIMItemCudgel extends ItemTool implements ETIMMetalGear {

    private final String toolClass;
    private final float baseDamage;
    private final int components;
    private final float reachBonus;

    public ETIMItemCudgel() {
        this("cudgel", 1.0F, 1, 0.25F);
    }

    protected ETIMItemCudgel(String toolClass, float baseDamage, int components, float reachBonus) {
        super(baseDamage, 0.0F, Item.ToolMaterial.WOOD, Collections.emptySet());
        this.toolClass = toolClass;
        this.baseDamage = baseDamage;
        this.components = components;
        this.reachBonus = reachBonus;
        // R196 ItemTool:40-42 durability formula (EnumEquipmentMaterial.wood
        // durability 0.5, components 1/2 → 200/400).
        this.setMaxDamage((int) (4.0F * components * 0.5F * 100.0F));
        this.setCreativeTab(CreativeTabs.COMBAT); // R196 ItemCudgel:8 tabCombat
        this.setHarvestLevel(toolClass, 0);       // wood grade; the ETIM gate reads etimGrade()
    }

    /** R196 ItemCudgel.getToolType (cudgel/club). */
    public String etimToolClass() {
        return toolClass;
    }

    @Override
    public final int etimGrade() {
        return 0; // Material.wood min_harvest_level 0 (ItemTool:62-66)
    }

    @Override
    public final float etimEfficiency() {
        return 2.0F; // R196 getMultipliedHarvestEfficiency = 2.0 × wood 1.0
    }

    @Override
    public final float etimAttackDamage() {
        return baseDamage; // wood material damage 0.0 (Material:433-435)
    }

    @Override
    public final float etimReachBonus() {
        return reachBonus;
    }

    @Override
    public io.github.etim.etim.quality.EnumQuality etimQuality() {
        return io.github.etim.etim.quality.EnumQuality.FINE; // EnumEquipmentMaterial.wood :5
    }

    @Override
    public int getItemEnchantability() {
        return 10; // EnumEquipmentMaterial.wood :5
    }

    /** R196 ItemTool:280-282 wooden-handle burn face. */
    @Override
    public int getItemBurnTime(ItemStack stack) {
        return 100;
    }

    /**
     * R196 {@code Item.getRepairItem} :1229-1246 has no wood row → no
     * consumable repair face; the anvil's same-item combination path is the
     * vanilla 1.12 behaviour and is left to the container.
     */
    @Override
    public boolean getIsRepairable(ItemStack toRepair, ItemStack repair) {
        return false;
    }

    @Override
    public Item etimRepairItem() {
        return null;
    }

    /** R196 ItemTool.getRepairCost :290-292 — components × 2. */
    @Override
    public int etimRepairCost() {
        return components * 2;
    }

    @Override
    public float etimMaterialDurability() {
        return 0.5F; // EnumEquipmentMaterial.wood :5
    }
}
