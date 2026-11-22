package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.item.ETIMBlockDrops;
import io.github.etim.etim.world.ETIMExplosion;
import io.github.etim.etim.world.ETIMExplosionDuck;
import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.util.DamageSource;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.Explosion;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.Unique;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.util.List;

/**
 * B-67 (F-4): R196 {@code Explosion} faces on the 1.12 class.
 *
 * <ul>
 *   <li>:20-34 — second radius (entity size) kept on a duck, defaulting to {@code size};</li>
 *   <li>:167-214 — entity damage formula (effective radius x density, 0.5 floor);</li>
 *   <li>:223-228 — livestock spook window;</li>
 *   <li>:297-308 — fire ignition for the flaming exploders.</li>
 * </ul>
 *
 * <p>Block destruction keeps the 1.12 resistance walk; the drop chain is redirected to
 * {@link ETIMBlockDrops} (D-2 = merged phase).</p>
 *
 * <p>中文：爆炸第二半径、实体伤害公式、牲畜受惊与火焰爆炸挂在这里；方块破坏仍走 1.12 抗性
 * 步进，掉落改写链在 B 阶段统一下落（D-2 合并阶段）。</p>
 */
@Mixin(Explosion.class)
public abstract class MixinExplosion implements ETIMExplosionDuck {

    @Shadow
    private World world;

    @Shadow
    private Entity exploder;

    @Shadow
    private double x;

    @Shadow
    private double y;

    @Shadow
    private double z;

    @Shadow
    private float size;

    @Shadow
    private List<BlockPos> affectedBlockPositions;

    @Unique
    private float etim$entitySize;

    @Inject(method = "<init>", at = @At("TAIL"))
    private void etim$initEntitySize(World worldIn, Entity exploderIn, double xIn, double yIn, double zIn,
                                     float sizeIn, boolean causesFire, boolean damagesTerrain, CallbackInfo ci) {
        this.etim$entitySize = sizeIn;
    }

    @Override
    public float etim$getEntitySize() {
        return this.etim$entitySize;
    }

    @Override
    public void etim$setEntitySize(float entitySize) {
        if (entitySize > 0.0F) {
            this.etim$entitySize = entitySize;
        }
    }

    @Redirect(method = "doExplosionA",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/entity/Entity;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z"),
            require = 1)
    private boolean etim$explosionDamage(Entity entity, DamageSource source, float original) {
        if (!ETIMConfig.explosionR196) {
            return entity.attackEntityFrom(source, original);
        }
        float damage = ETIMExplosion.entityDamage(this.world, this.x, this.y, this.z,
                this.etim$entitySize > 0.0F ? this.etim$entitySize : this.size, entity);
        if (damage <= 0.0F) {
            return false;
        }
        return entity.attackEntityFrom(source, damage);
    }

    @Inject(method = "doExplosionA", at = @At("TAIL"))
    private void etim$spookLivestock(CallbackInfo ci) {
        if (!ETIMConfig.explosionR196 || this.world.isRemote) {
            return;
        }
        float entitySize = this.etim$entitySize > 0.0F ? this.etim$entitySize : this.size;
        for (EntityLivingBase entity : this.world.getEntitiesWithinAABB(EntityLivingBase.class,
                ETIMExplosion.livestockBox(this.x, this.y, this.z, entitySize))) {
            ETIMExplosion.spookLivestock(this.world, entity);
        }
    }

    @Redirect(method = "doExplosionB",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/block/Block;dropBlockAsItemWithChance(Lnet/minecraft/world/World;Lnet/minecraft/util/math/BlockPos;Lnet/minecraft/block/state/IBlockState;FI)V"),
            require = 1)
    private void etim$explosionDrops(Block block, World worldIn, BlockPos pos, IBlockState state,
                                     float chance, int fortune) {
        if (!ETIMConfig.dropR196) {
            block.dropBlockAsItemWithChance(worldIn, pos, state, chance, fortune);
            return;
        }
        ETIMBlockDrops.explosionDrops(worldIn, pos, state, this.x, this.y, this.z);
    }

    @Inject(method = "doExplosionB", at = @At("TAIL"))
    private void etim$ignite(boolean spawnParticles, CallbackInfo ci) {
        if (!ETIMConfig.explosionR196 || this.world.isRemote) {
            return;
        }
        if (ETIMExplosion.alwaysFlaming(this.exploder)) {
            ETIMExplosion.ignite(this.world, this.affectedBlockPositions, this.x, this.y, this.z);
        }
    }
}
