package io.github.etim.etim.metal;

import net.minecraft.item.ItemShears;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;

/**
 * The metal shears (metgear 批, audit20 条 212-213). R196 ItemShears extends
 * ItemTool (R196 tree), 1.12's ItemShears extends Item — so the B2 decay
 * funnel ({@code MixinItemTool}) cannot see this class: the decay hooks are
 * plain overrides below, funnelling through the SAME {@code ETIMMining}
 * channel.
 *
 * <p>Judged values (R196 ItemShears.java one-hand; the SIX metals ride
 * {@link ETIMMetals#SHEARS_METALS} = copper/silver/gold/mithril/adamantium/
 * ancient_metal — Item.java:411-416 (762-766+991) — plus the rusted body
 * from B3 批文 §〇, so the register set is seven):</p>
 * <ul>
 *   <li>components 2 → durability = (int)(4.0 × 2 × material.durability × 100)
 *       (ItemTool:36-42 + ItemShears:32-34) — per-metal: copper/silver/gold/
 *       rusted 3200 (durability 4), ancient <b>12800</b> (16), mithril
 *       <b>51200</b> (64), adamantium <b>204800</b> (256).</li>
 *   <li>effective set cloth/leaves/plants/vine/web + trip wire (:6-7);
 *       base harvest efficiency 4.0 (:17-19 — the funnel's
 *       {@code BASE_TOOL_STR} × material = copper/silver/gold 5.0, ancient
 *       6.0, mithril 7.5, adamantium 9.0, rusted 5.0); base damage 0.0
 *       (:22-24); reach +0.5 (:8).</li>
 *   <li>decay breaking 1.0 (:37-39) / attacking 2.0 (:42-44).</li>
 *   <li>quality per metal (EnumEquipmentMaterial max_quality column:
 *       copper/silver excellent, gold superb at :11, ancient masterwork,
 *       mithril/adamantium legendary, rusted poor).</li>
 *   <li>burn 100 — the wooden-handle face rides (ItemTool:280-283, 补59
 *       终审结案).</li>
 * </ul>
 */
public class ETIMItemShears extends ItemShears implements ETIMMetalGear {

    private final ETIMMetals metal;

    public ETIMItemShears(ETIMMetals metal) {
        super();
        this.metal = metal;
        this.setMaxDamage((int) (4.0F * 2 * metal.durabilityFactor * 100.0F)); // = 3200 for all seven
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
     * 批三修理面: the R196 nugget map (Item :1229-1246 对位) — true iff the
     * repair stack IS the per-metal nugget. Gates live in the container
     * takeover; config off = vanilla flow (T4①).
     */
    @Override
    public boolean getIsRepairable(ItemStack toRepair, ItemStack repair) {
        return io.github.etim.etim.ETIMConfig.metalAnvilRepair && repair.getItem() == etimRepairItem();
    }

    /** R196 Item.getRepairItem :1229-1246 对位 — the per-metal nugget map. */
    @Override
    public Item etimRepairItem() {
        return ETIMAnvilRepair.nuggetOf(metal);
    }

    /** R196 ItemTool.getRepairCost :290-292 — shears components 2 × 2 (批三修理面). */
    @Override
    public int etimRepairCost() {
        return 4;
    }

    /** R196 Material.durability 列 — the per-metal factor (metgear 批). */
    @Override
    public float etimMaterialDurability() {
        return metal.durabilityFactor;
    }

    /** The breaking-decay funnel — MixinItemTool cannot hook this class (Item, not ItemTool). */
    @Override
    public boolean onBlockDestroyed(net.minecraft.item.ItemStack stack, net.minecraft.world.World worldIn,
                                    net.minecraft.block.state.IBlockState state, net.minecraft.util.math.BlockPos pos,
                                    net.minecraft.entity.EntityLivingBase entityLiving) {
        boolean vanilla = super.onBlockDestroyed(stack, worldIn, state, pos, entityLiving);
        if (worldIn.isRemote) {
            return vanilla;
        }
        if (!io.github.etim.etim.ETIMConfig.miningReform) {
            return vanilla; // master switch off → vanilla behaviour (1 damage from super)
        }
        if (entityLiving instanceof net.minecraft.entity.player.EntityPlayer) {
            int decay = io.github.etim.etim.mining.ETIMMining.getToolDecayFromBreakingBlock(
                    (net.minecraft.entity.player.EntityPlayer) entityLiving, state, worldIn, pos);
            if (decay > 0) {
                stack.damageItem(decay, entityLiving);
            }
        }
        return vanilla;
    }

    /** The attacking-decay funnel (R196 ItemShears:42-44 base 2.0). */
    @Override
    public boolean hitEntity(net.minecraft.item.ItemStack stack, net.minecraft.entity.EntityLivingBase target,
                             net.minecraft.entity.EntityLivingBase attacker) {
        boolean vanilla = super.hitEntity(stack, target, attacker);
        if (attacker.world.isRemote) {
            return vanilla;
        }
        if (!io.github.etim.etim.ETIMConfig.miningReform) {
            return vanilla;
        }
        int decay = io.github.etim.etim.mining.ETIMMining.getToolDecayFromAttackingEntity(stack,
                attacker instanceof net.minecraft.entity.player.EntityPlayer
                        ? (net.minecraft.entity.player.EntityPlayer) attacker : null);
        if (decay > 0) {
            stack.damageItem(decay, attacker);
        }
        return vanilla;
    }
}
