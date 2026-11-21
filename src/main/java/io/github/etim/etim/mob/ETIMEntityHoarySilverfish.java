package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.init.MobEffects;
import net.minecraft.potion.PotionEffect;
import net.minecraft.world.World;

/**
 * R196 {@code EntityHoarySilverfish}：银鱼变体，深渊世界的普通银鱼块钻出。
 * 属性继承基类（HP 8 / speed 0.6 / attack 3），命中掉血时附加缓慢 50t V。
 */
public class ETIMEntityHoarySilverfish extends ETIMEntitySilverfish {

    public ETIMEntityHoarySilverfish(World worldIn) {
        super(worldIn);
    }

    @Override
    protected void etimOnBite(EntityLivingBase target) {
        target.addPotionEffect(new PotionEffect(MobEffects.SLOWNESS, 50, 5));
    }

    @Override
    public String etimKind() {
        return "hoary";
    }
}
