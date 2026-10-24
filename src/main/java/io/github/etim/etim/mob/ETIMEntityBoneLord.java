package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.monster.EntitySkeleton;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;

import java.util.List;

/**
 * R196 {@code EntityBoneLord} port (EntityBoneLord.java :1-242, one-hand).
 * Registered as {@code etim.bonelord} (id 6, {@link ETIMMobEntities});
 * RenderManager :71 reuse of RenderSkeleton maps to the vanilla
 * RenderSkeleton factory.
 *
 * <p>Judged faces (批文 §1.2/§1.3): follow 40 / speed 0.26F / attack 5.0 /
 * hp 20.0 / XP super×3 / per-chunk cap 1 / {@code num_troops_summoned} NBT
 * byte (write &gt; 0 only) / the full summon chain — persistence while
 * chasing a player (:79-81), the 20-tick summon window (:83-96), the
 * nearby-skeleton heal + frenzy + troop-despawn management (:98-128), and
 * {@code trySummonTroop} with its full guard chain (:133-241). The troop
 * class is fixed {@code EntitySkeleton} (T3① — AncientBoneLord/Longdead are
 * parked on the underworld batch). Gear rides the {@link ETIMMobEquip}
 * skeleton dispatch (B-M1 → the constant rusted-iron table).</p>
 */
public class ETIMEntityBoneLord extends EntitySkeleton {

    private int numTroopsSummoned;
    private boolean persistenceLogged;

    public ETIMEntityBoneLord(World world) {
        super(world);
    }

    @Override
    protected void applyEntityAttributes() {
        super.applyEntityAttributes();
        this.getEntityAttribute(SharedMonsterAttributes.FOLLOW_RANGE).setBaseValue(40.0D);
        this.getEntityAttribute(SharedMonsterAttributes.MOVEMENT_SPEED).setBaseValue(0.26D);
        this.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(5.0D);
        this.getEntityAttribute(SharedMonsterAttributes.MAX_HEALTH).setBaseValue(20.0D);
    }

    // R196 :62-64 getExperienceValue super×3.
    @Override
    protected int getExperiencePoints(net.minecraft.entity.player.EntityPlayer player) {
        return super.getExperiencePoints(player) * 3;
    }

