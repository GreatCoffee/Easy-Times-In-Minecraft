package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMEntityAIGetOutOfLava;
import net.minecraft.entity.EntityCreature;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.monster.EntityPigZombie;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * B-25 — the R196 {@code EntityDemonSpider}/{@code EntityHellhound}
 * out-of-lava seat board's closest faithful 1.12 carrier: the nether pigman
 * {@code EntityPigZombie} gets {@code addTask(4, EntityAIGetOutOfLava, 1.0F)}
 * — vanilla 1.12 pigmen have NO lava-egress AI at all. The seat cannot ride
 * MixinEntityZombie because EntityPigZombie <b>overrides</b> {@code
 * initEntityAI} without calling super (so zombie-side injections never
 * reach pigmen) — hence its own ctor tail. The Hellhound seat itself (the
 * snow wolf) stays C-grade unseated — dead code in any 1.12 world.
 */
@Mixin(EntityPigZombie.class)
public abstract class MixinEntityPigZombie {

    @Inject(method = "<init>(Lnet/minecraft/world/World;)V", at = @At("TAIL"))
    private void etim$pigmanOutOfLavaAITask(net.minecraft.world.World world, CallbackInfo ci) {
        EntityLiving pigman = (EntityLiving) (Object) this;
        pigman.tasks.addTask(4, new ETIMEntityAIGetOutOfLava((EntityCreature) pigman, 1.0F));
    }
}
