package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMEndurance;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemHoe;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumActionResult;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumHand;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Endurance hoe drain (v2+ Endurance order, R196 ItemHoe:75-77 = on a
 * successful till the server charges {@code blockHardness / 2 × endurance
 * modifier}). 1.12 has no successful-till event (UseHoeEvent is the
 * pre-try cancellable hook, not the success face — 终审授权提醒), so this
 * mixin reads the onItemUse return: SUCCESS covers the R196 grass/dirt face
 * plus the 1.12 superset (grass_path, coarse_dirt — D-E2, all variants
 * charge).
 *
 * <p>The original block's hardness is captured at HEAD because the SUCCESS
 * branches have already swapped the block to farmland/dirt by the time their
 * return is reached. The drain inject sits at {@code RETURN} — every return
 * — NOT at {@code TAIL}: 1.12 {@code ItemHoe.onItemUse} returns SUCCESS via
 * early returns and its trailing RETURN is the {@code PASS} face, so a TAIL
 * hook never sees a till (judged R8, endurance-verdict: hoeDrain 恒 0 + the
 * missing stamp let the till's own PlaceEvent charge as a full-hardness
 * placement). The SUCCESS guard filters the FAIL/PASS returns. The charge
 * funnel is server-side only; the client's prediction SUCCESS is a no-op.
 * The same tick's PlaceEvent (the till wrapped in
 * ForgeHooks.onPlaceItemIntoWorld) is skipped inside
 * {@code ETIMEndurance.chargePlace} via the stamp set at the SUCCESS
 * return.</p>
 *
 * <p><b>B-40 锄地四件套追加（census 普查A :86/:87/:94）</b>：</p>
 * <ul>
 * <li><b>:94 顶面门</b> — R196 {@code ItemHoe.onItemRightClick :92} 只有
 * {@code face_hit.isTop()} 才进 {@code tryTillSoil}（其余面 false＝物品没动作）；
 * 1.12 {@code onItemUse} 的面形参即命中的面，所以 HEAD 处 {@code facing != UP}
 * 一律 {@code PASS}（1.12 decline idiom——不斩断方块交互链；R196 false 语义）。
 * 底面 {@code isBottom} 死态拒被顶面门掩蔽（R196 :50 对位）。</li>
 * <li><b>:86 上方块门</b> — R196 {@code ItemHoe.tryTillSoil :54}＝
 * 拒 iff 上方非空气 ∧ 上方块 bounds min-Y ≤ 0（允＝空气 ∨ minY&gt;0；census
 * 行文与代码相反，以代码为准——摸底 §1 勘误）。1.12 载体＝严格
 * {@code isAirBlock(pos.up())}，@Redirect 补上 minY&gt;0 允许臂。</li>
 * <li><b>:87 耐久 50</b> — R196 {@code tryTillSoil :75}＝
 * {@code tryDamageHeldItem(DamageSource.generic, 50)}（EntityPlayer:2711-2722
 * creative→null；unbreaking fraction×0.75 按点减免＋可摧毁＋curse ×2）。
 * 1.12 载体＝{@code setBlock} 的 {@code damageItem(1, player)}（vanilla
 * attemptDamageItem＝unbreaking (0.6+0.4l/(l+1)) 曲线＋destroy 面自动）——
 * 曲线差按 ETIMBlocking.java:188 先例同裁接受 vanilla 面（摸底 §3）；1.12 无
 * curse 系统＝缺席面。@Redirect 把 1 换 50，两侧 SUCCESS 分支全计（D-E2
 * 接受面）。</li>
 * </ul>
 *
 * <p>Family flag <b>livestockNeedsR196</b>（the nineteenth reuse）：flag off
 * ＝三面全走 vanilla 原形（顶面门不设／isAirBlock 严格／damageItem 1）。
 * 判行 {@code [HoeLog]}（farmDebugLog 门，ETIMFarm.row）＝
 * {@code gate face=… pos=… pass=…}／{@code till lowblock pos=… minY=…}／
 * {@code till damage=50 dur=…}。</p>
 */
@Mixin(ItemHoe.class)
public abstract class MixinItemHoe {

    private static final ThreadLocal<IBlockState> etim$captured = new ThreadLocal<IBlockState>();

