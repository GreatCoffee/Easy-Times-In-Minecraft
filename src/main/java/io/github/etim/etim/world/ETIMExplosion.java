package io.github.etim.etim.world;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMLivestock;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;

import java.util.Locale;

/**
 * B-67 (F-4): R196 explosion semantics that the 1.12 {@link net.minecraft.world.Explosion}
 * does not carry.
 *
 * <p>Faces: Explosion.java:20-34 (dual radius), :167-214 (entity damage), :223-228
 * (livestock spook), :297-308 (fire ignition). Block destruction itself stays on the
 * 1.12 resistance walk (D-2 ruling); only the formula and the bookkeeping move.</p>
 *
 * <p>中文：R196 的双半径、实体伤害公式、牲畜受惊与火焰爆炸在这边补齐；方块破坏仍走 1.12
 * 的抗性步进（D-2 裁定）。接口只收基本类型，Explosion 的私有字段由 mixin 侧 shadow 后传入。</p>
 */
public final class ETIMExplosion {

    private static final String TAG = "ExplosionLog";

    private ETIMExplosion() {
    }

    /** Face :111 — MITE damage formula; returns 0 when below the 0.5 floor. */
    public static float entityDamage(World world, double x, double y, double z,
                                     float entitySize, Entity entity) {
        float effective = entitySize * 4.0F;
        double distance = entity.getDistance(x, y, z);
        if (distance > (double) effective) {
            return 0.0F;
        }
        Vec3d center = new Vec3d(x, y, z);
        double density = world.getBlockDensity(center, entity.getEntityBoundingBox());
        double factor = (1.0D - distance / (double) effective) * density;
        float damage = (float) (effective * factor * 4.0D * 0.6666667D);
        float result = damage >= 0.5F ? damage : 0.0F;
        if (ETIMConfig.explosionR196) {
            row("dmg entity=" + entity.getClass().getSimpleName()
                    + " dist=" + fmt(distance)
                    + " eff=" + fmt(effective)
                    + " density=" + fmt(density)
                    + " damage=" + fmt(result)
                    + " sizef=" + fmt(entitySize));
        }
        return result;
    }

    /** Face :112 — R196 livestock spook window: now + 400 + rand(400). */
    public static void spookLivestock(World world, EntityLivingBase entity) {
        if (!ETIMConfig.explosionR196 || entity == null || entity.isDead) {
            return;
        }
        ETIMLivestock.IState state = ETIMLivestock.get(entity);
        if (state == null) {
            return;
        }
        long until = world.getTotalWorldTime() + 400L + world.rand.nextInt(400);
        state.setSpookedUntil(until);
        row("spook entity=" + entity.getClass().getSimpleName() + " until=" + until);
    }

    /** Face :113 — R196 fire ignition: air above an opaque cube, 1/3 per position. */
    public static void ignite(World world, Iterable<BlockPos> positions, double x, double y, double z) {
        if (!ETIMConfig.explosionR196) {
            return;
        }
        int placed = 0;
        for (BlockPos pos : positions) {
            if (world.isAirBlock(pos)
                    && world.getBlockState(pos.down()).isOpaqueCube()
                    && world.rand.nextInt(3) == 0) {
                world.setBlockState(pos, Blocks.FIRE.getDefaultState(), 3);
                placed++;
            }
        }
        if (placed > 0) {
            row("fire placed=" + placed + " x=" + fmt(x) + " y=" + fmt(y) + " z=" + fmt(z));
        }
    }

    /** Whether the exploder must always set fire (R196 infernal creeper / netherspawn). */
    public static boolean alwaysFlaming(Entity exploder) {
        return exploder instanceof io.github.etim.etim.mob.ETIMEntityInfernalCreeper
                || exploder instanceof io.github.etim.etim.mob.ETIMEntityNetherspawn;
    }

    /** Entity box used for the R196 livestock sweep (effective - 1) * 4. */
    public static AxisAlignedBB livestockBox(double x, double y, double z, float entitySize) {
        double reach = Math.max(0.0D, (double) (entitySize - 1.0F)) * 4.0D;
        return new AxisAlignedBB(x - reach, y - reach, z - reach, x + reach, y + reach, z + reach);
    }

    public static void row(String line) {
        ETIM.LOGGER.info("[{}] {} [server]", TAG, line);
    }

    private static String fmt(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }
}
