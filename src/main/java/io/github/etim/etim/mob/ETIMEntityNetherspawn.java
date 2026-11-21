package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.projectile.EntitySnowball;
import net.minecraft.init.Blocks;
import net.minecraft.init.SoundEvents;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.Explosion;
import net.minecraft.world.World;

/**
 * R196 {@code EntityNetherspawn}：下界岩银鱼块（meta 3）钻出的变体。
 *
 * <p>R196 一手：湿身时周期性淬火（fizz 音 + 1/4 概率 1 点水伤）、免火、
 * 死亡时自爆（若死于水/雪球/湿身/岩浆则不自爆），爆炸不破坏下界岩/石英矿/金矿。</p>
 *
 * <p>1.12 无 {@code getFragParticle()} 物品族，碎片特效按 D-2 挂账，仅保留烟尘粒子。</p>
 */
public class ETIMEntityNetherspawn extends ETIMEntitySilverfish {

    private int ticksUntilNextFizzSound;
    private boolean etimExploded;

    public ETIMEntityNetherspawn(World worldIn) {
        super(worldIn);
    }

    @Override
    public String etimKind() {
        return "netherspawn";
    }

    @Override
    public void onLivingUpdate() {
        if (this.world.isRemote) {
            if (this.isWet()) {
                int count = this.isInWater() ? 10 : 1;
                for (int i = 0; i < count; i++) {
                    double dx = this.rand.nextGaussian() * 0.08D;
                    double dy = this.rand.nextGaussian() * 0.04D;
                    double dz = this.rand.nextGaussian() * 0.08D;
                    this.world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL,
                            this.posX + (this.rand.nextDouble() - 0.5D) * (double) this.width,
                            this.posY + this.rand.nextDouble() * (double) this.height,
                            this.posZ + (this.rand.nextDouble() - 0.5D) * (double) this.width,
                            dx, dy, dz);
                }
            }
        } else if (this.isWet()) {
            if (--this.ticksUntilNextFizzSound <= 0) {
                this.ticksUntilNextFizzSound = this.rand.nextInt(7) + 2;
                this.world.playSound(null, this.posX, this.posY, this.posZ,
                        SoundEvents.BLOCK_FIRE_EXTINGUISH, SoundCategory.HOSTILE,
                        0.7F, 1.6F + (this.rand.nextFloat() - this.rand.nextFloat()) * 0.4F);
                if (this.rand.nextInt(this.isInWater() ? 1 : 4) == 0) {
                    this.attackEntityFrom(DamageSource.DROWN, 1.0F);
                }
            }
        }
        super.onLivingUpdate();
    }

    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        if (source.isFireDamage() || source == DamageSource.LAVA) {
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[SilverLog] immune kind=netherspawn source={} entity={} [server]",
                        source.getDamageType(), this.getEntityId());
            }
            return false;
        }
        boolean applied = super.attackEntityFrom(source, amount);
        if (applied && !this.etimExploded && this.getHealth() <= 0.0F && !this.isWet() && !this.isInLava()
                && !(source.getImmediateSource() instanceof EntitySnowball)
                && source != DamageSource.DROWN) {
            this.etimExploded = true;
            this.world.createExplosion(this, this.posX, this.posY + (double) (this.height / 4.0F), this.posZ, 1.0F, false);
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[SilverLog] explode kind=netherspawn source={} at {},{},{} entity={} [server]",
                        source.getDamageType(), fmt(this.posX), fmt(this.posY), fmt(this.posZ), this.getEntityId());
            }
        }
        return applied;
    }

    /**
     * R196 {@code shouldExplodeBlock}：下界岩、石英矿、金矿不被自己的爆炸破坏。
     * 1.12 的 {@link Explosion#doExplosionA()} 会为每个候选方块调用本方法，等价于过滤爆炸方块表。
     */
    @Override
    public boolean canExplosionDestroyBlock(Explosion explosion, World world, BlockPos pos, IBlockState state, float power) {
        Block block = state.getBlock();
        if (block == Blocks.NETHERRACK || block == Blocks.QUARTZ_ORE || block == Blocks.GOLD_ORE) {
            return false;
        }
        return super.canExplosionDestroyBlock(explosion, world, pos, state, power);
    }

    @Override
    protected void etimOnBite(EntityLivingBase target) {
    }
}
