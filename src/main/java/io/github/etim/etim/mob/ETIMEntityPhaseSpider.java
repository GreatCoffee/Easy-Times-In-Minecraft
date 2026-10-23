package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.MobEffects;
import net.minecraft.init.SoundEvents;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.world.World;

/**
 * R196 {@code EntityPhaseSpider} port (:3-181). Experience = 5×2 = 10
 * (verdict G-S7); web counter is exempt at the Arachnid ctor (stays 0).
 * Evasion counters persist as the verbatim NBT byte pair (:21-32).
 */
public class ETIMEntityPhaseSpider extends ETIMEntityWoodSpider {

    int maxNumEvasions;
    int numEvasions;

    public ETIMEntityPhaseSpider(World world) {
        super(world);
        if (world != null && !world.isRemote) { // R196 onServer()
            this.maxNumEvasions = this.numEvasions = this.rand.nextInt(3) + 2; // 2..4
        }
        this.experienceValue = 10;
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(3.0D); // :17-21
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound nbt) {
        super.writeEntityToNBT(nbt);
        nbt.setByte("max_num_evasions", (byte) this.maxNumEvasions); // R196 :23-31 verbatim
        nbt.setByte("num_evasions", (byte) this.numEvasions);
    }

    @Override
    public void readEntityFromNBT(NBTTagCompound nbt) {
        super.readEntityFromNBT(nbt);
        this.maxNumEvasions = nbt.getByte("max_num_evasions");
        this.numEvasions = nbt.getByte("num_evasions");
    }

