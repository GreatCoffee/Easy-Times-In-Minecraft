package io.github.etim.etim.client;

import net.minecraft.client.model.ModelBiped;
import net.minecraft.entity.Entity;
import net.minecraft.util.math.MathHelper;

/**
 * B-59 — R196 {@code ModelInvisibleStalker} (26 lines) verbatim: a
 * {@code ModelBiped(0, 0, 64, 32)} whose arms point straight forward and
 * sway with the walk cycle (the shared ghoul / wight / shadow shell).
 */
public class ETIMModelStalker extends ModelBiped {

    public ETIMModelStalker() {
        super(0.0F, 0.0F, 64, 32); // R196 :5
    }

    @Override
    public void setRotationAngles(float limbSwing, float limbSwingAmount, float ageInTicks,
            float netHeadYaw, float headPitch, float scaleFactor, Entity entityIn) {
        super.setRotationAngles(limbSwing, limbSwingAmount, ageInTicks, netHeadYaw, headPitch, scaleFactor, entityIn);
        float var8 = MathHelper.sin(this.swingProgress * (float) Math.PI); // R196 onGround->swingProgress :11
        float var9 = MathHelper.sin((1.0F - (1.0F - this.swingProgress) * (1.0F - this.swingProgress)) * (float) Math.PI); // :12
        this.bipedRightArm.rotateAngleZ = 0.0F;
        this.bipedLeftArm.rotateAngleZ = 0.0F;
        this.bipedRightArm.rotateAngleY = -(0.1F - var8 * 0.6F);
        this.bipedLeftArm.rotateAngleY = 0.1F - var8 * 0.6F;
        this.bipedRightArm.rotateAngleX = (float) (-Math.PI / 2);
        this.bipedLeftArm.rotateAngleX = (float) (-Math.PI / 2);
        this.bipedRightArm.rotateAngleX -= var8 * 1.2F - var9 * 0.4F;
        this.bipedLeftArm.rotateAngleX -= var8 * 1.2F - var9 * 0.4F;
        this.bipedRightArm.rotateAngleZ = this.bipedRightArm.rotateAngleZ + (MathHelper.cos(ageInTicks * 0.09F) * 0.05F + 0.05F);
        this.bipedLeftArm.rotateAngleZ = this.bipedLeftArm.rotateAngleZ - (MathHelper.cos(ageInTicks * 0.09F) * 0.05F + 0.05F);
        this.bipedRightArm.rotateAngleX = this.bipedRightArm.rotateAngleX + MathHelper.sin(ageInTicks * 0.067F) * 0.05F;
        this.bipedLeftArm.rotateAngleX = this.bipedLeftArm.rotateAngleX - MathHelper.sin(ageInTicks * 0.067F) * 0.05F;
    }
}
