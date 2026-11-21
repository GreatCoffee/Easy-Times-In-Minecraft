package io.github.etim.etim.mob;

import java.util.Locale;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.block.Block;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.world.EnumDifficulty;
import net.minecraft.world.World;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * B-58 — the R196 {@code EntityGelatinousSphere} (EntityGelatinousSphere.java:
 * 1-113) on the 1.12 {@link net.minecraft.entity.projectile.EntityThrowable}
 * chassis.
 *
 * <p>Judged values (R196 one-hand):</p>
 * <ul>
 *   <li>thrower ctor :7-12 (base thrower ctor :45-69) — spawn offset
 *       {@code -cos(yaw)·0.16}, {@code y -= 0.1}, {@code -sin(yaw)·0.16}; base
 *       motion 0.4F; sphere velocity factor {@code func_70182_d()} = 1.2F
 *       (:79-85); wander = difficulty spread (:92-101), doubled while
 *       suspended in liquid.</li>
 *   <li>gravity :26-28 = 0.07F (1.12 default 0.03F — the whole reason this
 *       override exists).</li>
 *   <li>:31-92 impact — entity: thrown damage 1.0 + {@code getAttackDamage}
 *       (⇒ 2/3/4/4/5), steam-with-hiss when the hit lands; block: neighbour
 *       first then the hit block, pepsin or acid per subtype (3/4 acid), then
 *       {@code Block.onEntityCollidedWithBlock} (1.12
 *       {@code Block.onEntityCollision} :973); 8 subtype particles; server
 *       side dies. D-4 (用户裁定 A): NO gel entity spawn — R196 has none.</li>
 *   <li>:94-112 — {@code getModelItem} / {@code getModelSubtype} (render),
 *       {@code getDamageType} (aspect), {@code isAcidic} / {@code hasPepsin}.</li>
 * </ul>
 */
public class ETIMEntityGelatinousSphere extends net.minecraft.entity.projectile.EntityThrowable {

    /** R196 :4-5 — the item identity + subtype; 1.12 throws the new ETIM item. */
    private ETIMItemGelatinousSphere item;
    private int subtype;
    /** Own in-ground counter — 1.12's {@code ticksInGround} is private (1200-tick expire is 170). */
    private int etimTicksInGround;
    private boolean etimExpiredLogged;

    /** Chunk-reload ctor; the identity returns in readEntityFromNBT. */
    public ETIMEntityGelatinousSphere(World worldIn) {
        super(worldIn);
    }

    public ETIMEntityGelatinousSphere(World worldIn, EntityLivingBase throwerIn, int subtype) {
        super(worldIn, throwerIn);
        this.init(throwerIn, subtype);
    }

    public ETIMEntityGelatinousSphere(World worldIn, double x, double y, double z, int subtype) {
        super(worldIn, x, y, z);
        this.init(null, subtype);
    }

    /** R196 :7-12 — the item right-click hands the throw to this factory. */
    public static ETIMEntityGelatinousSphere throwFrom(World worldIn, EntityLivingBase throwerIn,
                                                       int subtype) {
        return new ETIMEntityGelatinousSphere(worldIn, throwerIn, subtype);
    }

    /** R196 :7-23 ctor family — the item is always the one ETIM sphere item. */
    private void init(EntityLivingBase throwerIn, int subtypeIn) {
        this.item = ETIMItemGelatinousSphere.ITEM;
        this.subtype = ETIMItemGelatinousSphere.clampSubtype(subtypeIn);
        if (throwerIn != null) {
            // R196 EntityThrowable.java:31-69 — the off-axis spawn point.
            this.setLocationAndAngles(throwerIn.posX,
                    throwerIn.posY + (double) throwerIn.getEyeHeight() - 0.1D, throwerIn.posZ,
                    throwerIn.rotationYaw, throwerIn.rotationPitch);
            float yawRad = throwerIn.rotationYaw / 180.0F * (float) Math.PI;
            this.posX -= (double) (MathHelper.cos(yawRad) * 0.16F);
            this.posY -= 0.1D;
            this.posZ -= (double) (MathHelper.sin(yawRad) * 0.16F);
            this.setPosition(this.posX, this.posY, this.posZ);
            float pitchRad = throwerIn.rotationPitch / 180.0F * (float) Math.PI;
            double dirX = -MathHelper.sin(yawRad) * MathHelper.cos(pitchRad);
            double dirY = -MathHelper.sin(pitchRad); // func_70183_g() = 0 (R196 :31-43)
            double dirZ = MathHelper.cos(yawRad) * MathHelper.cos(pitchRad);
            // R196 setThrowableHeading(dx,dy,dz, func_70182_d()=1.2F, wander)
            this.shoot(dirX, dirY, dirZ, 1.2F, wander());
        }
    }

