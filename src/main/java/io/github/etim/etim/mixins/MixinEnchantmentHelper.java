package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMEnchantPool;

import net.minecraft.enchantment.EnchantmentData;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.item.ItemStack;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.List;

/**
 * Batch six D-1 pool (audit20 条 274-277 / 条 278): the R196 pool machinery
 * replaces the vanilla {@code buildEnchantmentList} WHOLE (终审 getEnchantmentDatas
 * 全树唯一调用点 = build HEAD cancel 后死码; 任务书 (i) 钉) — the nine-step
 * assembly/altered/carrier/weights/conflict faces live in
 * {@link ETIMEnchantPool}.
 *
 * <p>The {@code addRandomEnchantment} argument redirect pays R196 :201's
 * enchantability-alteration step that 1.12 lacks (A-5/B-16): the table path
 * already ran {@code altered} before the budget left
 * {@code MixinContainerEnchantment}, so the redirect must NOT feed the table
 * through {@code addRandomEnchantment} — vanilla build callers
 * (equip spawn / villager trade) pay it here.</p>
 */
@Mixin(EnchantmentHelper.class)
public abstract class MixinEnchantmentHelper {

    @Inject(method = "buildEnchantmentList", at = @At("HEAD"), cancellable = true)
    private static void etim$r196PoolBuild(java.util.Random random, ItemStack stack, int level, boolean allowTreasure,
                                           CallbackInfoReturnable<List<EnchantmentData>> cir) {
        if (!ETIMConfig.enchantPoolR196) {
            return;
        }
        List<EnchantmentData> list = ETIMEnchantPool.build(random, stack, level);
        if (list != null && list.isEmpty()) {
            list = null; // pool contract: empty = the R196 null face (callers no-op)
        }
        cir.setReturnValue(list);
    }

    @Redirect(
            method = "addRandomEnchantment",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/enchantment/EnchantmentHelper;buildEnchantmentList(Ljava/util/Random;Lnet/minecraft/item/ItemStack;IZ)Ljava/util/List;")
    )
    private static List<EnchantmentData> etim$r196AlterNonTable(java.util.Random random, ItemStack stack, int level, boolean allowTreasure) {
        if (ETIMConfig.enchantPoolR196) {
            level = ETIMEnchantPool.altered(level, stack.getItem()); // R196 :201 (1.12 无此步 — B-16)
        }
        List<EnchantmentData> list = EnchantmentHelper.buildEnchantmentList(random, stack, level, allowTreasure);
        return list == null ? java.util.Collections.<EnchantmentData>emptyList() : list; // R196 :202-204 no-op face
    }
}
