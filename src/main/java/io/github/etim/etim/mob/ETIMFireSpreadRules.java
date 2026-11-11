package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.block.BlockFire;
import net.minecraft.block.BlockIce;
import net.minecraft.block.BlockSnow;
import net.minecraft.block.BlockSnowBlock;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.monster.EntityMagmaCube;
import net.minecraft.entity.item.EntityTNTPrimed;
import net.minecraft.init.Blocks;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

import java.util.Random;

/**
 * B-33 — the R196 entity-fire machinery, verbatim (摸底正本
 * {@code playground/audit/movetotree-立项摸底.md} §3). Three faces:
 *
 * <ul>
 *   <li><b>the spread loop</b> — R196 {@code Entity.java:566-603}, server
 *       tick, positioned in R196 between {@code setFlag(0, fire>0)} and
 *       {@code firstUpdate=false}; the ETIM carrier is a 1.12
 *       {@code Entity.onUpdate} TAIL injection (the 摸底 §3 mapping —
 *       position drift is C-level). Chance ladder: MagmaCube 0.04 (kept,
 *       user裁定 ②全机制); the FireElemental 0.05 / EarthElemental 0.04
 *       branches have no 1.12 carrier and stay MITE-only; burning living
 *       entities roll 0.01 while the countdown is armed, else 0.00125. The
 *       winner then sweeps {@code fire_height = (int)height + 1} layers:
 *       air blocks light up ({@code nextInt(10)} guard + six-neighbour
 *       burnability) or — at ground contact — MELT the resting block; a
 *       non-air block that fails to catch is melted too.</li>
 *   <li><b>the catch face</b> — R196 {@code BlockFire.tryToCatchBlockOnFire
 *       :197-220}, boolean return kept (the vanilla 1.12
 *       {@code tryCatchFire :295-324} is private void — the return drives
 *       the melt decision, so the R196 body is re-transcribed here).
 *       Flammability = {@code block.getFlammability(world, pos, UP)} (the
 *       R196 {@code abilityToCatchFire[blockId]} carrier); the rain gate is
 *       1.12 {@code isRainingAt(pos)} (the R196
 *       {@code !canLightningStrikeAt} carrier); the TNT branch primes with
 *       fuse 1 (R196 {@code primeTnt(..., 1, null)} — the vanilla
 *       constructor defaults 80, so the fuse is set explicitly).</li>
 *   <li><b>the melt face</b> — R196 {@code World.tryToMeltBlock :6439-6442}
 *       ({@code block.melt(world,x,y,z)}, default false per R196
 *       {@code Block.java:3137}). 1.12 blocks have no melt method — the
 *       table is carried here: ice → water (the R196 {@code waterMoving}
 *       carrier = 1.12 {@code BlockIce.turnIntoWater}'s
 *       {@code Blocks.WATER.getDefaultState()}, minus the drop/vaporize
 *       faces MITE's bare {@code setBlock} doesn't have); snow layers →
 *       one layer down or air (R196 {@code BlockSnow.melt :80-83}); full
 *       snow block → the 7-layer snow (R196
 *       {@code BlockSnowBlock.melt :15} sets the snow-layer meta 6, and
 *       1.12 meta 6 ≡ {@code LAYERS 7}). No {@code canMelt} gate — the
 *       R196 melt body doesn't check it (that's an updateTick face).</li>
 * </ul>
 *
 * <p>Flag face: every branch here is R196-only behaviour (vanilla 1.12
 * burning entities do not spread fire), so the whole ruleset rides
 * <b>livestockNeedsR196</b> — the mixins gate the entry points, the helpers
 * re-check nothing.</p>
 *
 * <p>Judge rows ({@code mobDebugLog} gated, the B-31 family shape):
 * {@code [FireLog] roll chance=… win=… burning=… countdown=… entity=…} — one
 * per roll (the W2 rate instrument: 0.01 vs 0.00125 per-tick branches),
 * {@code [FireLog] ignite x=… y=… z=… src=air|catch age=…} — one per fire
 * block placed, {@code [FireLog] melt x=… y=… z=… block=…} — one per melted
 * block, and {@code [FireLog] countdown set=… entity=…} — one per AI arm.</p>
 */
