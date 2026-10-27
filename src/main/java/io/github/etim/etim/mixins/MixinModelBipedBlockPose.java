package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMBlocking;
import net.minecraft.client.model.ModelBiped;
import net.minecraft.client.model.ModelRenderer;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumHand;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * 客户端姿态批（第三人称手臂，D-4 收窄执行）：1.12 的 BLOCK 分支在
 * {@code ModelBiped:200-203} 给 Y 角 ∓0.5235988（±30° 内收），R196 的 use 态
 * Y 被 {@code ModelBiped.java:129-130} 显式清零（X 角两代同值，均 x*0.5−0.9424779）。
 *
 * <p>本注入只在「正在使用的物品是 ETIM 格挡载体（不含盾）」时把对应手臂的
 * rotateAngleY 清零贴 R196；盾走原版 Y 角不动（W13-B-2 硬反例保护）。</p>
 */
@Mixin(ModelBiped.class)
public abstract class MixinModelBipedBlockPose {

    @Shadow
    public ModelRenderer bipedRightArm;
    @Shadow
    public ModelRenderer bipedLeftArm;
    @Shadow
    public ModelBiped.ArmPose rightArmPose;
    @Shadow
    public ModelBiped.ArmPose leftArmPose;

    @Inject(
            method = "setRotationAngles(FFFFFFLnet/minecraft/entity/Entity;)V",
            at = @At("TAIL"),
            require = 1
    )
    private void etim$thirdPersonBlockArmY(Entity entity, float f1, float f2, float f3, float f4, float f5, float f6, CallbackInfo ci) {
        if (!ETIMConfig.blockModel) {
            return;
        }
        if (!(entity instanceof EntityLivingBase)) {
            return;
        }
        EntityLivingBase living = (EntityLivingBase) entity;
        if (!living.isHandActive() || living.getItemInUseCount() <= 0) {
            return;
        }
        // 主手载体：右手 Y 清零；副手载体（1.12 有副手 BLOCK，R196 无双持，镜像处理）
        if (this.rightArmPose == ModelBiped.ArmPose.BLOCK && this.isCarrier(living.getHeldItem(EnumHand.MAIN_HAND))) {
            this.bipedRightArm.rotateAngleY = 0.0F;    // R196 ModelBiped:129
        }
        if (this.leftArmPose == ModelBiped.ArmPose.BLOCK && this.isCarrier(living.getHeldItem(EnumHand.OFF_HAND))) {
            this.bipedLeftArm.rotateAngleY = 0.0F;     // R196 :130 同值语义（镜像手）
        }
    }

    private boolean isCarrier(ItemStack stack) {
        return ETIMBlocking.isBlockCarrier(stack);
    }
}
