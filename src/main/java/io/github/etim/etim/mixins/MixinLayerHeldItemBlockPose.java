package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMBlocking;
import net.minecraft.client.renderer.entity.layers.LayerHeldItem;
import net.minecraft.client.renderer.GlStateManager;
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
 * 客户端姿态批（第三人称手持物，D-3 重开案 c）：R196 {@code RenderPlayer.java:253-258}
 * 在 isFull3D 门内、共享尾变换之前给 BLOCK 四算子；1.12 的
 * {@code LayerHeldItem.renderHeldItem:47-66} 无 BLOCK 分支。注入点选
 * {@code renderItemSide} 调用点之前 = 与 R196「BLOCK 算子在前、尾变换在后」相对序一致。
 *
 * <p>门：玩家 + 使用态 + BLOCK + isBlockCarrier（不含盾）+ 该手是活动手。
 * 盾的第三人称手持物不受影响（W13-B-2 保护）。</p>
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
    private void etim$thirdPersonBlockHeldItem(EntityLivingBase entity, ItemStack stack, Object transformType,
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
        GlStateManager.translate(0.05F, 0.0F, -0.1F);      // R196 RenderPlayer:254
        GlStateManager.rotate(-50.0F, 0.0F, 1.0F, 0.0F);   // :255
        GlStateManager.rotate(-10.0F, 1.0F, 0.0F, 0.0F);   // :256
        GlStateManager.rotate(-60.0F, 0.0F, 0.0F, 1.0F);   // :257
    }
}
