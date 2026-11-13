package io.github.etim.etim.metal;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.farm.ETIMFarm;
import io.github.etim.etim.hunger.ETIMEndurance;
import net.minecraft.block.Block;
import net.minecraft.block.SoundType;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * The ETIM metal mattock (R196 ItemMattock extends ItemShovel: 基伤 1.0
 * （shovel 基）/ 部件 4 / decay 破块 0.4（0.5×0.8）；攻击面 R196 无覆写，
 * 继承 ItemShovel.getBaseDecayRateForAttackingEntity :36-37 = 1.0F ⇒ 出口
 * 100（未装特判，经 ETIMMining ItemSpade 兜底；条 171 Ku-3 勘正——0.8 旧读
 * 系破块系数外溢）/ 效率 ×0.75 (:14-16) / reach +0.75).
 *
 * <p><b>B-40 till-on-right-click face（R196 ItemMattock:34-43 →
 * ItemHoe.tryTillSoil :45-84 严格移植，census 普查A :93）</b>：右键只认顶面
 * （R196 :39 {@code isTop()}；底面 :50 死态拒），门链＝canPlayerEdit（被锄
 * 块本身，R196 :46 格位语义）→上方块门（拒 iff 上方非空气 ∧ bounds
 * min-Y ≤ 0，R196 :54；与 MixinItemHoe 的 :86 允许臂同形）→
 * {@code grass || dirt} 才续（R196 :58-60 严格面——无 1.12 hoe 的
 * grass_path/coarse_dirt 超集，D-E2 面为 hoe 族独有）。server 成功面＝
 * playSound（1.12 ITEM_HOE_TILL 1.0/1.0——R196 tilledField step 声装饰差
 * 不移植）＋{@code damageItem(50, player)}（R196 :75；vanilla 载体＝
 * unbreaking 曲线差同 MixinItemHoe 裁）＋chargeHoe（R196 :76 饥饿）＋
 * {@code setBlockState(FARMLAND, 11)}（R196 :77）＋ETIMFarm.onTilled
 * （R196 :78-80 生育 roll＝F5 载体—— hoe 族的 roll 在 MixinItemHoe
 * RETURN-SUCCESS 内联，mattock 覆写不走 ItemHoe 故显式调）。client 成功面
 * 返回 SUCCESS（swing 自带；R196 :63-65 的 setUseButtonDelayOverride(200)
 * 为 1.12 无对应系统＝不移植）。R196 ItemShovel 无右键面——本覆写吞掉
 * 1.12 ItemSpade 的 grass-path 面＝R196 家族形状（摸底 §1）。
 *
 * <p>Family flag <b>livestockNeedsR196</b>（the nineteenth reuse，与
 * MixinItemHoe 三追加同旗）：flag off＝
 * {@code super.onItemUse(...)}＝vanilla ItemSpade 原形（path 面）。判行
 * {@code [HoeLog] mattock till pos=…}／{@code [HoeLog] mattock reject
 * face=…}／{@code [HoeLog] mattock lowblock pos=… minY=…}（farmDebugLog
 * 门，ETIMFarm.row）。Forge {@code onHoeUse} 钩不挂（R196 tryTillSoil 无此
 * 面；vanilla hoe 的钩保持原位）。</p>
 */
public class ETIMItemMattock extends ETIMItemShovel implements ETIMMetalGear {

    public ETIMItemMattock(ETIMMetals metal) {
        super(metal, 1.0F, 4, 0.75F);
    }

    /** R196 ItemTool.getRepairCost :290-292 — mattock components 4 × 2 (批三修理面; 基类 shovel 是 2). */
    @Override
    public int etimRepairCost() {
        return 8;
    }

    /**
     * B-40 — the R196 till face (ItemMattock:34-43 → ItemHoe.tryTillSoil
     * :45-84 strict). Flag off = super (the vanilla ItemSpade path face).
     */
    @Override
    public EnumActionResult onItemUse(EntityPlayer player, World world, BlockPos pos, EnumHand hand,
                                      EnumFacing facing, float hitX, float hitY, float hitZ) {
        if (!ETIMConfig.livestockNeedsR196) {
            return super.onItemUse(player, world, pos, hand, facing, hitX, hitY, hitZ); // flag off: the vanilla path face
        }
        ItemStack stack = player.getHeldItem(hand);
        if (!player.canPlayerEdit(pos, facing, stack)) { // R196 :46 — the tilled cell itself (格位语义 C 注)
            return EnumActionResult.FAIL;
        }
        if (facing == EnumFacing.DOWN) { // R196 :50 (isBottom) — dead-state reject under the :39 top gate
            ETIMFarm.row("[HoeLog] mattock reject face=down pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
            return EnumActionResult.PASS;
        }
        if (facing != EnumFacing.UP) { // R196 :39 (isTop) — the top-face-only gate; PASS = the 1.12 decline idiom
            ETIMFarm.row("[HoeLog] mattock reject face=" + facing.getName()
                    + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
            return EnumActionResult.PASS;
        }
        BlockPos up = pos.up();
        if (!world.isAirBlock(up)) { // R196 :54 — reject iff above is solid sitting on the cell floor
            IBlockState above = world.getBlockState(up);
            double minY = above.getBoundingBox(world, up).minY;
            if (minY <= 0.0D) {
                ETIMFarm.row("[HoeLog] mattock lowblock pos=" + up.getX() + "," + up.getY() + "," + up.getZ()
                        + " minY=" + minY);
                return EnumActionResult.PASS;
            }
        }
        IBlockState state = world.getBlockState(pos);
        Block block = state.getBlock();
        if (block != Blocks.GRASS && block != Blocks.DIRT) { // R196 :58-60 — strict (no D-E2 superset here)
            return EnumActionResult.PASS;
        }
        if (world.isRemote) {
            return EnumActionResult.SUCCESS; // R196 :63-65 client face (swing 自带)
        }
        SoundType sound = Blocks.FARMLAND.getSoundType();
        world.playSound(player, pos, SoundEvents.ITEM_HOE_TILL, SoundCategory.BLOCKS, 1.0F, 1.0F);
        ETIMFarm.row("[HoeLog] mattock till pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ());
        stack.damageItem(50, player); // R196 :75 (the vanilla carrier; unbreaking curve C per 摸底 §3)
        ETIMEndurance.chargeHoe(player, state.getBlockHardness(world, pos)); // R196 :76
        world.setBlockState(pos, Blocks.FARMLAND.getDefaultState(), 11); // R196 :77
        ETIMFarm.onTilled(player, world, pos); // R196 :78-80 — the F5 fertility roll carrier
        return EnumActionResult.SUCCESS;
    }

    /**
     * farm1 (B4, 条 254-257 F6, 报告 §4.5): harvest-time fertility roll for
     * the mattock family (R196 ItemMattock.onBlockDestroyed:45-60). super
     * keeps the ItemTool decay chain; the F7 matrix (root crops +
     * beetroot, D-3) lives in ETIMFarm.
     */
    @Override
    public boolean onBlockDestroyed(ItemStack stack, World world, net.minecraft.block.state.IBlockState state,
                                    net.minecraft.util.math.BlockPos pos, net.minecraft.entity.EntityLivingBase entityLiving) {
        boolean worn = super.onBlockDestroyed(stack, world, state, pos, entityLiving);
        io.github.etim.etim.farm.ETIMFarm.onCropBroken(entityLiving, stack, world, pos, state);
        return worn;
    }
}
