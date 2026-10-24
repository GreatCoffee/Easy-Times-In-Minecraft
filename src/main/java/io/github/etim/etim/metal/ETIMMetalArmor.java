package io.github.etim.etim.metal;

import com.google.common.collect.Multimap;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.attributes.AttributeModifier;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemArmor;
import net.minecraft.item.ItemStack;

import io.github.etim.etim.ETIMConfig;

import java.util.UUID;

/**
 * One ETIM metal armor piece (R196 ItemArmor 四件 + 链变体, 批文 §二.1):
 *
 * <ul>
 *   <li>durability = components × durabilityFactor × (non-chain ×2.0) —
 *       NO ×100 (R196 ItemArmor:36-43); anchors copper helmet 40,
 *       mithril cuirass 1,024, copper chain helmet 20.</li>
 *   <li>armor points = components × (material points − chain 2) ÷ 24, an
 *       exact float — vanilla's {@code damageReduceAmount} is {@code
 *       public final int}, so the ARMOR modifier is re-put here through
 *       {@code getItemAttributeModifiers} (批文 §二.1 甲点接线注记); the
 *       UUIDs are the vanilla ItemArmor:37 constants (private in vanilla
 *       → same values carried locally). Full-set sums land on whole
 *       numbers 7.0/9.0/10.0 (chain 5.0/7.0/8.0) — the armor-bar face.</li>
 *   <li>the IRON ArmorMaterial is a texture/sound placeholder (C-7 口径);
 *       the vanilla anvil-repair face is refused (R196 repairs via
 *       skillsets, C 级登记).</li>
 * </ul>
 */
public class ETIMMetalArmor extends ItemArmor implements ETIMMetalGear {

    /** R196 armor-piece component counts by EntityEquipmentSlot index (FEET, LEGS, CHEST, HEAD). */
    private static final int[] COMPONENTS = {4, 7, 8, 5};

    /** The vanilla ItemArmor:37 ARMOR_MODIFIERS UUIDs (private in vanilla — same values). */
    private static final UUID[] ARMOR_SLOT_MODIFIERS = {
            UUID.fromString("845DB27C-C624-495F-8C9F-6020A9A58B6B"),
            UUID.fromString("D8499B04-0E66-4726-AB29-64469D734E0D"),
            UUID.fromString("9F3D476D-C118-4544-8365-64846904B48E"),
            UUID.fromString("2AD3F246-FEE1-4E67-B886-69FD380BB150")};

    /** The ETIM chain-mail variant flag (R196 is_chain_mail constructor face). */
    public final boolean isChain;

    private final ETIMMetals metal;
    /** Exact R196 armor points for THIS piece (components × points ÷ 24). */
    private final double armorPoints;

    public ETIMMetalArmor(ETIMMetals metal, EntityEquipmentSlot slot, boolean chain) {
        super(ArmorMaterial.IRON, 0, slot);
        this.metal = metal;
        this.isChain = chain;
        int components = COMPONENTS[slot.getIndex()];
        this.setMaxDamage((int) (components * metal.durabilityFactor * (chain ? 1.0F : 2.0F)));
        this.armorPoints = (double) (components * (metal.armorPoints - (chain ? 2 : 0))) / 24.0D;
    }

    @Override
    public final int etimGrade() {
        return metal.grade;
    }

    @Override
    public final float etimEfficiency() {
        return metal.efficiency;
    }

    @Override
    public final float etimAttackDamage() {
        return 0.0F;
    }

    @Override
    public float etimReachBonus() {
        return 0.75F;
    }

    @Override
    public io.github.etim.etim.quality.EnumQuality etimQuality() {
        return metal.quality;
    }

    @Override
    public int getItemEnchantability() {
        return metal.enchantability;
    }

    /**
     * 批三修理面: the R196 nugget map (Item :1229-1246 对位) — true iff the
     * repair stack IS this piece's mapped nugget. Gates live in the
     * container takeover; config off = vanilla flow (T4①).
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

    /** R196 ItemArmor.getRepairCost :342-348 — components × 2, chain halved (批三修理面). */
    @Override
    public int etimRepairCost() {
        int components = COMPONENTS[armorType.getIndex()];
        return isChain ? components : components * 2;
    }

    /** R196 Material.durability 列 (批三修理面). */
    @Override
    public float etimMaterialDurability() {
        return metal.durabilityFactor;
    }

    /** Exact-float armor modifier over the vanilla int face (批文 §二.1). */
    @Override
    public Multimap<String, AttributeModifier> getItemAttributeModifiers(EntityEquipmentSlot slot) {
        Multimap<String, AttributeModifier> multimap = super.getItemAttributeModifiers(slot);
        if (slot == this.armorType) {
            multimap.removeAll(SharedMonsterAttributes.ARMOR.getName());
            multimap.put(SharedMonsterAttributes.ARMOR.getName(),
                    new AttributeModifier(ARMOR_SLOT_MODIFIERS[slot.getIndex()], "Armor modifier", armorPoints, 0));
        }
        return multimap;
    }

    /** The exact R196 armor points of this piece (the [EquipLog] armor= column). */
    public double etimArmorPoints() {
        return armorPoints;
    }
}
