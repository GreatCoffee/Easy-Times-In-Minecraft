package io.github.etim.etim.mob;

import com.google.common.base.Predicate;
import com.google.common.base.Predicates;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItemArrow;
import io.github.etim.etim.metal.ETIMMetals;

import java.util.List;
import java.util.Random;

import net.minecraft.block.Block;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.monster.EntityEnderman;
import net.minecraft.entity.monster.EntitySkeleton;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.entity.projectile.EntityArrow;
import net.minecraft.init.Blocks;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.network.play.server.SPacketChangeGameState;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EntitySelectors;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.SoundEvent;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.RayTraceResult;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import net.minecraftforge.event.ForgeEventFactory;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * The ETIM arrow with an item identity + the batch-C ballistic/damage body.
 * R196 EntityArrow carries its ammo item as a field ({@code public ItemArrow
 * item_arrow} — R196 :19), so a grounded arrow is picked up as the very ETIM
 * arrow item that was fired, and survives chunk reload through the
 * {@code arrow_item_id} NBT key (R196 :610/:633). 1.12.2's {@code EntityArrow}
 * has no such face ({@code getArrowStack()} is abstract, item/EntityTippedArrow
 * hardcodes {@code Items.ARROW}) — the thin identity layer (batch B, D-19):
 *
 * <ul>
 *   <li>the {@code itemArrow} field + the ctor family (R196 :19);</li>
 *   <li>{@code setDamage} from the arrow-head material at spawn (R196 :37);</li>
 *   <li>{@code getArrowStack()} = new ItemStack(itemArrow) (R196 :641);</li>
 *   <li>NBT write/read with the R196 key names, registry-name string values
 *       (D-27①) — missing key at read ⇒ setDead();</li>
 *   <li>{@code [ArrowLog]} spawn/pickup/nbt rows (arrowB §7).</li>
 * </ul>
 *
 * <p>Batch C (onUpdate/onHit 合立批, arrowC-对照报告 §2/§3 — copy of the
 * vanilla 1.12.2 bodies {@code build/rfg/minecraft-src/.../entity/projectile/
 * EntityArrow.java} {@code onUpdate :195-356} and {@code onHit :361-479},
 * judged values replaced by R196 {@code mite-src/decompile/src/net/minecraft/
 * EntityArrow.java}; every private field mirrored, NO access transformer
 * (✗-29, 条84/85 裁定):</p>
 *
 * <ul>
 *   <li><b>hazard ① (arrowC-E-1/A-2①)</b>: the damage model is {@code float}
 *       speed × damage × mult with NO ceil (R196 :365; 1.12 :367-368 is int
 *       ceil + additive crit — both replaced); skeleton/dispatcher lower
 *       bounds itemDamage×2+2 (+2 Longdead / +3 Guardian, exact class compare
 *       {@code getClass()==}, R196 :366-384); crit = ×(1.5+rand×0.5) (R196
 *       :386-388); unenchanted launcher ⇒ equal to the floor (R196 :374-378,
 *       B-1 — skeleton gate; D-29① BoneLord joins arrow_rusted_iron).</li>
 *   <li><b>hazard ② (§3.1)</b>: this override REPLACES {@code
 *       EntityArrow.onUpdate} whole-body — do NOT call {@code super
 *       .onUpdate()} (it is the vanilla arrow body: second integral + second
 *       ground/water face + a second onHit dispatch). The base-tick entry is
 *       {@code this.onEntityUpdate()} (entity/Entity.java:475, public,
 *       EntityArrow does not override it) + the glow-flag two lines
 *       (entity/Entity.java:462-470). Pinned here deliberately.</li>
 *   <li><b>hazard ③ (E-3)</b>: the impact event hook stays as vanilla:
 *       {@code ForgeEventFactory.onProjectileImpact(this, ray)} (1.12 :284;
 *       event/ForgeEventFactory.java:743 — NOT ForgeHooks). Position, arity
 *       and the {@code !} semantics must not change (other mods' interception
 *       face).</li>
 *   <li>mirrored fields: {@code etimXTile/YTile/ZTile/inTile/inData} (1.12
 *       privates :50-54, restored from the same vanilla NBT keys — D-32①, zero
 *       new keys), {@code etimTicksInGround/Air} (:63-64, NOT persisted —
 *       R196 :598-612 does not store such ticks either, reload resets),
 *       {@code etimKnockback} (:67 has only a setter, ✗-33 — sampled in the
 *       overridden {@code setKnockbackStrength}), {@code etimLastHarmed}
 *       (R196 :25, not persisted), {@code etimWasBurning/etimFizzTicks}
 *       (R196 :22-23, not persisted).</li>
 * </ul>
 */
public class ETIMEntityArrow extends EntityArrow {

    /** R196 :19 item_arrow — the item identity (A-2: no 1.12 counterpart). */
    private ETIMItemArrow itemArrow;
    /** R196 :20 — sampled at createArrow time (players; skeletons pass false). */
    private boolean launcherWasEnchanted;
    /** R196 :24 — dispenser face flag (DispenserBehaviorArrow.java:14). */
    private boolean shotByDispenser;
    /** Deny-row de-dup (the pickup row fires on state flips only). */
    private boolean pickupDeniedLogged;

    // mirrored 1.12 privates (✗-29): entity/projectile/EntityArrow.java:50-54
    private int etimXTile;
    private int etimYTile;
    private int etimZTile;
    private Block etimInTile;
    private int etimInData;
    // :63-64 — no writers once onUpdate/onHit are overridden (§3.6): mirrors.
    private int etimTicksInGround;
    private int etimTicksInAir;
    // :67 — getterless private (✗-33): mirror via the setter override.
    private int etimKnockback;
    // R196 :25 last_entity_harmed (✗-24: no 1.12 counterpart) — not persisted.
    private Entity etimLastHarmed;
    // R196 :22-23 — the burning-state machine face, not persisted.
    private boolean etimWasBurning;
    private int etimFizzTicks;
    // state-row de-dup flags (report §7.2: water/quench/ignite/ground first-frame rows)
    private boolean etimWaterLogged;
    private boolean etimQuenchLogged;
    private boolean etimIgniteLogged;
    private boolean etimGroundLogged;

    /** Chunk-reload ctor — the identity is restored in readEntityFromNBT. */
    public ETIMEntityArrow(World world) {
        super(world);
    }

    public ETIMEntityArrow(World world, ETIMItemArrow item, boolean launcherEnchanted) {
        super(world);
        this.setSize(0.5F, 0.5F); // R196 :34/:43/:121 — mirror of the base value (:77)
        init(item, launcherEnchanted);
    }

    public ETIMEntityArrow(World world, double x, double y, double z,
                           ETIMItemArrow item, boolean launcherEnchanted) {
        super(world, x, y, z); // 1.12 :80-84
        init(item, launcherEnchanted);
    }

    public ETIMEntityArrow(World world, EntityLivingBase shooter,
                           ETIMItemArrow item, boolean launcherEnchanted) {
        super(world, shooter); // 1.12 :86-95 — a player shooter is already allowed (:93)
        init(item, launcherEnchanted);
    }

    /** R196 :37 — damage = the arrow item's judged damage, logged once at spawn. */
    private void init(ETIMItemArrow item, boolean launcherEnchanted) {
        this.itemArrow = item;
        this.launcherWasEnchanted = launcherEnchanted;
        this.setDamage(ETIMItemArrow.damage(item.etimMetal()));
        if (!this.world.isRemote) {
            ETIMArrowLog.row("arrow spawn shooter="
                    + (this.shootingEntity == null ? "-" : this.shootingEntity.getName())
                    + " item=" + item.getRegistryName()
                    + " metal=" + item.etimMetal().name
                    + " damage=" + this.getDamage()
                    + " enchanted=" + this.launcherWasEnchanted);
        }
    }

    /** The identity accessor (B2-9 carrier checks, quality faces). */
    public ETIMItemArrow etimItemArrow() {
        return this.itemArrow;
    }

    /** The dispenser-behavior write point (R196 :14). */
    public void setShotByDispenser(boolean value) {
        this.shotByDispenser = value;
    }

    /** R196 :641 — the ground arrow is picked up as the very item that was fired. */
    @Override
    protected ItemStack getArrowStack() {
        return new ItemStack(this.itemArrow);
    }

    /** R196 :637-651 pickup face over the untouched 1.12 :603-620 logic + judgment row.
     *  1.12 has no pop sound (B-5): the R196 "random.pop" 0.2F (R196 :646) rides as
     *  ENTITY_ITEM_PICKUP at the same volume. */
    @Override
    public void onCollideWithPlayer(net.minecraft.entity.player.EntityPlayer player) {
        super.onCollideWithPlayer(player);
        if (this.world.isRemote) {
            return;
        }
        // picked = the arrow went dead in the super call (inventory accepted, :609);
        // the vanilla gate (inGround && arrowShake<=0, 1.12 :605 = R196 :639) is
        // already inside super — the deny row fires on state flips only (A-1
        // fix, recheck verdict: standing on a disallowed arrow must log ONCE,
        // not per collision tick).
        boolean picked = this.isDead; // Entity.isDead, a public field (entity/Entity.java:146)
        if (picked) {
            this.playSound(SoundEvents.ENTITY_ITEM_PICKUP, 0.2F, 1.0F); // B-5, R196 :646 0.2F
        }
        if (picked || !this.pickupDeniedLogged) {
            ETIMArrowLog.row("arrow pickup player=" + player.getName()
                    + " item=" + (this.itemArrow == null ? "-" : this.itemArrow.getRegistryName())
                    + " ok=" + picked);
        }
        this.pickupDeniedLogged = !picked;
    }

    /** ✗-33: 1.12 has only the setter (entity/projectile/EntityArrow.java:646) —
     *  mirror-sample for the NE-18 knockback block; the vanilla field stays
     *  synced via the super call. */
    @Override
    public void setKnockbackStrength(int value) {
        super.setKnockbackStrength(value);
        this.etimKnockback = value;
    }

    // ==================== batch C2 — onUpdate (§3.7, ten segments) ====================

    /**
     * 1.12 entity/projectile/EntityArrow.java:195-356 copy body, judged values
     * replaced by R196 (arrowC-对照报告 §3). Entry = the base tick is
     * {@code this.onEntityUpdate()} + the glow-flag two lines — NOT
     * {@code super.onUpdate()} (hazard ② above). Segment order per §3.7:
     * 0 glow+onEntityUpdate, 1 initial facing, 2 in-ground recheck, 3
     * arrowShake--, 4 burning state machine, 5 ground/air branch, 6 ray +
     * findEntityOnPath + player gate + impact event + onHit, 7 crit trail,
     * 8 advance + facing smoothing, 9 drag/water/gravity + setPosition +
     * doBlockCollisions.
     */
    @Override
    public void onUpdate() {
        // segment 0 — Entity.onUpdate (entity/Entity.java:462-470) equivalent:
        // the glow flag + onEntityUpdate. NO super.onUpdate() (hazard ②).
        if (!this.world.isRemote) {
            this.setFlag(6, this.isGlowing()); // 1.12 :464-467
        }
        this.onEntityUpdate(); // 1.12 :469 → Entity.onEntityUpdate :475 (not overridden here)

        // segment 1 — initial facing (1.12 :199-206 = R196 :258-262)
        if (this.prevRotationPitch == 0.0F && this.prevRotationYaw == 0.0F) {
            float f = MathHelper.sqrt(this.motionX * this.motionX + this.motionZ * this.motionZ);
            this.rotationYaw = (float) (MathHelper.atan2(this.motionX, this.motionZ) * (180D / Math.PI));
            this.rotationPitch = (float) (MathHelper.atan2(this.motionY, (double) f) * (180D / Math.PI));
            this.prevRotationYaw = this.rotationYaw;
            this.prevRotationPitch = this.rotationPitch;
        }

        // segment 2 — in-ground recheck (1.12 :208-220; R196 :264-270 uses
        // getCollisionBoundsCombined, ✗-19 — the 1.12 face is the substitute, B-3)
        BlockPos blockpos = new BlockPos(this.etimXTile, this.etimYTile, this.etimZTile);
        IBlockState iblockstate = this.world.getBlockState(blockpos);
        Block block = iblockstate.getBlock();

        if (iblockstate.getMaterial() != Material.AIR) {
            AxisAlignedBB axisalignedbb = iblockstate.getCollisionBoundingBox(this.world, blockpos);
            if (axisalignedbb != Block.NULL_AABB
                    && axisalignedbb.offset(blockpos).contains(new Vec3d(this.posX, this.posY, this.posZ))) {
                this.inGround = true;
            }
        }

        // segment 3 — arrowShake tick (1.12 :222-225 = R196 :272-274)
        if (this.arrowShake > 0) {
            --this.arrowShake;
        }

        // segment 4 — the burning state machine (R196 :276-292)
        if (!this.world.isRemote && this.etimWasBurning) {
            Block groundBlock = this.inGround ? this.etimInTile : null;
            if (groundBlock != null && isFreezingMaterial(groundBlock.getDefaultState().getMaterial())) {
                if (!this.isWet()) {
                    this.quench(); // R196 :280 causeQuenchEffect (✗-25 approximation)
                }
                this.extinguish(); // R196 :283
            } else if (this.isInWater()) {
                this.quench(); // R196 :285
            } else if (this.isWet() && --this.etimFizzTicks <= 0) {
                this.steamPuff(); // R196 :287 spawnSingleSteamParticle (✗-25)
                this.etimFizzTicks = this.rand.nextInt(17) + 3; // R196 :288
            }
        }
        this.etimWasBurning = this.isBurning(); // R196 :292 — last tick's real state

        // segment 5 — the ground / air branch (R196 :293-309 / :310-)
        if (this.inGround) {
            // B-3 + NE-13 (ground branch over mirrors; grass rides R196 :296, C-12)
            IBlockState nowState = this.world.getBlockState(
                    new BlockPos(this.etimXTile, this.etimYTile, this.etimZTile));
            Block nowBlock = nowState.getBlock();
            int nowMeta = nowBlock.getMetaFromState(nowState);
            if (nowBlock == this.etimInTile
                    && (nowMeta == this.etimInData || this.etimInTile == Blocks.GRASS)) {
                ++this.etimTicksInGround; // R196 :297
                ++this.timeInGround; // 1.12 :250 (protected — vanilla face kept)
                int life = this.shootingEntity instanceof EntityPlayer ? 24000 : 1000; // R196 :298
                if (!this.etimGroundLogged) {
                    ETIMArrowLog.row("arrow state step=ground lifetime=" + life);
                    this.etimGroundLogged = true;
                }
                if (this.etimTicksInGround >= life) {
                    this.setDead(); // R196 :299
                    ETIMArrowLog.row("arrow state step=dead tick=" + this.etimTicksInGround);
                }
            } else {
                this.inGround = false; // R196 :302
                Random seedRand = new Random(this.getEntityId()); // R196 :303 (1.12 entity/Entity.java:279)
                double bx = this.motionX;
                double by = this.motionY;
                double bz = this.motionZ;
                this.motionX *= seedRand.nextFloat() * 0.2F; // R196 :304 X→Y→Z order
                this.motionY *= seedRand.nextFloat() * 0.2F; // R196 :305
                this.motionZ *= seedRand.nextFloat() * 0.2F; // R196 :306
                this.etimTicksInGround = 0; // R196 :307
                this.etimTicksInAir = 0; // R196 :308
                ETIMArrowLog.row("arrow state step=unground seed=" + this.getEntityId()
                        + " before=" + f3(bx) + "," + f3(by) + "," + f3(bz)
                        + " after=" + f3(this.motionX) + "," + f3(this.motionY) + "," + f3(this.motionZ));
            }
        } else {
            this.timeInGround = 0; // 1.12 :254
            ++this.etimTicksInAir; // R196 :311

            // NE-15 ignite — the R196 :312-320 face over 1.12 isFlammableWithin (✗-32)
            if (!this.world.isRemote) {
                AxisAlignedBB bb = this.getEntityBoundingBox().contract(0.001D, 0.001D, 0.001D);
                if (this.world.isFlammableWithin(bb)
                        || this.world.isFlammableWithin(bb.offset(this.motionX / 2.0D,
                                this.motionY / 2.0D, this.motionZ / 2.0D))) {
                    this.setFire(8); // R196 :315/:318
                    if (!this.etimIgniteLogged) {
                        ETIMArrowLog.row("arrow state step=ignite");
                        this.etimIgniteLogged = true;
                    }
                } else {
                    this.etimIgniteLogged = false;
                }
            }

            // segment 6 — ray + entity on path + player gate + impact event + onHit
            // (1.12 :256-287; NE-11 gate added per R196 :335-341)
            Vec3d vec3d1 = new Vec3d(this.posX, this.posY, this.posZ);
            Vec3d vec3d = new Vec3d(this.posX + this.motionX, this.posY + this.motionY,
                    this.posZ + this.motionZ);
            RayTraceResult raytraceresult = this.world.rayTraceBlocks(vec3d1, vec3d, false, true, false);
            vec3d1 = new Vec3d(this.posX, this.posY, this.posZ);
            vec3d = new Vec3d(this.posX + this.motionX, this.posY + this.motionY,
                    this.posZ + this.motionZ);

            if (raytraceresult != null) {
                vec3d = new Vec3d(raytraceresult.hitVec.x, raytraceresult.hitVec.y,
                        raytraceresult.hitVec.z);
            }

            Entity entity = this.findEntityOnPath(vec3d1, vec3d);

            if (entity != null) {
                raytraceresult = new RayTraceResult(entity);
            }

            // NE-11 (R196 :335-341): creative-player / pvp-gate targets are
            // passed THROUGH (var4 = null — the arrow keeps flying).
            if (raytraceresult != null && raytraceresult.entityHit instanceof EntityPlayer) {
                EntityPlayer target = (EntityPlayer) raytraceresult.entityHit;
                if (this.shootingEntity instanceof EntityPlayer
                        && !((EntityPlayer) this.shootingEntity).canAttackPlayer(target)) {
                    this.etimLastHarmed = null; // R196 :343-345 (no entity → clear)
                    ETIMArrowLog.row("arrow hit target=" + target.getName()
                            + " raw=0.000 mult=1.000 floor=0.000 crit="
                            + (this.getIsCritical() ? 1 : 0) + " final=0.000 skip=creative");
                    raytraceresult = null; // R196 :339
                }
            }

            // R196 :343-345 — clear the dedupe mark when nothing is hit;
            // must run BEFORE the hit processing (§2.2 note).
            if (raytraceresult == null || raytraceresult.entityHit == null) {
                this.etimLastHarmed = null;
            }

            if (raytraceresult != null
                    && !ForgeEventFactory.onProjectileImpact(this, raytraceresult)) { // 1.12 :284 (hazard ③)
                this.onHit(raytraceresult); // 1.12 :286
            }

            // segment 7 — crit trail, 4 particles (1.12 :289-295 = R196 :500-513, NE-16)
            if (this.getIsCritical()) {
                for (int k = 0; k < 4; ++k) {
                    this.world.spawnParticle(EnumParticleTypes.CRIT, // R196 :504 EnumParticle.crit
                            this.posX + this.motionX * (double) k / 4.0D,
                            this.posY + this.motionY * (double) k / 4.0D,
                            this.posZ + this.motionZ * (double) k / 4.0D,
                            -this.motionX, -this.motionY + 0.2D, -this.motionZ);
                }
            }

            // segment 8 — advance + facing smoothing (1.12 :297-324 = R196 :515-539, NE-23)
            this.posX += this.motionX;
            this.posY += this.motionY;
            this.posZ += this.motionZ;
            float f4 = MathHelper.sqrt(this.motionX * this.motionX + this.motionZ * this.motionZ);
            this.rotationYaw = (float) (MathHelper.atan2(this.motionX, this.motionZ) * (180D / Math.PI));
            this.rotationPitch = (float) (MathHelper.atan2(this.motionY, (double) f4) * (180D / Math.PI));

            while (this.rotationPitch - this.prevRotationPitch < -180.0F) { // R196 :522-524
                this.prevRotationPitch -= 360.0F;
            }
            while (this.rotationPitch - this.prevRotationPitch >= 180.0F) { // R196 :526-528
                this.prevRotationPitch += 360.0F;
            }
            while (this.rotationYaw - this.prevRotationYaw < -180.0F) { // R196 :530-532
                this.prevRotationYaw -= 360.0F;
            }
            while (this.rotationYaw - this.prevRotationYaw >= 180.0F) { // R196 :534-536
                this.prevRotationYaw += 360.0F;
            }
            this.rotationPitch = this.prevRotationPitch
                    + (this.rotationPitch - this.prevRotationPitch) * 0.2F; // R196 :538
            this.rotationYaw = this.prevRotationYaw
                    + (this.rotationYaw - this.prevRotationYaw) * 0.2F; // R196 :539

            // segment 9 — drag / water / gravity + setPosition (R196 :540-565, B-4)
            float drag = 0.99F; // R196 :540
            float gravity = 0.05F; // R196 :541
            if (this.isInWater()) {
                for (int i = 0; i < 4; ++i) { // R196 :543-555, 4 bubbles
                    this.world.spawnParticle(EnumParticleTypes.WATER_BUBBLE,
                            this.posX - this.motionX * 0.25D, this.posY - this.motionY * 0.25D,
                            this.posZ - this.motionZ * 0.25D, this.motionX, this.motionY, this.motionZ);
                }
                drag = 0.8F; // R196 :557 (1.12 :336 is 0.6F — B-6)
                if (!this.etimWaterLogged) { // row de-dup (§7.2)
                    ETIMArrowLog.row("arrow state step=water drag=0.800");
                    this.etimWaterLogged = true;
                }
            } else {
                this.etimWaterLogged = false;
            }
            this.motionX *= (double) drag; // R196 :560
            this.motionY *= (double) drag; // R196 :561
            this.motionZ *= (double) drag; // R196 :562
            this.motionY -= (double) gravity; // R196 :563 (no hasNoGravity gate, C-13)

            this.setPosition(this.posX, this.posY, this.posZ); // R196 :564
            this.doBlockCollisions(); // R196 :565
        }
    }

    /** ✗-31: no {@code Material.isFreezing} — the three 1.12 freezing materials
     *  per R196 Material.java:735-737 (isSnow || ice), carded B-8. */
    private static boolean isFreezingMaterial(Material material) {
        return material == Material.SNOW || material == Material.CRAFTED_SNOW || material == Material.ICE;
    }

    /** ✗-25 approximation: quench = the extinguish sound + a smoke puff. */
    private void quench() {
        this.extinguish();
        this.playSound(SoundEvents.BLOCK_FIRE_EXTINGUISH, 0.7F, 1.6F);
        this.steamPuff();
        if (!this.etimQuenchLogged) {
            ETIMArrowLog.row("arrow state step=quench");
            this.etimQuenchLogged = true;
        }
    }

    /** ✗-25 approximation: the fizz hiss = a smoke particle in place of
     *  spawnSingleSteamParticle(true). */
    private void steamPuff() {
        this.world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL, this.posX, this.posY,
                this.posZ, 0.0D, 0.05D, 0.0D);
    }

    /** 1.12 :501-530 copy body; the only change = private {@code ticksInAir} →
     *  the {@code etimTicksInAir} mirror (else the shooter is never hittable
     *  by their own arrow — §3.6). The vanilla predicate (ARROW_TARGETS,
     *  private :42) is rebuilt inline: NOT_SPECTATING + IS_ALIVE +
     *  canBeCollidedWith. B-4: the vanilla :231 collidesWithAnyBlock gate and
     *  this !inGround gate belong to different faces. */
    @Override
    protected Entity findEntityOnPath(Vec3d start, Vec3d end) {
        Entity found = null;
        List<Entity> list = this.world.getEntitiesInAABBexcluding(this,
                this.getEntityBoundingBox().expand(this.motionX, this.motionY, this.motionZ).grow(1.0D),
                Predicates.and(EntitySelectors.NOT_SPECTATING, EntitySelectors.IS_ALIVE,
                        new Predicate<Entity>() {
                            public boolean apply(Entity e) {
                                return e.canBeCollidedWith();
                            }
                        }));
        double best = 0.0D;
        for (Entity candidate : list) {
            if (candidate != this.shootingEntity || this.etimTicksInAir >= 5) { // R196 :251
                AxisAlignedBB box = candidate.getEntityBoundingBox().grow(0.30000001192092896D); // 1.12 :513
                RayTraceResult hit = box.calculateIntercept(start, end);
                if (hit != null) {
                    double d = start.squareDistanceTo(hit.hitVec);
                    if (d < best || best == 0.0D) {
                        found = candidate;
                        best = d;
                    }
                }
            }
        }
        return found;
    }

    // ==================== batch C1 — onHit (§2.2, A-2 ①: self-taught float) ====================

    /**
     * R196 :347-498 hit body over 1.12 onHit (entity branch replaced, block
     * branch delegated to super = NE-12 zero-code face). The damage column is
     * <b>float, no ceil</b> (R196 :365; hazard ①). The lower-bound column
     * (skeleton :366-378 / dispenser :379-384) rides the same if-chain;
     * crit ← ×(1.5 + rand×0.5) (R196 :386-388). Effective judgement = the
     * A-5① boolean approximation: dedupe → slow → immune → half-heart →
     * rejected; failure loopback = bounceBack (R196 :489-494).
     */
    @Override
    protected void onHit(RayTraceResult ray) {
        if (ray.entityHit == null) {
            // NE-12: delegate the block face to the vanilla :453-478 body.
            BlockPos p = ray.getBlockPos();
            this.etimXTile = p.getX(); // mirror before super — the ground
            this.etimYTile = p.getY(); // branch reads the mirrors, and the
            this.etimZTile = p.getZ(); // super keeps its privates in sync.
            IBlockState st = this.world.getBlockState(p);
            this.etimInTile = st.getBlock();
            this.etimInData = this.etimInTile.getMetaFromState(st);
            super.onHit(ray);
            return;
        }

        Entity entityHit = ray.entityHit;
        float speed = MathHelper.sqrt(this.motionX * this.motionX
                + this.motionY * this.motionY + this.motionZ * this.motionZ); // R196 :352

        float mult = 1.0F; // R196 :353
        if (entityHit instanceof EntityLivingBase) {
            EntityLivingBase livingHit = (EntityLivingBase) entityHit;
            if (livingHit.isEntityUndead() && this.itemArrow.etimMetal() == ETIMMetals.SILVER) {
                mult *= 1.25F; // R196 :356-358
            }
            if (entityHit instanceof EntitySkeleton) {
                mult *= 0.25F; // R196 :360-362
            }
        }

        float raw = speed * (float) this.getDamage() * mult; // R196 :365 (float, no ceil)
        float floor = 0.0F;
        if (this.shootingEntity instanceof EntitySkeleton) { // R196 :366
            floor = (float) ETIMItemArrow.damage(this.itemArrow.etimMetal()) * 2.0F + 2.0F; // R196 :367
            if (this.shootingEntity.getClass() == ETIMEntityLongdead.class) { // R196 :368 exact class compare
                floor += 2.0F; // R196 :369
            } else if (this.shootingEntity.getClass() == ETIMEntityLongdeadGuardian.class) { // R196 :370
                floor += 3.0F; // R196 :371
            }
            if (raw < floor) {
                raw = floor; // R196 :374-375
            } else if (!this.launcherWasEnchanted) { // B-1: unenchanted ⇒ equal to the floor
                raw = floor; // R196 :376-378
            }
        } else if (this.shotByDispenser) { // R196 :379-384: the dispenser only raises
            floor = (float) ETIMItemArrow.damage(this.itemArrow.etimMetal()) * 2.0F + 2.0F; // R196 :380
            if (raw < floor) {
                raw = floor;
            }
        }

        boolean crit = this.getIsCritical(); // R196 :386
        float finalDamage = raw;
        if (crit) {
            finalDamage *= 1.5F + this.rand.nextFloat() * 0.5F; // R196 :387-388 (multiplicative)
        }

        DamageSource source = this.shootingEntity == null
                ? DamageSource.causeArrowDamage(this, this) // R196 :391-392
                : DamageSource.causeArrowDamage(this, this.shootingEntity); // R196 :393-394

        // R196 :397-411 fire face (cube branches ✗ — only the plain setFire(5))
        if (this.isBurning() && !(entityHit instanceof EntityEnderman)) {
            entityHit.setFire(5); // R196 :397/:409
        }

        boolean immune = entityHit.isEntityInvulnerable(source); // R196 :426 (✗-18 substitute, B-9)
        boolean applied = false;
        String skip = null;
        if (entityHit == this.etimLastHarmed) {
            skip = "dedupe"; // R196 :427 (pecking order: dedupe > slow > immune > half-heart > rejected)
        } else if (speed < 1.0F) {
            skip = "slow"; // R196 :428 getVelocity() < 1.0F ✗-20 (inlined)
        } else if (immune) {
            skip = "immune"; // R196 :426
        } else if (finalDamage < 1.0F) {
            skip = "half-heart"; // R196 EntityLivingBase.java:749 / Damage.java:61-63 (pre-armor whole-amount abort, ✗-28)
        } else if (!this.world.isRemote) {
            applied = entityHit.attackEntityFrom(source, finalDamage); // R196 :430 / 1.12 :391 (A-5①)
            if (!applied) {
                skip = "rejected"; // A-5 residual (B-1)
            }
        }

        if (!this.world.isRemote) { // R196 :429 onServer() face
            ETIMArrowLog.row("arrow hit target=" + entityHit.getName()
                    + " raw=" + f3(raw)
                    + " mult=" + f3(mult)
                    + " floor=" + f3(floor)
                    + " crit=" + (crit ? 1 : 0)
                    + " final=" + f3(skip == null ? finalDamage : 0.0F) // A-1 recheck fix: value only when actually applied
                    + (skip == null ? "" : " skip=" + skip));
        }

        if (applied) {
            this.etimLastHarmed = entityHit; // R196 :436
            if (entityHit instanceof EntityLivingBase) {
                EntityLivingBase living = (EntityLivingBase) entityHit;
                living.setArrowCountInEntity(living.getArrowCountInEntity() + 1); // R196 :443 (NE-22)
                if (this.etimKnockback > 0) { // R196 :453-461 (NE-18)
                    float horiz = MathHelper.sqrt(this.motionX * this.motionX
                            + this.motionZ * this.motionZ);
                    if (horiz > 0.0F) {
                        living.addVelocity(this.motionX * this.etimKnockback * 0.6000000238418579D
                                        / (double) horiz,
                                0.10000000149011612D,
                                this.motionZ * this.etimKnockback * 0.6000000238418579D
                                        / (double) horiz);
                    }
                }
                if (this.shootingEntity instanceof EntityLivingBase) {
                    // R196 :470 EnchantmentThorns.func_92096_a — the 1.12 helper face (B-12)
                    net.minecraft.enchantment.EnchantmentHelper.applyThornEnchantments(living,
                            this.shootingEntity);
                }
                this.arrowHit(living); // 1.12 :418 hook kept (R196 has no counterpart, zero value gap)
                if (this.shootingEntity != null && entityHit != this.shootingEntity
                        && entityHit instanceof EntityPlayer
                        && this.shootingEntity instanceof EntityPlayerMP) {
                    ((EntityPlayerMP) this.shootingEntity).connection
                            .sendPacket(new SPacketChangeGameState(6, 0.0F)); // R196 :473-478
                }
            }
            this.playSound(SoundEvents.ENTITY_ARROW_HIT, 1.0F,
                    1.2F / (this.rand.nextFloat() * 0.2F + 0.9F)); // R196 :481 "random.bowhit"
            if (!(entityHit instanceof EntityEnderman)) {
                this.setDead(); // R196 :482-484
            }
        } else {
            this.bounceBack(); // R196 :489-494
        }
    }

    /** R196 :237-247 — bounceBack. Net factors: X/Z = −0.025 (reversed),
     *  Y = +0.025 SAME direction (the two negative signs cancel — arrowC-E-2).
     *  No small-velocity self-dust-up (the vanilla :442-449 tail is NOT copied —
     *  R196 keeps flying and the ground branch closes). */
    private void bounceBack() {
        this.motionX *= -0.1F; // R196 :238-240
        this.motionY *= -0.1F;
        this.motionZ *= -0.1F;
        this.rotationYaw += 180.0F; // R196 :241-242
        this.prevRotationYaw += 180.0F;
        this.etimTicksInAir = 0; // R196 :243
        this.motionX /= 4.0D; // R196 :244-246
        this.motionY /= -4.0D;
        this.motionZ /= 4.0D;
    }

    // ==================== NBT (batch B + the §3.5 mirror restore) ====================

    /** A-4 / §7 row A number format — %.3f, else 8.7 and 9 become indistinguishable. */
    private static String f3(double value) {
        return String.format("%.3f", value);
    }

    /** Batch B identity NBT (D-27① values) + judgment rows. */
    @Override
    public void writeEntityToNBT(NBTTagCompound nbt) {
        super.writeEntityToNBT(nbt); // 1.12 :544-560 (mirror keys xTile/.../inGround ride)
        nbt.setString("arrow_item_id",
                this.itemArrow.getRegistryName().toString()); // R196 :610 key name
        nbt.setBoolean("launcher_was_enchanted", this.launcherWasEnchanted); // R196 :611
        nbt.setBoolean("shot_by_dispenser", this.shotByDispenser); // C-8 superset
        if (!this.world.isRemote) {
            ETIMArrowLog.row("arrow nbt write item=" + this.itemArrow.getRegistryName());
        }
    }

    /** Batch B read face (+ missing-key setDead) with the §3.5 mirror restore
     *  after super reads the same vanilla keys and before the identity death
     *  check (D-32①: zero new keys). */
    @Override
    public void readEntityFromNBT(NBTTagCompound nbt) {
        super.readEntityFromNBT(nbt); // 1.12 :563-598

        // mirror restore — same vanilla keys (D-32①), not itemArrow-gated.
        this.etimXTile = nbt.getInteger("xTile");
        this.etimYTile = nbt.getInteger("yTile");
        this.etimZTile = nbt.getInteger("zTile");
        if (nbt.hasKey("inTile", 8)) {
            this.etimInTile = ForgeRegistries.BLOCKS.getValue(new ResourceLocation(nbt.getString("inTile")));
        } else {
            this.etimInTile = Block.getBlockById(nbt.getByte("inTile") & 255);
        }
        this.etimInData = nbt.getByte("inData") & 255;
        // etimTicksInGround / etimTicksInAir are NOT restored (R196 :598-612 does
        // not store them — reload resets; report §3.5).
        // knockback / lastHarmed / wasBurning / fizzTicks: also not persisted.

        String name = nbt.getString("arrow_item_id");
        if (!name.isEmpty()) {
            net.minecraft.item.Item item =
                    ForgeRegistries.ITEMS.getValue(new ResourceLocation(name));
            if (item instanceof ETIMItemArrow) {
                this.itemArrow = (ETIMItemArrow) item;
                this.setDamage(ETIMItemArrow.damage(this.itemArrow.etimMetal()));
            }
        }
        this.launcherWasEnchanted = nbt.getBoolean("launcher_was_enchanted");
        this.shotByDispenser = nbt.getBoolean("shot_by_dispenser");
        if (this.itemArrow == null) {
            this.setDead(); // new type has no legacy saves — no identity, no behavior
            return;
        }
        if (!this.world.isRemote) {
            ETIMArrowLog.row("arrow nbt read item=" + this.itemArrow.getRegistryName());
        }
    }
}
