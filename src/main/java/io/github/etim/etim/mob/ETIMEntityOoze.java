package io.github.etim.etim.mob;

import net.minecraft.entity.monster.EntitySlime;
import net.minecraft.entity.projectile.EntitySnowball;
import net.minecraft.init.Items;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.DamageSource;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.EnumDifficulty;
import net.minecraft.world.EnumSkyBlock;
import net.minecraft.world.World;
import net.minecraft.world.storage.loot.LootTableList;

import javax.annotation.Nullable;
import java.util.HashMap;
import java.util.Map;

/**
 * B-44 census A :90 — the R196 ooze (EntityOoze.java:3-77), minimal
 * end-to-end carrier on the 1.12 EntitySlime chassis.
 *
 * <p>Judged faces carried here: size clamp (R196 setSize(size &lt; 2 ? size : 2)),
 * health 1 / attack 3 / XP 4 at size 1, slimeball drop, lava/magic/snowball-only
 * damage immunity (R196 isImmuneTo), climbing flag and the simplified
 * block-dissolve face (the full EntityGelatinousCube dissolving table is a
 * later face, see playground/audit/miningooze-立项摸底.md D-1/C-1).</p>
 */
public class ETIMEntityOoze extends EntitySlime {

    /** R196 EntityOoze.isOnLadder reads the climbing data byte. */
    private boolean climbing;

    /** Simplified EntityGelatinousCube progress: pos -> accumulated size-ticks. */
    private final Map<BlockPos, Integer> dissolveProgress = new HashMap<BlockPos, Integer>();

    public ETIMEntityOoze(World world) {
        super(world);
        this.setSlimeSize(1, true);
        this.experienceValue = 4;
    }

    /**
     * B-52b A-level fix (W-B52b): do NOT call {@code super.getCanSpawnHere()}.
     * EntitySlime's body rejects every non-slime-chunk column through its
     * {@code rand.nextInt(10) == 0 && chunk seed == 0} coin, so the old body
     * made natural ooze spawns impossible. Copy EntityMob's chain explicitly:
     * peaceful gate, its light test, then EntityLiving's
     * {@code below.canEntitySpawn(this)} body. Collision/liquid are checked by
     * the spawner's {@code isNotColliding()} right after this call.
     */
    @Override
    public boolean getCanSpawnHere() {
        if (this.world.getDifficulty() == EnumDifficulty.PEACEFUL) {
            return false;
        }
        if (!this.isValidOozeLightLevel()) {
            return false;
        }
        BlockPos below = new BlockPos(this).down();
        return this.world.getBlockState(below).canEntitySpawn(this);
    }

    /** EntityMob.isValidLightLevel body, copied because EntitySlime is not an EntityMob. */
    private boolean isValidOozeLightLevel() {
        BlockPos pos = new BlockPos(this.posX, this.getEntityBoundingBox().minY, this.posZ);
        if (this.world.getLightFor(EnumSkyBlock.SKY, pos) > this.rand.nextInt(32)) {
            return false;
        }
        int light = this.world.getLightFromNeighbors(pos);
        if (this.world.isThundering()) {
            int previous = this.world.getSkylightSubtracted();
            this.world.setSkylightSubtracted(10);
            light = this.world.getLightFromNeighbors(pos);
            this.world.setSkylightSubtracted(previous);
        }
        return light <= this.rand.nextInt(8);
    }

    /** R196 setSize(size &lt; 2 ? size : 2); also keeps the size-1 XP row. */
    @Override
    protected void setSlimeSize(int size, boolean resetHealth) {
        super.setSlimeSize(Math.max(1, Math.min(size, 2)), resetHealth);
        this.experienceValue = 4;
    }

    /** Public wrapper for the mining-spawn path (R196 calls setSize(1)). */
    public void setOozeSize(int size) {
        this.setSlimeSize(size, true);
    }

    @Override
    protected EntitySlime createInstance() {
        return new ETIMEntityOoze(this.world);
    }

    /** R196 EntityCubic.getAttackStrength = size * multiplier(3). */
    @Override
    protected int getAttackStrength() {
        return this.getSlimeSize() * 3;
    }

    /** R196 ooze damages at size 1 too (vanilla small slime does not). */
    @Override
    protected boolean canDamagePlayer() {
        return true;
    }