    @Inject(method = "onItemUse", at = @At("HEAD"))
    private void etim$capture(EntityPlayer player, World world, BlockPos pos, EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ, CallbackInfoReturnable<EnumActionResult> cir) {
        etim$captured.set(world.getBlockState(pos));
    }

    @Inject(method = "onItemUse", at = @At("HEAD"), cancellable = true)
    private void etim$topFaceGate(EntityPlayer player, World world, BlockPos pos, EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ, CallbackInfoReturnable<EnumActionResult> cir) {
        if (!ETIMConfig.livestockNeedsR196) {
            return; // flag off: vanilla keeps its whole shape (facing != DOWN is the vanilla :59 gate)
        }
        boolean top = facing == EnumFacing.UP;
        io.github.etim.etim.farm.ETIMFarm.row("[HoeLog] gate face=" + facing.getName()
                + " pos=" + pos.getX() + "," + pos.getY() + "," + pos.getZ() + " pass=" + top);
        if (!top) {
            cir.setReturnValue(EnumActionResult.PASS); // the 1.12 decline idiom (R196 onItemRightClick false)
        }
    }

    @Inject(method = "onItemUse", at = @At("RETURN"))
    private void etim$hoeDrain(EntityPlayer player, World world, BlockPos pos, EnumHand hand, EnumFacing facing, float hitX, float hitY, float hitZ, CallbackInfoReturnable<EnumActionResult> cir) {
        IBlockState captured = etim$captured.get();
        etim$captured.remove();
        if (cir.getReturnValue() != EnumActionResult.SUCCESS || captured == null) {
            return;
        }
        ETIMEndurance.chargeHoe(player, captured.getBlockHardness(world, pos));
        // farm1 (B4, 条 254-257 D-6): the fertility tillage roll rides the SAME
        // SUCCESS face — the B-3 coarse_dirt exclusion is the FARMLAND check
        // inside ETIMFarm.onTilled (the branch that swapped in DIRT is skipped).
        io.github.etim.etim.farm.ETIMFarm.onTilled(player, world, pos);
    }

    /**
     * B-40 :86 — the R196 above-cell gate (tryTillSoil :54): the till is
     * allowed when the cell above is air OR its bounds sit above the cell
     * floor (minY &gt; 0; the R196 {@code getBlockBoundsMinY} carrier is the
     * 1.12 {@code getBoundingBox}). The vanilla strict
     * {@code isAirBlock(pos.up())} call is redirected.
     */
    @Redirect(method = "onItemUse",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/world/World;isAirBlock(Lnet/minecraft/util/math/BlockPos;)Z"))
    private boolean etim$lowBlockAllow(World world, BlockPos up) {
        if (!ETIMConfig.livestockNeedsR196) {
            return world.isAirBlock(up); // flag off: the vanilla strict air gate
        }
        if (world.isAirBlock(up)) {
            return true;
        }
        IBlockState above = world.getBlockState(up);
        double minY = above.getBoundingBox(world, up).minY;
        boolean allow = minY > 0.0D;
        if (allow) {
            io.github.etim.etim.farm.ETIMFarm.row("[HoeLog] till lowblock pos=" + up.getX() + "," + up.getY() + "," + up.getZ()
                    + " minY=" + minY);
        }
        return allow;
    }

    /**
     * B-40 :87 — the R196 till wear (tryTillSoil :75): 50 points per till
     * (vanilla setBlock damages 1). The vanilla {@code damageItem} carrier
     * keeps the unbreaking curve + destroy face (摸底 §3 C 注); the D-E2
     * superset branches (grass_path/coarse_dirt) charge too — all variants.
     */
    @Redirect(method = "setBlock",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/item/ItemStack;damageItem(ILnet/minecraft/entity/EntityLivingBase;)V"))
    private void etim$damageFifty(ItemStack stack, int amount, net.minecraft.entity.EntityLivingBase owner) {
        if (!ETIMConfig.livestockNeedsR196) {
            stack.damageItem(amount, owner); // flag off: the vanilla 1-point wear
            return;
        }
        io.github.etim.etim.farm.ETIMFarm.row("[HoeLog] till damage=50 dur="
                + (stack.getMaxDamage() - stack.getItemDamage()) + "/" + stack.getMaxDamage());
        stack.damageItem(50, owner);
    }
}