    /**
     * R196 :51-70 — evasion recharge every 100 ticks; path-advance teleport
     * every 10 ticks at 1/3 dice (carried faces: clamp(rand(n),1,4) lookahead,
     * distanceSq > 3.0 jump floor per D-S4, index+adv-1 advance per D-S3).
     * The R196 {@code fleeing} disjunct has no 1.12 carrier (C-grade register).
     */
    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (!this.world.isRemote && this.getHealth() > 0.0F) {
            if (this.numEvasions < this.maxNumEvasions && this.ticksExisted % 100 == 0) {
                this.numEvasions++;
            }
            if (this.getNavigator().getPath() != null && this.getAttackTarget() != null
                    && this.ticksExisted % 10 == 0 && this.rand.nextInt(3) == 0) {
                Path path = this.getNavigator().getPath();
                if (!path.isFinished()) {
                    int remaining = path.getCurrentPathLength() - path.getCurrentPathIndex();
                    if (remaining > 1) {
                        int adv = MathHelper.clamp(this.rand.nextInt(remaining), 1, 4);
                        PathPoint point = path.getPathPointFromIndex(path.getCurrentPathIndex() + adv);
                        // R196 distanceSqTo(this) > 3.0 — square distance (D-S4)
                        double ddx = point.x - this.posX;
                        double ddy = point.y - this.posY;
                        double ddz = point.z - this.posZ;
                        if (ddx * ddx + ddy * ddy + ddz * ddz > 3.0D
                                && this.tryTeleportTo(point.x + 0.5D, point.y, point.z + 0.5D, "path")) {
                            path.setCurrentPathIndex(path.getCurrentPathIndex() + adv - 1);
                        }
                    }
                }
            }
        }
    }

    /**
     * R196 :59-111 — target-position teleport: y≥1, chunk loaded, dig down to
     * solid, stand on it, box must be collision- and liquid-free; then the
     * portal-particle + endermen-portal face and the position commit.
     */
    public boolean tryTeleportTo(double px, double py, double pz, String kind) {
        if (this.isDead || this.getHealth() <= 0.0F) {
            return false;
        }
        int x = MathHelper.floor(px);
        int y = MathHelper.floor(py);
        int z = MathHelper.floor(pz);
        if (y >= 1 && this.world.isBlockLoaded(new BlockPos(x, y, z))) {
            double footY = py;
            int yy = y;
            while (!isSolid(x, --yy, z)) {
                if (yy < 1) {
                    return false;
                }
                footY--;
            }
            yy++;
            IBlockState stand = this.world.getBlockState(new BlockPos(x, yy, z));
            if (stand.isNormalCube() || stand.getMaterial() == Material.WATER) {
                return false;
            }
            double dx = px - this.posX;
            double dy = footY - this.posY;
            double dz = pz - this.posZ;
            AxisAlignedBB moved = this.getEntityBoundingBox().offset(dx, dy, dz);
            if (this.world.getCollisionBoxes(this, moved).isEmpty()
                    && !this.world.containsAnyLiquid(moved)) {
                for (int i = 0; i < 16; i++) {
                    this.world.spawnParticle(EnumParticleTypes.PORTAL,
                            px + (this.rand.nextDouble() - 0.5D), footY + this.rand.nextDouble(),
                            pz + (this.rand.nextDouble() - 0.5D), 0.0D, 0.0D, 0.0D);
                }
                this.world.playSound(null, this.posX, this.posY, this.posZ,
                        SoundEvents.ENTITY_ENDERMEN_TELEPORT, SoundCategory.HOSTILE, 1.0F, 1.0F);
                this.setPosition(px, footY, pz);
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[MobLog] phase-teleport to=(" + MathHelper.floor(px) + ","
                            + yy + "," + MathHelper.floor(pz) + ") evasions_left=" + this.numEvasions
                            + " kind=" + kind);
                }
                return true;
            }
            return false;
        }
        return false;
    }

    /**
     * R196 :113-159 — 64-attempt evasion teleport: |dx|≥3 ∨ |dz|≥3 (dx/dz
     * rand(11)-5, dy rand(9)-4), landing must clear the threat horizontally,
     * dig to solid, then re-lock the nearest player within 24.
     */
    public boolean tryTeleportAwayFrom(Entity threat, double minDist) {
        if (this.isDead || this.getHealth() <= 0.0F) {
            return false;
        }
        double minSq = minDist * minDist;
        int x = MathHelper.floor(this.posX);
        int y = MathHelper.floor(this.getEntityBoundingBox().minY);
        int z = MathHelper.floor(this.posZ);
        double threatX = threat == null ? this.posX : threat.posX;
        double threatZ = threat == null ? this.posZ : threat.posZ;
        for (int attempt = 0; attempt < 64; attempt++) {
            int dx = this.rand.nextInt(11) - 5;
            int dy = this.rand.nextInt(9) - 4;
            int dz = this.rand.nextInt(11) - 5;
            if (Math.abs(dx) >= 3 || Math.abs(dz) >= 3) {
                int tx = x + dx;
                int ty = y + dy;
                int tz = z + dz;
                double tpx = tx + 0.5D;
                double tpz = tz + 0.5D;
                if ((tpx - threatX) * (tpx - threatX) + (tpz - threatZ) * (tpz - threatZ) >= minSq
                        && ty >= 1 && this.world.isBlockLoaded(new BlockPos(tx, ty, tz))) {
                    int yy = ty;
                    while (!isSolid(tx, --yy, tz) && yy >= 1) {
                        // dig down (R196 :130-131)
                    }
                    if (yy >= 1) {
                        yy++;
                        IBlockState stand = this.world.getBlockState(new BlockPos(tx, yy, tz));
                        if (!stand.isNormalCube() && stand.getMaterial() != Material.WATER
                                && this.tryTeleportTo(tpx, yy, tpz, "evade")) {
                            // R196 :152-157 — re-lock within min(range, 24)
                            EntityPlayer player = this.world.getClosestPlayerToEntity(this, 24.0D);
                            if (player != null && player != this.getAttackTarget()) {
                                this.setAttackTarget(player);
                            }
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * R196 :161-181 — evasion damage face: fall/fire/poison sources never
     * trigger it; otherwise the counter is spent FIRST (D-S1 — even a fully
     * failed 64-attempt search consumes one), a success voids the damage.
     */
    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        boolean canEvade = true;
        if (source == DamageSource.FALL || source.isFireDamage() || source == DamageSource.MAGIC) {
            canEvade = false; // MAGIC = the 1.12 poison-damage carrier (register)
        }
        if (canEvade && this.numEvasions > 0) {
            this.numEvasions--;
            Entity src = source.getTrueSource();
            if (this.tryTeleportAwayFrom(src, 3.0D)) {
                return false;
            }
        }
        return super.attackEntityFrom(source, amount);
    }

    private boolean isSolid(int x, int y, int z) {
        return this.world.getBlockState(new BlockPos(x, y, z)).isNormalCube();
    }
}
