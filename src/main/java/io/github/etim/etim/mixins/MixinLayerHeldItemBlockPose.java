package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMBlocking;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.entity.layers.LayerHeldItem;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumHand;
import net.minecraft.util.EnumHandSide;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * 客户端姿态批（第三人称手持物）：R196 {@code RenderPlayer.java:253-258} 的 BLOCK 四算子，
 * 1.12 {@code LayerHeldItem.renderHeldItem} 无对应分支。注入在 {@code renderItemSide} 之前
 * （与 R196「BLOCK 算子在前、共享尾变换在后」相对序一致）。
 *
 * <p>参数全走 config：{@code tpItemTX/TY/TZ}（方块单位）与 {@code tpItemRot1/2/3}（度，
 * 轴序 Y/X/Z，同 R196 :255-257）。门 = 玩家 + 使用态 + isBlockCarrier（不含盾）+ 活动手。</p>
 */
@Mixin(LayerHeldItem.class)
public abstract class MixinLayerHeldItemBlockPose {

    @Inject(
            method = "renderHeldItem",
            at = @At(
                    value = "INVOKE",
                    target = "Lnet/minecraft/client/renderer/ItemRenderer;renderItemSide" +
                            "(Lnet/minecraft/entity/EntityLivingBase;Lnet/minecraft/item/ItemStack;" +
                            "Lnet/minecraft/client/renderer/block/model/ItemCameraTransforms$TransformType;Z)V"
            ),
            require = 1
    )
    private void etim$thirdPersonBlockItem(EntityLivingBase entity, ItemStack stack, Object transformType,
                                           EnumHandSide handSide, CallbackInfo ci) {
        if (!ETIMConfig.blockModel) {
            return;
        }
        if (!(entity instanceof EntityPlayer)) {
            return;
        }
        EntityPlayer p = (EntityPlayer) entity;
        if (!p.isHandActive() || p.getItemInUseCount() <= 0) {
            return;
        }
        if (!ETIMBlocking.isBlockCarrier(stack)) {
            return;
        }
        EnumHandSide activeSide = p.getActiveHand() == EnumHand.MAIN_HAND
                ? p.getPrimaryHand()
                : p.getPrimaryHand().opposite();
        if (handSide != activeSide) {
            return;
        }
        GlStateManager.translate(ETIMConfig.tpItemTX, ETIMConfig.tpItemTY, ETIMConfig.tpItemTZ);
        GlStateManager.rotate(ETIMConfig.tpItemRot1, 0.0F, 1.0F, 0.0F);
        GlStateManager.rotate(ETIMConfig.tpItemRot2, 1.0F, 0.0F, 0.0F);
        GlStateManager.rotate(ETIMConfig.tpItemRot3, 0.0F, 0.0F, 1.0F);
    }
}
