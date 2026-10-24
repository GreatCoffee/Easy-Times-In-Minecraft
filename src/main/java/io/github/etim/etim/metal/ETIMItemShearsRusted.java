package io.github.etim.etim.metal;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMMining;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemShears;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * The rusted-iron shears (B3 批文 §〇). R196 ItemShears extends ItemTool
 * (R196 tree), 1.12's ItemShears extends Item — so the B2 decay funnel
 * ({@code MixinItemTool}) cannot see this class: the decay hooks are plain
 * overrides below, funnelling through the SAME {@code ETIMMining} channel.
 *
 * <p>Judged values (R196 ItemShears.java one-hand):</p>
 * <ul>
 *   <li>components 2 → durability = 4.0 × 2 × 4 × 100 = <b>3200</b>
 *       (:32-34 + ItemTool:40-42, 批文 §〇).</li>
 *   <li>effective set cloth/leaves/plants/vine/web + trip wire (:6-7);
 *       base harvest efficiency 4.0 (:17-19 — the funnel's
 *       {@code BASE_TOOL_STR} × material 1.25 = str 5.0); base damage 0.0
 *       (:22-24); reach +0.5 (:8).</li>
 *   <li>decay breaking 1.0 (:37-39) / attacking 2.0 (:42-44).</li>
 *   <li>quality poor (rusted material, EnumEquipmentMaterial.java:8).</li>
 *   <li>burn 100 — the wooden-handle face rides (ItemTool:280-283, 补59
 *       终审结案).</li>
 * </ul>
 */
public class ETIMItemShearsRusted extends ItemShears implements ETIMMetalGear {

    private final ETIMMetals metal = ETIMMetals.RUSTED_IRON;

    public ETIMItemShearsRusted() {
        super();
        this.setMaxDamage((int) (4.0F * 2 * metal.durabilityFactor * 100.0F)); // = 3200
        this.setCreativeTab(net.minecraft.creativetab.CreativeTabs.TOOLS);
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
        return 0.5F; // R196 ItemShears:8
    }

    @Override
    public io.github.etim.etim.quality.EnumQuality etimQuality() {
        return metal.quality;
    }

    @Override
    public int getItemEnchantability() {
        return metal.enchantability;
    }

    /** R196 ItemTool:280-283 wooden-handle burn face (补59 终审). */
    @Override
    public int getItemBurnTime(ItemStack stack) {
        return 100;
    }

    /**
     * 批三修理面: the R196 nugget map (Item :1229-1246 对位, :1237
     * rusted_iron → ironNugget) — true iff the repair stack IS the iron
     * nugget. Gates live in the container takeover; config off = vanilla
     * flow (T4①).
     */
    @Override
    public boolean getIsRepairable(ItemStack toRepair, ItemStack repair) {
        return ETIMConfig.metalAnvilRepair && repair.getItem() == etimRepairItem();
    }

    /** R196 Item.getRepairItem :1229-1246 对位 — the :1237 iron/rusted 合流 (批三修理面). */
    @Override
    public Item etimRepairItem() {
        return ETIMAnvilRepair.nuggetOf(metal);
    }

    /** R196 ItemTool.getRepairCost :290-292 — shears components 2 × 2 (批三修理面). */
    @Override
    public int etimRepairCost() {
        return 4;
    }

    /** R196 Material.durability 列 — rusted_iron 4.0 (批三修理面). */
    @Override
    public float etimMaterialDurability() {
        return metal.durabilityFactor;
    }

    /** The breaking-decay funnel — MixinItemTool cannot hook this class (Item, not ItemTool). */
    @Override
    public boolean onBlockDestroyed(ItemStack stack, World worldIn, IBlockState state, BlockPos pos,
                                    EntityLivingBase entityLiving) {
        boolean vanilla = super.onBlockDestroyed(stack, worldIn, state, pos, entityLiving);
        if (worldIn.isRemote) {
            return vanilla;
        }
        if (!ETIMConfig.miningReform) {
            return vanilla; // master switch off → vanilla behaviour (1 damage from super)
        }
        if (entityLiving instanceof EntityPlayer) {
            int decay = ETIMMining.getToolDecayFromBreakingBlock((EntityPlayer) entityLiving, state, worldIn, pos);
            if (decay > 0) {
                stack.damageItem(decay, entityLiving);
            }
        }
        return vanilla;
    }

    /** The attacking-decay funnel (R196 ItemShears:42-44 base 2.0). */
    @Override
    public boolean hitEntity(ItemStack stack, EntityLivingBase target, EntityLivingBase attacker) {
        boolean vanilla = super.hitEntity(stack, target, attacker);
        if (attacker.world.isRemote) {
            return vanilla;
        }
        if (!ETIMConfig.miningReform) {
            return vanilla;
        }
        int decay = ETIMMining.getToolDecayFromAttackingEntity(stack);
        if (decay > 0) {
            stack.damageItem(decay, attacker);
        }
        return vanilla;
    }
}
