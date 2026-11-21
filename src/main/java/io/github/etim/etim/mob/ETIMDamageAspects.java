package io.github.etim.etim.mob;

import io.github.etim.etim.metal.ETIMMetalGear;
import io.github.etim.etim.metal.ETIMMetals;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.EntityAreaEffectCloud;
import net.minecraft.entity.projectile.EntityPotion;
import net.minecraft.item.ItemStack;
import net.minecraft.util.DamageSource;

/**
 * B-55 — the R196 damage-aspect seam (silver / magic / sunlight), the gate
 * the nightwing, shadow and wight immunity rows read
 * ({@code EntityNightwing.java:18}, {@code EntityShadow.java:30},
 * {@code EntityWight.java:28}).
 *
 * <p>R196 computes the aspect once in {@code EntityDamageSource}'s constructor
 * (EntityDamageSource.java:23-45): an arrow whose ammo item has
 * {@code Material.silver} sets the silver bit, a burning arrow sets fire, a
 * magical throwable or an enchanted launcher/held item sets magic, and melee
 * reads {@code responsible_entity.getHeldItemStack()}. 1.12 has no such bits
 * on {@code DamageSource}, so the same judgment is made lazily from the
 * source's entities — no mixin state, nothing to sync.</p>
 *
 * <p>Silver follows the ETIM metal gear line: the item must be an
 * {@link ETIMMetalGear} whose metal is {@link ETIMMetals#SILVER}, mirroring
 * R196's {@code hasMaterial(Material.silver)}. Enchantment is 1.12's
 * {@code isItemEnchanted()}, the same call R196 makes.</p>
 */
public final class ETIMDamageAspects {

    /** R196 {@code DamageSource.sunlight}: unblockable, aspect-exempt. */
    public static final DamageSource SUNLIGHT =
            new DamageSource("etim.sunlight").setDamageBypassesArmor();

    /** R196 DamageSource.java:24-25 — the two dissolve aspects (plain sources,
     *  no flags; the sphere carries them through {@code Damage}). 1.12 has no
     *  {@code Damage} wrapper, so the caller passes the kind explicitly and the
     *  hit itself is a plain {@code thrown} projectile source. */
    public static final DamageSource PEPSIN = new DamageSource("etim.pepsin");
    public static final DamageSource ACID = new DamageSource("etim.acid");

    private ETIMDamageAspects() {
    }

    /** R196 {@code DamageSource.causeThrownDamage(sphere, thrower)} — the sphere
     *  is the immediate source, the thrower the true source (kill credit / aggro). */
    public static DamageSource thrown(Entity source, Entity thrower) {
        return new net.minecraft.util.EntityDamageSourceIndirect("thrown", source, thrower)
                .setProjectile();
    }

    /**
     * R196 immunity matrix (Entity.java:1684-1700 + :1374/:1378, EntityLivingBase
     * :2607, EntityZombie :419, EntityCubic :546/:551):
     * <ul>
     *   <li>pepsin — every living non-undead is harmed; zombies are the explicit
     *       R196 exemption (harmed); gel cubes and all non-living are immune.</li>
     *   <li>acid — default harmed; only pudding (R196 {@code isPudding}) and the
     *       magma cube are immune; ooze is acid-family but still harmed.</li>
     * </ul>
     */
    public static boolean isHarmedBy(Entity target, ETIMBlockDissolve.Kind kind) {
        if (kind == ETIMBlockDissolve.Kind.ACID) {
            return !(target instanceof ETIMEntityPudding || target instanceof net.minecraft.entity.monster.EntityMagmaCube);
        }
        if (target instanceof ETIMEntityGelatinousCube) {
            return false;
        }
        if (target instanceof net.minecraft.entity.monster.EntityZombie) {
            return true;
        }
        return target instanceof EntityLivingBase && !((EntityLivingBase) target).isEntityUndead();
    }

    public static boolean hasSilver(DamageSource source) {
        if (source == null) {
            return false;
        }
        Entity immediate = source.getImmediateSource();
        if (immediate instanceof ETIMEntityArrow) {
            ItemStack ammo = ((ETIMEntityArrow) immediate).getArrowStack();
            if (isSilver(ammo)) {
                return true;
            }
        }
        Entity trueSource = source.getTrueSource();
        return trueSource instanceof EntityLivingBase
                && isSilver(((EntityLivingBase) trueSource).getHeldItemMainhand());
    }

    public static boolean hasMagic(DamageSource source) {
        if (source == null) {
            return false;
        }
        if (source.isMagicDamage()) {
            return true;
        }
        Entity immediate = source.getImmediateSource();
        if (immediate instanceof EntityPotion || immediate instanceof EntityAreaEffectCloud) {
            return true;
        }
        Entity trueSource = source.getTrueSource();
        return trueSource instanceof EntityLivingBase
                && isEnchanted(((EntityLivingBase) trueSource).getHeldItemMainhand());
    }

    public static boolean isSunlight(DamageSource source) {
        return source == SUNLIGHT
                || (source != null && "etim.sunlight".equals(source.getDamageType()));
    }

    public static boolean isSilver(ItemStack stack) {
        if (stack == null || stack.isEmpty()) {
            return false;
        }
        return stack.getItem() instanceof ETIMMetalGear
                && ((ETIMMetalGear) stack.getItem()).etimMetal() == ETIMMetals.SILVER;
    }

    private static boolean isEnchanted(ItemStack stack) {
        return stack != null && !stack.isEmpty() && stack.isItemEnchanted();
    }

    /** {@code silver|magic|sunlight|none} — one log token per decision. */
    public static String describe(DamageSource source) {
        if (isSunlight(source)) {
            return "sunlight";
        }
        if (hasSilver(source)) {
            return "silver";
        }
        if (hasMagic(source)) {
            return "magic";
        }
        return "none";
    }
}
