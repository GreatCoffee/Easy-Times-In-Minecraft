package io.github.etim.etim.mob;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.init.MobEffects;
import net.minecraft.potion.PotionEffect;
import net.minecraft.world.World;

/**
 * R196 {@code EntityCopperspine}：银鱼变体，由铜矿旁的银鱼块（meta 4）钻出。
 * 属性继承基类（HP 8 / speed 0.6 / attack 3），命中掉血时附加中毒 480t I。
 */
public class ETIMEntityCopperspine extends ETIMEntitySilverfish {

    public ETIMEntityCopperspine(World worldIn) {
        super(worldIn);
    }

    @Override
    protected void etimOnBite(EntityLivingBase target) {
        target.addPotionEffect(new PotionEffect(MobEffects.POISON, 480, 0));
    }

    @Override
    public String etimKind() {
        return "copperspine";
    }
}
