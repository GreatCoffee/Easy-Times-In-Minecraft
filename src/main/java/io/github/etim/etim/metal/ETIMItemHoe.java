package io.github.etim.etim.metal;

import com.google.common.collect.Multimap;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMMining;
import net.minecraft.block.material.Material;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.ai.attributes.AttributeModifier;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemHoe;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * The ETIM metal hoe (R196 ItemHoe: 基伤 1.0 / 部件 2 / decay 破块 2.0
 * 攻击 2.0 (:36-43) / 效率修正 ×0.5 / reach +0.75 / 材料面 cake/
 * craftedSnow/grass/dirt/sand/snow (:6)). vanilla 1.12's ItemHoe has NO
 * onBlockDestroyed/hitEntity overrides (zero wear) and no attack modifier
 * — both are carried here through the shared ETIMMining funnels
 * (批文 §〇 衰减全表 + §一 基伤表).
 */
public class ETIMItemHoe extends ItemHoe implements ETIMMetalGear {

    private static final Material[] HOE_MATERIALS = {
            Material.GROUND, Material.GRASS, Material.SAND, Material.SNOW, Material.CRAFTED_SNOW, Material.CAKE};

    protected final ETIMMetals metal;
    private final float totalDamage;

    public ETIMItemHoe(ETIMMetals metal) {
        super(Item.ToolMaterial.IRON);
        this.metal = metal;
        this.totalDamage = 1.0F + metal.damageBonus;
        this.setMaxDamage((int) (4.0F * 2 * metal.durabilityFactor * 100.0F));
    }

    @Override
    public final int etimGrade() {
        return metal.grade;
    }

    @Override
    public final float etimEfficiency() {
        return metal.efficiency * 0.5F; // R196 ItemHoe:16-18
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

    /** R196 ItemHoe:6 materials ∩ face at the R196 efficiency. */
    @Override
    public float getDestroySpeed(ItemStack stack, IBlockState state) {
        for (Material hoeMaterial : HOE_MATERIALS) {
            if (state.getMaterial() == hoeMaterial) {
                return etimEfficiency() * 4.0F;
            }
        }
        return 1.0F;
    }

    /** R196 hoe dig decay 2.0 through the shared funnel (ItemHoe:36-38). */
    @Override
    public boolean onBlockDestroyed(ItemStack stack, World world, IBlockState state, BlockPos pos, EntityLivingBase entityLiving) {
        if (!world.isRemote && ETIMConfig.miningReform && entityLiving instanceof EntityPlayer
                && !stack.isEmpty() && stack.getItem().isDamageable()) {
            int decay = ETIMMining.getToolDecayFromBreakingBlock((EntityPlayer) entityLiving, state, world, pos);
            if (decay > 0) {
                stack.damageItem(decay, entityLiving);
            }
        }
        return false;
    }

    /** R196 hoe attack decay 2.0 through the shared funnel (ItemHoe:41-43). */
    @Override
    public boolean hitEntity(ItemStack stack, EntityLivingBase target, EntityLivingBase attacker) {
        if (!attacker.world.isRemote && ETIMConfig.miningReform && !stack.isEmpty() && stack.getItem().isDamageable()) {
            int decay = ETIMMining.getToolDecayFromAttackingEntity(stack);
            if (decay > 0) {
                stack.damageItem(decay, attacker);
            }
        }
        return false;
    }

    /** R196 基伤 1.0 + material damage — vanilla ItemHoe puts no attack modifier. */
    @Override
    public Multimap<String, AttributeModifier> getItemAttributeModifiers(EntityEquipmentSlot slot) {
        Multimap<String, AttributeModifier> multimap = super.getItemAttributeModifiers(slot);
        if (slot == EntityEquipmentSlot.MAINHAND) {
            multimap.put(SharedMonsterAttributes.ATTACK_DAMAGE.getName(),
                    new AttributeModifier(ATTACK_DAMAGE_MODIFIER, "Tool modifier", (double) totalDamage, 0));
        }
        return multimap;
    }
}