    /** R196 EntityThrowable.java:92-101 — difficulty spread; 1.12 has no
     *  negative id, so peaceful maps to MITE's -1 (⇒ 5.5, easy ⇒ 5.0). */
    private float wander() {
        EnumDifficulty difficulty = this.world.getDifficulty();
        int level = difficulty == EnumDifficulty.PEACEFUL ? -1 : difficulty.getId();
        float spread = level < 0
                ? 5.0F + (float) level * -0.5F
                : 0.5F + 4.5F / (float) Math.pow(0.8F + (float) (level + 1) / 5.0F, 2.0D);
        if (this.isInWater() || this.isInLava()) {
            spread *= 2.0F; // R196 isSuspendedInLiquid
        }
        return spread;
    }

    /** R196 :26-28 — 0.07F (1.12 base is 0.03F). */
    @Override
    protected float getGravityVelocity() {
        return 0.07F;
    }

    /**
     * R196 :31-92 — the impact body. Entity branch: thrown damage + steam FX
     * on a landed hit. Block branch (server only): neighbour, then the hit
     * block, then {@code onEntityCollidedWithBlock}; 8 particles; die.
     */
    @Override
    protected void onImpact(RayTraceResult result) {
        if (result.entityHit != null) {
            this.strikeEntity(result.entityHit);
        } else if (!this.world.isRemote) {
            BlockPos pos = result.getBlockPos();
            EnumFacing face = result.sideHit;
            ETIMBlockDissolve.Kind kind = ETIMItemGelatinousSphere.kind(this.subtype);
            boolean changed;
            if (kind == ETIMBlockDissolve.Kind.PEPSIN) {
                changed = this.contactPepsin(pos.offset(face), face.getOpposite());
                changed |= this.contactPepsin(pos, face);
            } else {
                changed = this.contactAcid(pos.offset(face), face.getOpposite());
                changed |= this.contactAcid(pos, face);
            }
            IBlockState state = this.world.getBlockState(pos);
            Block block = state.getBlock();
            block.onEntityCollision(this.world, pos, state, this); // 1.12 Block.java:973
            int period = ETIMBlockDissolve.period(state, kind);
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[GelLog] impact type=block subtype={} kind={} at ({},{},{}) face={} block={} period={} changed={} entity={} [server]",
                        this.subtype, kind.name().toLowerCase(Locale.ROOT), pos.getX(), pos.getY(),
                        pos.getZ(), face.getName(), block.getRegistryName(), period, changed,
                        this.getEntityId());
            }
        }

        // R196 :85-90 — 8 subtype particles (D-5: one 1.12 SLIME particle).
        for (int i = 0; i < 8; ++i) {
            this.world.spawnParticle(EnumParticleTypes.SLIME, this.posX, this.posY, this.posZ,
                    0.0D, 0.0D, 0.0D);
        }
        if (!this.world.isRemote) {
            this.setDead(); // R196 :91
        }
    }

    /** B-58 test seam — {@code /etest gelhit} drives the real impact body. */
    public void etimImpactForTest(RayTraceResult result) {
        this.onImpact(result);
    }

    private boolean contactPepsin(BlockPos pos, EnumFacing face) {
        int period = ETIMBlockDissolve.period(this.world.getBlockState(pos),
                ETIMBlockDissolve.Kind.PEPSIN);
        if (period < 0) {
            return false;
        }
        return ETIMBlockDissolve.onContactWithPepsin(this.world, pos, face);
    }

    private boolean contactAcid(BlockPos pos, EnumFacing face) {
        return ETIMBlockDissolve.onContactWithAcid(this.world, pos, face);
    }

    /** R196 :33-45 — thrown damage 1.0 + item damage; immunity via the R196 aspect gate. */
    private void strikeEntity(Entity target) {
        ETIMBlockDissolve.Kind kind = ETIMItemGelatinousSphere.kind(this.subtype);
        float damage = 1.0F + ETIMItemGelatinousSphere.attackDamage(this.subtype);
        DamageSource source = ETIMDamageAspects.thrown(this, this.getThrower());
        boolean immune = !ETIMDamageAspects.isHarmedBy(target, kind);
        boolean applied = false;
        if (!this.world.isRemote && !immune) {
            applied = target.attackEntityFrom(source, damage);
        }
        if (applied) {
            // R196 entityFX(steam_with_hiss) — 1.12 has no such FX enum: hiss + smoke.
            this.world.playSound(null, target.posX, target.posY, target.posZ,
                    net.minecraft.init.SoundEvents.BLOCK_FIRE_EXTINGUISH, SoundCategory.NEUTRAL,
                    0.4F, 1.2F / (this.rand.nextFloat() * 0.2F + 0.9F));
            for (int i = 0; i < 3; ++i) {
                this.world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL, target.posX,
                        target.posY + 0.5D, target.posZ, 0.0D, 0.02D, 0.0D);
            }
        }
        if (ETIMConfig.mobDebugLog && !this.world.isRemote) {
            ETIM.LOGGER.info("[GelLog] impact type=entity subtype={} kind={} dmg={} target={} immune={} dealt={} hp={} entity={} [server]",
                    this.subtype, kind.name().toLowerCase(Locale.ROOT), f3(damage),
                    target.getClass().getSimpleName(), immune, f3(applied ? damage : 0.0F),
                    f3(target instanceof EntityLivingBase ? ((EntityLivingBase) target).getHealth() : 0.0F),
                    this.getEntityId());
        }
    }

    /** R196 :94-96 — the ammo identity (1.12 vanilla {@code getItemStack} is final). */
    public net.minecraft.item.ItemStack getModelItem() {
        return new net.minecraft.item.ItemStack(this.item, 1, this.subtype);
    }

    /** R196 :98-100 — subtype index the renderer/particle face reads. */
    public int getModelSubtype() {
        return this.subtype;
    }

    /** R196 :84-86 / :102-104 — the aspect this sphere applies. */
    public ETIMBlockDissolve.Kind getKind() {
        return ETIMItemGelatinousSphere.kind(this.subtype);
    }

    /** R196 {@code hasPepsin}. */
    public boolean hasPepsin() {
        return this.getKind() == ETIMBlockDissolve.Kind.PEPSIN;
    }

    /** R196 {@code isAcidic}. */
    public boolean isAcidic() {
        return this.getKind() == ETIMBlockDissolve.Kind.ACID;
    }

    /** 1.12 {@code EntityThrowable} eggs the 1200-tick ground lifetime internally;
     *  this mirror only feeds the judgment row (R196 expires silently too). */
    @Override
    public void onUpdate() {
        super.onUpdate();
        if (this.inGround) {
            ++this.etimTicksInGround;
            if (this.etimTicksInGround >= 1200 && !this.etimExpiredLogged
                    && ETIMConfig.mobDebugLog && !this.world.isRemote) {
                ETIM.LOGGER.info("[GelLog] expired at ({},{},{}) subtype={} ticks={} entity={} [server]",
                        (int) Math.floor(this.posX), (int) Math.floor(this.posY),
                        (int) Math.floor(this.posZ), this.subtype, this.etimTicksInGround,
                        this.getEntityId());
                this.etimExpiredLogged = true;
            }
        } else {
            this.etimTicksInGround = 0;
        }
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound nbt) {
        super.writeEntityToNBT(nbt);
        nbt.setInteger("sphere_subtype", this.subtype);
        if (this.item != null) {
            nbt.setString("sphere_item_id", this.item.getRegistryName().toString());
        }
    }

    @Override
    public void readEntityFromNBT(NBTTagCompound nbt) {
        super.readEntityFromNBT(nbt);
        this.subtype = ETIMItemGelatinousSphere.clampSubtype(nbt.getInteger("sphere_subtype"));
        String name = nbt.getString("sphere_item_id");
        if (!name.isEmpty()) {
            net.minecraft.item.Item read = ForgeRegistries.ITEMS.getValue(new ResourceLocation(name));
            if (read instanceof ETIMItemGelatinousSphere) {
                this.item = (ETIMItemGelatinousSphere) read;
            }
        }
        if (this.item == null) {
            this.item = ETIMItemGelatinousSphere.ITEM;
        }
    }

    private static String f3(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }
}
