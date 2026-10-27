package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMBlocking;
import net.minecraft.client.Minecraft;
import net.minecraft.client.entity.EntityPlayerSP;
import net.minecraft.client.renderer.GlStateManager;
import net.minecraft.client.renderer.ItemRenderer;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumHand;
import net.minecraft.util.EnumHandSide;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * 客户端姿态批（AD-10 越批 A-1）：R196 {@code ItemRenderer.java:355-358} 的第一人称
 * BLOCK 段。1.12 的 {@code case BLOCK}（client/renderer/ItemRenderer.java:400-402）与
 * {@code case NONE}（:392-393）调同一个 {@code transformSideFirstPerson}，故一挂
 * {@code EnumAction.BLOCK} 在第一人称零可见变化 —— 本注入补的正是这段 delta。
 *
 * <p>位次等价性：R196 在 :341 的 side translate 之后施加 BLOCK 四算子；1.12 的
 * {@code transformSideFirstPerson}（:302-306）就是那条 translate（X/Y 逐位同、Z 差 1 ULP），
 * 故 {@code @At("TAIL")} = R196 的相对原位（translate 之后、item 渲染之前）。</p>
 *
 * <p>门不含盾：盾的 {@code getItemUseAction()} 也是 BLOCK 且共用本方法，
 * 用 {@code isBlockingCarrier} 会覆盖原版盾的第一人称姿态（W13-B-2 硬反例）。</p>
 */
@Mixin(ItemRenderer.class)
public abstract class MixinItemRendererBlockPose {

    @Inject(
            method = "transformSideFirstPerson(Lnet/minecraft/util/EnumHandSide;F)V",
            at = @At("TAIL"),
            require = 1
    )
    private void etim$firstPersonBlockPose(EnumHandSide hand, float equipProgress, CallbackInfo ci) {
        if (!ETIMConfig.blockModel) {
            return;
        }
        EntityPlayerSP p = Minecraft.getMinecraft().player;
        if (p == null || !p.isHandActive() || p.getItemInUseCount() <= 0) {
            return;
        }
        ItemStack active = p.getActiveItemStack();
        if (!ETIMBlocking.isBlockCarrier(active)) {
            return;                                   // 不含盾（isBlockingCarrier 会改盾姿态）
        }
        EnumHandSide activeSide = p.getActiveHand() == EnumHand.MAIN_HAND
                ? p.getPrimaryHand()
                : p.getPrimaryHand().opposite();
        if (hand != activeSide) {
            return;                                   // 防 :438 非活动态分支误触另一只手
        }
        // B-1 迭代面（条 102.1/102.2）：delta 六量值全走 config（默认 = R196 :355-358 字面值）。
        // 1.12 的 firstperson JSON 显示变换假设未旋转未缩放基架 —— R196 :342/:350 的 rot45/scale
        // 在此链不成立（实机两轮证伪，条 102.2），故不补 pre-baseline，只在量值面补偿。
        // swing 三轴（R196 :344-349，i 镜像先例 transformFirstPerson:294-296）继续不追（B-4 登记）。
        GlStateManager.translate(ETIMConfig.blockPoseTX, ETIMConfig.blockPoseTY, 0.0F); // R196 :355
        GlStateManager.rotate(ETIMConfig.blockPoseRot1, 0.0F, 1.0F, 0.0F);   // :356
        GlStateManager.rotate(ETIMConfig.blockPoseRot2, 1.0F, 0.0F, 0.0F);   // :357
        GlStateManager.rotate(ETIMConfig.blockPoseRot3, 0.0F, 1.0F, 0.0F);   // :358
    }
}