public final class ETIMFireSpreadRules {

    private ETIMFireSpreadRules() {
    }

    /**
     * R196 {@code EntityAIMoveToTree :65} consumer — arms the countdown on
     * the burning chaser.
     */
    public static void setCountdown(EntityLiving living, int value) {
        if (ETIMFireCountdownDuck.carries(living)) {
            ((ETIMFireCountdownDuck) (Object) living).etim$setIncreasedChanceOfSpreadingFireCountdown(value);
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[FireLog] countdown set=" + value
                        + " entity=" + living.getClass().getSimpleName() + "#" + living.getEntityId());
            }
        }
    }

    /**
     * R196 {@code Entity.java:566-603} verbatim (the Entity.onUpdate TAIL
     * carrier). Entry guards: the family flag, then the R196
     * {@code !isRemote} block.
     */
    public static void spreadFireFromEntity(Entity entity) {
        if (!ETIMConfig.livestockNeedsR196) {
            return;
        }
        World world = entity.world;
        if (world == null || world.isRemote) {
            return;
        }
        float chanceToSetSurroundingsOnFire;
        if (entity instanceof EntityMagmaCube) { // the R196 0.04 branch, kept (裁定②)
            chanceToSetSurroundingsOnFire = 0.04F;
        } else if (entity instanceof EntityLivingBase && ((EntityLivingBase) entity).isBurning()) {
            chanceToSetSurroundingsOnFire = entity instanceof EntityLiving
                    && ETIMFireCountdownDuck.carries((EntityLiving) entity)
                    && ((ETIMFireCountdownDuck) (Object) entity).etim$getIncreasedChanceOfSpreadingFireCountdown() > 0
                    ? 0.01F
                    : 0.00125F;
        } else {
            chanceToSetSurroundingsOnFire = 0.0F;
        }

        boolean chanceWinner = false;
        if (chanceToSetSurroundingsOnFire > 0.0F) {
            chanceWinner = ((EntityLivingBase) entity).getRNG().nextFloat() < chanceToSetSurroundingsOnFire;
            if (ETIMConfig.mobDebugLog) {
                int countdownState = entity instanceof EntityLiving && ETIMFireCountdownDuck.carries((EntityLiving) entity)
                        ? ((ETIMFireCountdownDuck) (Object) entity).etim$getIncreasedChanceOfSpreadingFireCountdown()
                        : 0;
                ETIM.LOGGER.info("[FireLog] roll chance=" + chanceToSetSurroundingsOnFire
                        + " win=" + chanceWinner
                        + " burning=" + (entity instanceof EntityLivingBase && ((EntityLivingBase) entity).isBurning())
                        + " countdown=" + countdownState
                        + " entity=" + entity.getClass().getSimpleName() + "#" + entity.getEntityId());
            }
        }
        if (!chanceWinner) {
            return;
        }
        int x = MathHelper.floor(entity.posX);
        int y = MathHelper.floor(entity.posY);
        int z = MathHelper.floor(entity.posZ);
        int fireHeight = (int) entity.height + 1;
        Random rand = ((EntityLivingBase) entity).getRNG();

        for (int dy = 0; dy < fireHeight; dy++) {
            BlockPos pos = new BlockPos(x, y + dy, z);
            if (world.isAirBlock(pos)) {
                if (rand.nextInt(10) == 0 && canNeighborBurn(world, pos)) {
                    world.setBlockState(pos, Blocks.FIRE.getDefaultState(), 3);
                    if (ETIMConfig.mobDebugLog) {
                        ETIM.LOGGER.info("[FireLog] ignite x=" + pos.getX() + " y=" + pos.getY() + " z=" + pos.getZ() + " src=air");
                    }
                } else if (dy == 0) {
                    BlockPos resting = restingBlockOf(entity);
                    if (resting != null) {
                        tryToMeltBlock(world, resting);
                    }
                }
            } else if (!tryToCatchBlockOnFire(world, pos, rand, 100, 1)) {
                tryToMeltBlock(world, pos);
            }
        }
    }

    /**
     * R196 {@code getBlockRestingOn(0.1F)} — the 1.12 carrier has no
     * resting-block probe; the 摸底 §3 C-level mapping is
     * {@code floor(minY) - 1} (the block the AABB rests on).
     */
    private static BlockPos restingBlockOf(Entity entity) {
        return new BlockPos(
                MathHelper.floor(entity.posX),
                MathHelper.floor(entity.getEntityBoundingBox().minY) - 1,
                MathHelper.floor(entity.posZ));
    }

    /**
     * R196 {@code BlockFire.tryToCatchBlockOnFire :197-220} verbatim —
     * boolean return kept (drives the melt decision).
     */
    public static boolean tryToCatchBlockOnFire(World world, BlockPos pos, Random rand, int chanceDivisor, int age) {
        IBlockState state = world.getBlockState(pos);
        Block block = state.getBlock();
        int abilityToCatchFire = block.getFlammability(world, pos, EnumFacing.UP);
        if (rand.nextInt(chanceDivisor) < abilityToCatchFire) {
            boolean wasTnt = block == Blocks.TNT;
            if (rand.nextInt(age + 10) < 5 && !world.isRainingAt(pos)) {
                int newAge = age + rand.nextInt(5) / 4;
                if (newAge > 15) {
                    newAge = 15;
                }
                world.setBlockState(pos, Blocks.FIRE.getDefaultState().withProperty(BlockFire.AGE, newAge), 3);
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[FireLog] ignite x=" + pos.getX() + " y=" + pos.getY() + " z=" + pos.getZ()
                            + " src=catch age=" + newAge);
                }
            } else {
                world.setBlockToAir(pos);
            }

            if (wasTnt) {
                // R196 BlockTNT.primeTnt(world, x, y, z, 1, null) — fuse 1
                EntityTNTPrimed tnt = new EntityTNTPrimed(world,
                        pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5, null);
                tnt.setFuse(1);
                world.spawnEntity(tnt);
            }

            return true;
        }
        return false;
    }

    /**
     * R196 {@code BlockFire.canNeighborBurn :222-238} — six neighbours in
     * the R196 order (+x, -x, -y, +y, -z, +z) via the faceless
     * {@code canCatchFire} (the R196 {@code canBlockCatchFire} carrier:
     * netherrack-or-encouragement; 1.12 folds netherrack into its spread
     * speed table — C-note).
     */
    public static boolean canNeighborBurn(World world, BlockPos pos) {
        BlockFire fire = (BlockFire) Blocks.FIRE;
        return fire.canCatchFire(world, pos.east(), EnumFacing.WEST)
                || fire.canCatchFire(world, pos.west(), EnumFacing.EAST)
                || fire.canCatchFire(world, pos.down(), EnumFacing.UP)
                || fire.canCatchFire(world, pos.up(), EnumFacing.DOWN)
                || fire.canCatchFire(world, pos.north(), EnumFacing.SOUTH)
                || fire.canCatchFire(world, pos.south(), EnumFacing.NORTH);
    }

    /**
     * R196 {@code World.tryToMeltBlock :6439-6442} + the melt table (see
     * class doc for the per-block carriers).
     */
    public static boolean tryToMeltBlock(World world, BlockPos pos) {
        IBlockState state = world.getBlockState(pos);
        Block block = state.getBlock();
        boolean melted;
        if (block instanceof BlockIce) {
            melted = world.setBlockState(pos, Blocks.WATER.getDefaultState());
        } else if (block instanceof BlockSnowBlock) {
            // R196 :15 — the full block melts into 7 snow layers (meta 6)
            melted = world.setBlockState(pos,
                    Blocks.SNOW_LAYER.getDefaultState().withProperty(BlockSnow.LAYERS, 7), 3);
        } else if (block instanceof BlockSnow) {
            int layers = state.getValue(BlockSnow.LAYERS);
            melted = layers <= 1
                    ? world.setBlockToAir(pos)
                    : world.setBlockState(pos, state.withProperty(BlockSnow.LAYERS, layers - 1), 3);
        } else {
            melted = false;
        }
        if (melted && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[FireLog] melt x=" + pos.getX() + " y=" + pos.getY() + " z=" + pos.getZ()
                    + " block=" + block.getRegistryName());
        }
        return melted;
    }
}