    // R196 :48-59 — num_troops_summoned byte, written when > 0 only.
    @Override
    public void readEntityFromNBT(NBTTagCompound compound) {
        super.readEntityFromNBT(compound);
        this.numTroopsSummoned = compound.getByte("num_troops_summoned");
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound compound) {
        super.writeEntityToNBT(compound);
        if (this.numTroopsSummoned > 0) {
            compound.setByte("num_troops_summoned", (byte) this.numTroopsSummoned);
        }
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (this.world.isRemote) {
            return;
        }
        WorldServer w = (WorldServer) this.world;

        // :79-81 — persist while chasing a player (1:1: R196 gate
        // !isNoDespawnRequired() ↔ 1.12 EntityLiving.isNoDespawnRequired :1340,
        // func_110163_bv ↔ enablePersistence :1310, 终审 item 3).
        if (this.getAttackTarget() instanceof net.minecraft.entity.player.EntityPlayer
                && !this.isNoDespawnRequired()) {
            this.enablePersistence();
            if (ETIMConfig.mobDebugLog && !this.persistenceLogged) {
                this.persistenceLogged = true;
                ETIM.LOGGER.info("[AILog] bonelord persistence [server]");
            }
        }

        // :83-96 — the 20-tick summon window. getTicksExistedWithOffset →
        // 1.12 ticksExisted (C-6: the R196 spawn offset has no 1.12 carrier).
        if (this.ticksExisted % 20 == 0) {
            EntityLivingBase target = this.getAttackTarget();
            if (target != null
                    && (target.isDead || target.getHealth() <= 0.0F
                        || this.getDistance(target) > 16.0F
                        || !this.canEntityBeSeen(target))) {
                target = null;
            }

            if (this.numTroopsSummoned < 6
                    && target instanceof net.minecraft.entity.player.EntityPlayer
                    && this.rand.nextInt(8) < 7 - this.numTroopsSummoned) {
                this.numTroopsSummoned += this.trySummonTroop(w, target);
                if (this.numTroopsSummoned < 6 && this.rand.nextBoolean()) {
                    this.numTroopsSummoned += this.trySummonTroop(w, target);
                }
            }

            // :98-128 — nearby-skeleton management (heal + frenzy + troop
            // despawn). R196 canSeeEntity(this, true) → canEntityBeSeen (C 级:
            // the 2-arg projection face has no 1.12 carrier).
            List<EntitySkeleton> nearby = this.world.getEntitiesWithinAABB(
                    EntitySkeleton.class, this.getEntityBoundingBox().grow(16.0D, 8.0D, 16.0D));
            for (EntitySkeleton skeleton : nearby) {
                if (skeleton == this || skeleton.canEntityBeSeen(this)) {
                    if (skeleton.getHealth() < skeleton.getMaxHealth()) {
                        skeleton.heal(1.0F);
                    }
                    if (!(skeleton instanceof ETIMEntityBoneLord)) {
                        ETIMDigging.setFrenziedByBoneLord(skeleton, target);
                        // :109-124 — troop-despawn management. R196 reads the
                        // public despawn_counter; the ETIM port lives on the
                        // 1.12 idleTime face (the DespawnRules counter).
                        io.github.etim.etim.mixins.EntityLivingBaseAccessor acc =
                                (io.github.etim.etim.mixins.EntityLivingBaseAccessor) skeleton;
                        if (this.numTroopsSummoned > 0
                                && skeleton.getClass() == EntitySkeleton.class
                                && ((skeleton.getAttackTarget() == null
                                        && skeleton.getHealth() >= skeleton.getMaxHealth()
                                        && this.rand.nextFloat() < 0.05F)
                                    || acc.etim$getIdleTime() >= 0)) {
                            int saved = acc.etim$getIdleTime();
                            acc.etim$setIdleTime(Integer.MAX_VALUE);
                            if (DespawnRules.canDespawn(skeleton)) {
                                DespawnRules.tryDespawn(skeleton);
                                if (skeleton.isDead) {
                                    this.numTroopsSummoned--;
                                } else {
                                    acc.etim$setIdleTime(saved);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * R196 :133-241 {@code trySummonTroop} — outer attempt loop
     * (48 − num×8 helper calls) × inner 16-attempt placement
     * (WorldServer :300-355, 终审 item 6 钉值). The troop equip face rides
     * the pending-type handoff in {@link ETIMMobEquip} so the spawned
     * skeleton's own onInitialSpawn (→ setEquipmentBasedOnDifficulty → the
     * mixin → {@code skeletonEquip}) picks the rolled type up.
     */
    private int trySummonTroop(WorldServer w, EntityLivingBase target) {
        int boneLordX = MathHelper.floor(this.posX);
        int boneLordY = MathHelper.floor(this.posY + 1.0E-4F); // R196 getFootBlockPosY
        int boneLordZ = MathHelper.floor(this.posZ);
        int targetX = MathHelper.floor(target.posX);
        int targetY = MathHelper.floor(target.posY + 1.0E-4F);
        int targetZ = MathHelper.floor(target.posZ);
        Vec3d boneLordLegPos = footPosPlusFractionOfHeight(0.25F);
        Vec3d boneLordHeadPos = footPosPlusFractionOfHeight(0.75F);
        int maxNumAttempts = 48 - this.numTroopsSummoned * 8;
        int attempts = 0;

        EntitySkeleton skeleton;
        while (true) {
            if (attempts >= maxNumAttempts) {
                return 0;
            }

            skeleton = createSkeletonCloseTo(w, boneLordX, boneLordY, boneLordZ);
            if (skeleton != null) {
                // :155-156 — the forced type roll (nether 1 / 0.25 melee 2 /
                // else archer 0); handed to the equip face via the pending map.
                int skeletonType = randomSkeletonType(w);
                ETIMMobEquip.setPendingTroopType(skeleton, skeletonType);
                // :157 — a vulnerable player within 4 of the troop rejects.
                if (w.getNearestAttackablePlayer(skeleton, 4.0D, 4.0D) == null
                        && (skeletonType != 0 || skeleton.canEntityBeSeen(target))) {
                    double distanceSqToSummoner = skeleton.getDistanceSq(this);

                    // :160-165 — a player closer to the troop than the lord rejects.
                    boolean playerCloser = false;
                    for (net.minecraft.entity.player.EntityPlayer player : w.playerEntities) {
                        if (!(player.getHealth() <= 0.0F)
                                && skeleton.getDistanceSq(player) < distanceSqToSummoner) {
                            playerCloser = true;
                            break;
                        }
                    }

                    // :168-228 — LOS ray to the lord (leg 0.25H / head 0.75H,
                    // 16² range) or a path whose final point lands ≤ 2 from the
                    // lord; type 2 also needs a path ≤ 2 to the target.
                    if (!playerCloser && rayOrPathToSummoner(w, skeleton, boneLordX, boneLordY, boneLordZ,
                            boneLordLegPos, boneLordHeadPos)) {
                        if (skeletonType == 0 || skeletonType != 2) {
                            return accept(w, skeleton, target);
                        }
                        if (pathFinalWithin(w, skeleton, targetX, targetY, targetZ)) {
                            return accept(w, skeleton, target);
                        }
                    }
                }
            }
            attempts++;
        }
    }

    /** :235-240 — the success face; entityFX(EnumEntityFX.summoned) dropped (C-2). */
    private int accept(WorldServer w, EntitySkeleton skeleton, EntityLivingBase target) {
        DespawnRules.refreshSummoned(skeleton, -9600);
        w.spawnEntity(skeleton);
        skeleton.onInitialSpawn(w.getDifficultyForLocation(new BlockPos(skeleton)), null);
        skeleton.setAttackTarget(target);
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] bonelord summon entity=" + skeleton.getName()
                    + " at " + MathHelper.floor(skeleton.posX) + "," + MathHelper.floor(skeleton.posY)
                    + "," + MathHelper.floor(skeleton.posZ) + " num=" + (this.numTroopsSummoned + 1) + " [server]");
        }
        return 1;
    }

    /**
     * WorldServer :300-355 — the 16-attempt placement. isAirOrPassableBlock
     * → the 1.12 material face (World.java :5634 body); skeleton 特门 =
     * shallow water counts passable + getCanSpawnHere skipped (is_skeleton).
     * The R196 RNG tables map to nextInt draws; blockExists → isBlockLoaded;
     * canCreatureTypeSpawnAtLocation uses the ON_GROUND placement type and
     * the R196 resulting-y out-param collapses to the trial y (C 级).
     */
    private EntitySkeleton createSkeletonCloseTo(WorldServer w, int x, int y, int z) {
        int minDistanceSq = 2 * 2;
        int maxDistanceSq = 12 * 12;
        for (int attempt = 0; attempt < 16; attempt++) {
            int dx = this.rand.nextInt(12 * 2 + 1) - 12;
            int dy = this.rand.nextInt(7) - 3;
            int dz = this.rand.nextInt(12 * 2 + 1) - 12;
            int trialX = x + dx;
            int trialY = y + dy;
            int trialZ = z + dz;

            // :309-316 — sink (the block below stays air/passable) then rise.
            for (int i = 0; i < 8 && isAirOrPassable(w, trialX, trialY - 1, trialZ, true); i++) {
                trialY--;
            }
            for (int i = 0; i < 8 && !isAirOrPassable(w, trialX, trialY, trialZ, true); i++) {
                trialY++;
            }

            double distanceSq = (double) (dx * dx + (trialY - y) * (trialY - y) + dz * dz);
            if (distanceSq >= (double) minDistanceSq && distanceSq <= (double) maxDistanceSq
                    && w.isBlockLoaded(new BlockPos(trialX, trialY - 1, trialZ))
                    && w.isBlockLoaded(new BlockPos(trialX, trialY, trialZ))
                    && w.isBlockLoaded(new BlockPos(trialX, trialY + 1, trialZ))
                    && !isAirOrPassable(w, trialX, trialY - 1, trialZ, true)
                    && isAirOrPassable(w, trialX, trialY, trialZ, true)
                    && isAirOrPassable(w, trialX, trialY + 1, trialZ, false)
                    && net.minecraft.world.WorldEntitySpawner.canCreatureTypeSpawnAtLocation(
                            net.minecraft.entity.EntityLiving.SpawnPlacementType.ON_GROUND, w,
                            new BlockPos(trialX, trialY, trialZ))) {
                EntitySkeleton skeleton = new EntitySkeleton(w); // troop class fixed (T3①)
                skeleton.setLocationAndAngles(trialX + 0.5D, trialY, trialZ + 0.5D,
                        this.rand.nextFloat() * 360.0F, 0.0F);
                return skeleton; // is_skeleton → getCanSpawnHere skipped (R196 :346-347)
            }
        }
        return null;
    }

    /**
     * R196 World.isAirOrPassableBlock (World.java :5634-5654): loaded chunk
     * gate, air, liquid gate by flag, else not-solid (the entity-collision
     * material face).
     */
    private static boolean isAirOrPassable(WorldServer w, int x, int y, int z, boolean includeLiquid) {
        if (y < 0 || y > 255) {
            return true;
        }
        BlockPos pos = new BlockPos(x, y, z);
        if (!w.isBlockLoaded(pos)) {
            return false;
        }
        net.minecraft.block.state.IBlockState state = w.getBlockState(pos);
        if (state.getBlock().isAir(state, w, pos)) {
            return true;
        }
        if (!includeLiquid && state.getMaterial().isLiquid()) {
            return false;
        }
        return !state.getMaterial().blocksMovement();
    }

    /** :171-201 — eye ray to the lord within 16², else a path final ≤ 2. */
    private boolean rayOrPathToSummoner(WorldServer w, EntitySkeleton skeleton,
            int bx, int by, int bz, Vec3d legPos, Vec3d headPos) {
        Vec3d eyePos = new Vec3d(skeleton.posX, skeleton.posY + skeleton.getEyeHeight(), skeleton.posZ);
        boolean canRay = eyePos.squareDistanceTo(legPos) < 256.0D
                && w.rayTraceBlocks(eyePos, legPos, false, true, false) == null; // 终审 item 5 对位
        if (!canRay) {
            canRay = eyePos.squareDistanceTo(headPos) < 256.0D
                    && w.rayTraceBlocks(eyePos, headPos, false, true, false) == null;
        }
        if (canRay) {
            return true;
        }
        return pathFinalWithin(w, skeleton, bx, by, bz);
    }

    /**
     * :177-199 — the path-final gate. R196 getEntityPathToXYZ(..., 16.0F,
     * openDoors, ...) → the 1.12 navigator face (the 16F range and the
     * open-doors/avoid-water/swim flags ride the skeleton's own navigator
     * config — C 级 mapping).
     */
    private static boolean pathFinalWithin(WorldServer w, EntitySkeleton skeleton, int x, int y, int z) {
        net.minecraft.pathfinding.Path path = skeleton.getNavigator()
                .getPathToPos(new BlockPos(x, y, z));
        if (path == null) {
            return false;
        }
        net.minecraft.pathfinding.PathPoint finalPoint = path.getFinalPathPoint();
        if (finalPoint == null) {
            return false;
        }
        int ddx = finalPoint.x - x;
        int ddy = finalPoint.y - y;
        int ddz = finalPoint.z - z;
        return (double) (ddx * ddx + ddy * ddy + ddz * ddz) <= 2.0D;
    }

    /** R196 :209-216 getRandomSkeletonType — nether 1 / else 0.25 melee 2. */
    private int randomSkeletonType(WorldServer w) {
        if (w.provider.isNether()) {
            return 1;
        }
        return this.rand.nextFloat() < 0.25F ? 2 : 0;
    }

    /** R196 :140-141 getFootPosPlusFractionOfHeight. */
    private Vec3d footPosPlusFractionOfHeight(float fraction) {
        return new Vec3d(this.posX, this.posY + this.height * (double) fraction, this.posZ);
    }
}