    /** R196 size-1 drop = slimeball; the vanilla slime loot table is suppressed. */
    @Override
    protected void dropFewItems(boolean wasRecentlyHit, int lootingModifier) {
        this.dropItem(Items.SLIME_BALL, 1);
    }

    @Override
    @Nullable
    protected ResourceLocation getLootTable() {
        return LootTableList.EMPTY;
    }

    /** R196 getSoundVolume = 0.2 * size. */
    @Override
    protected float getSoundVolume() {
        return 0.2F * (float) this.getSlimeSize();
    }

    /**
     * R196 isImmuneTo: only lava, magic and snowballs get through. Everything
     * else (melee, arrows, fire, cacti) is rejected before vanilla damage.
     */
    @Override
    public boolean attackEntityFrom(DamageSource source, float amount) {
        boolean allowed = source == DamageSource.LAVA
                || source.isMagicDamage()
                || source.getImmediateSource() instanceof EntitySnowball;
        if (!allowed) {
            return false;
        }
        return super.attackEntityFrom(source, amount);
    }

    @Override
    public void onUpdate() {
        super.onUpdate();
        if (!this.world.isRemote) {
            this.climbing = this.collidedHorizontally;
        }
    }

    /** R196 EntityOoze.isOnLadder reads the climbing flag. */
    @Override
    public boolean isOnLadder() {
        return this.climbing;
    }

    @Override
    public void onLivingUpdate() {
        super.onLivingUpdate();
        if (this.world.isRemote) {
            return;
        }
        // R196 getClimbingSpeed = 0.2; the 1.12 slime move helper does not
        // consult isOnLadder, so the motion face is applied here (D-7/C-6).
        if (this.climbing && this.moveForward != 0.0F) {
            this.motionY = 0.2D;
        }
        if (this.ticksExisted % 20 == 0) {
            this.dissolveTouchingBlocks();
        }
    }

    /**
     * Simplified EntityGelatinousCube dissolving table: every 20 ticks each
     * touched solid block gains size points; at max(20, hardness*20) it is
     * removed without drops. Full MITE dissolve-period/acid/item faces are
     * deferred (C-1).
     */
    private void dissolveTouchingBlocks() {
        AxisAlignedBB box = this.getEntityBoundingBox().grow(0.05D);
        int minX = MathHelper.floor(box.minX);
        int minY = MathHelper.floor(box.minY);
        int minZ = MathHelper.floor(box.minZ);
        int maxX = MathHelper.ceil(box.maxX) - 1;
        int maxY = MathHelper.ceil(box.maxY) - 1;
        int maxZ = MathHelper.ceil(box.maxZ) - 1;
        Map<BlockPos, Integer> next = new HashMap<BlockPos, Integer>();
        for (int x = minX; x <= maxX; x++) {
            for (int y = minY; y <= maxY; y++) {
                for (int z = minZ; z <= maxZ; z++) {
                    BlockPos pos = new BlockPos(x, y, z);
                    net.minecraft.block.state.IBlockState state = this.world.getBlockState(pos);
                    if (!state.getMaterial().blocksMovement() || state.getMaterial().isLiquid()) {
                        continue;
                    }
                    float hardness = state.getBlockHardness(this.world, pos);
                    if (hardness < 0.0F) {
                        continue;
                    }
                    Integer old = this.dissolveProgress.get(pos);
                    int progress = (old == null ? 0 : old.intValue()) + this.getSlimeSize();
                    int need = Math.max(20, (int) (hardness * 20.0F));
                    if (progress >= need) {
                        this.world.destroyBlock(pos, false);
                    } else {
                        next.put(pos, Integer.valueOf(progress));
                    }
                }
            }
        }
        this.dissolveProgress.clear();
        this.dissolveProgress.putAll(next);
    }

    @Override
    public void writeEntityToNBT(NBTTagCompound compound) {
        super.writeEntityToNBT(compound);
        compound.setBoolean("EtimClimbing", this.climbing);
    }

    @Override
    public void readEntityFromNBT(NBTTagCompound compound) {
        super.readEntityFromNBT(compound);
        this.climbing = compound.getBoolean("EtimClimbing");
        this.experienceValue = 4;
    }
}
