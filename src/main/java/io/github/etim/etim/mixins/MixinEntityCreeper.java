package io.github.etim.etim.mixins;

import io.github.etim.etim.mob.ETIMCreeperExplosionRadius;
import net.minecraft.entity.monster.EntityCreeper;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;

/**
 * B-47: expose the vanilla creeper explosion radius to the infernal variant.
 *
 * <p>The R196 infernal creeper doubles the radius in its constructor. 1.12's
 * field is private and has no setter, so this accessor is the minimal carrier.
 * It is inert for ordinary creepers (nothing calls the setter).</p>
 */
@Mixin(EntityCreeper.class)
public abstract class MixinEntityCreeper implements ETIMCreeperExplosionRadius {

    @Shadow
    private int explosionRadius;

    @Override
    public void etim$setExplosionRadius(int radius) {
        this.explosionRadius = radius;
    }

    @Override
    public int etim$getExplosionRadius() {
        return this.explosionRadius;
    }
}
