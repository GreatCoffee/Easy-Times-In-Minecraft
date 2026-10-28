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
 * 客户端姿态批（第三人称手臂）：1.12 BLOCK 分支给 Y = ∓0.5235988（±30° 内收），
 * R196 的 use 态 Y 被 {@code ModelBiped.java:129-130} 清零（X 两代同值）。
 *
 * <p>本注入只在「正在使用的物品是 ETIM 格挡载体（不含盾）」时改写手臂角度；
 * 参数走 config：{@code tpArmY} = 目标 Y 角（度，0 = R196 字面；30 = 1.12 原版内收），
 * {@code tpArmX} = 附加 X 角（度，0 = 不动）。盾仍走原版（W13-B-2 保护）。</p>
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
    private void etim$thirdPersonBlockArm(Entity entity, float f1, float f2, float f3, float f4, float f5, float f6, CallbackInfo ci) {
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
        float yaw = (float) Math.toRadians(ETIMConfig.tpArmY);
        float pitch = (float) Math.toRadians(ETIMConfig.tpArmX);
        if (this.rightArmPose == ModelBiped.ArmPose.BLOCK && isCarrier(living.getHeldItem(EnumHand.MAIN_HAND))) {
            this.bipedRightArm.rotateAngleY = -yaw;
            this.bipedRightArm.rotateAngleX += pitch;
        }
        if (this.leftArmPose == ModelBiped.ArmPose.BLOCK && isCarrier(living.getHeldItem(EnumHand.OFF_HAND))) {
            this.bipedLeftArm.rotateAngleY = yaw;
            this.bipedLeftArm.rotateAngleX += pitch;
        }
    }

    private static boolean isCarrier(ItemStack stack) {
        return ETIMBlocking.isBlockCarrier(stack);
    }
}
