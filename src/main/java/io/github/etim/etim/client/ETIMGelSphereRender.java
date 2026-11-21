package io.github.etim.etim.client;

import io.github.etim.etim.mob.ETIMEntityGelatinousSphere;
import io.github.etim.etim.mob.ETIMItemGelatinousSphere;

import net.minecraft.client.renderer.entity.RenderManager;
import net.minecraft.client.renderer.entity.RenderSnowball;
import net.minecraft.item.ItemStack;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * B-58 — the R196 {@code RenderSnowball} row for the sphere
 * (RenderManager.java:96 chose RenderSnowball for {@code Item.slimeBall};
 * RenderSnowball.java:22-23 fed {@code field_94150_f = getModelSubtype()}).
 * 1.12's {@link RenderSnowball} renders {@code new ItemStack(item)} with no
 * metadata (:59-62), so the override hands it the subtype-carrying stack —
 * the direct equivalent of that field.
 */
@SideOnly(Side.CLIENT)
public final class ETIMGelSphereRender extends RenderSnowball<ETIMEntityGelatinousSphere> {

    public ETIMGelSphereRender(RenderManager renderManagerIn) {
        super(renderManagerIn, ETIMItemGelatinousSphere.ITEM,
                net.minecraft.client.Minecraft.getMinecraft().getRenderItem());
    }

    /** R196 getModelSubtype — five-colour ammo on the flight model. */
    @Override
    public ItemStack getStackToRender(ETIMEntityGelatinousSphere entity) {
        return entity.getModelItem();
    }
}
