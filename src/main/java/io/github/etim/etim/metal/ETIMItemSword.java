package io.github.etim.etim.metal;

import com.google.common.collect.Multimap;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.attributes.AttributeModifier;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.item.ItemSword;

/**
 * The ETIM metal sword (R196 ItemSword: 基伤 4.0 / 部件 2 / decay 破块 2.0
 * 攻击 0.5 — the decay face rides the MixinItemSword redirect / reach
 * +0.75). vanilla 1.12's ItemSword.attackDamage is {@code private final}
 * — the attack modifier is re-put with the R196 total (B2 批文 §二.1).
 */
public class ETIMItemSword extends ItemSword implements ETIMMetalGear {

    protected final ETIMMetals metal;
    /** R196 getCombinedDamageVsEntity = base + material damage. */
    private final float totalDamage;

    public ETIMItemSword(ETIMMetals metal) {
        this(metal, 4.0F, 2);
    }

    protected ETIMItemSword(ETIMMetals metal, float baseDamage, int components) {
        super(Item.ToolMaterial.IRON);
        this.metal = metal;
        this.totalDamage = baseDamage + metal.damageBonus;
        // R196 ItemTool:40-42 durability formula (×100, components 2).
        this.setMaxDamage((int) (4.0F * components * metal.durabilityFactor * 100.0F));
    }

    @Override
    public final int etimGrade() {
        return metal.grade;
    }

    @Override
    public final float etimEfficiency() {
        return metal.efficiency * 0.5F; // R196 ItemSword:18-20 getBaseHarvestEfficiency = 2.0F = the 4.0 base's ×0.5 (判值修正 C)
    }

    @Override
    public final float etimAttackDamage() {
        return totalDamage;
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

    @Override
    public boolean getIsRepairable(ItemStack toRepair, ItemStack repair) {
        return false;
    }

    /** Re-put the vanilla attack modifier with the R196 total damage. */
    @Override
    public Multimap<String, AttributeModifier> getItemAttributeModifiers(EntityEquipmentSlot slot) {
        Multimap<String, AttributeModifier> multimap = super.getItemAttributeModifiers(slot);
        if (slot == EntityEquipmentSlot.MAINHAND) {
            multimap.removeAll(SharedMonsterAttributes.ATTACK_DAMAGE.getName());
            multimap.put(SharedMonsterAttributes.ATTACK_DAMAGE.getName(),
                    new AttributeModifier(ATTACK_DAMAGE_MODIFIER, "Weapon modifier", (double) totalDamage, 0));
        }
        return multimap;
    }
}
