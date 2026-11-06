package io.github.etim.etim.farm;

import java.util.Random;

import net.minecraft.block.Block;
import net.minecraft.block.BlockCrops;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraft.world.biome.Biome;
import net.minecraft.block.properties.PropertyBool;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMMoonState;

/**
 * blight batch (B-13): the R196 {@code BlockCrops :75-114} blight family,
 * verbatim. 三臂 ţ
 * <ul>
 *   <li><b>F-A blighted 态臂</b> :75-98 — 1/64 death dice (dead-crop swap,
 *       {@code mature ? growth-1 : growth}, flag 3), then a 1/2 discard dice,
 *       then the ±1 neighbor spread dice;</li>
 *   <li><b>F-B blood moon</b> :100-107 — {@code isBloodMoonNight && !blighted
 *       && nextFloat()<0.25 && !isDedicatedServer && (!opaqueAbove ||
 *       outdoors)} → set bit, return true (hits BEFORE the low-light dice);</li>
 *   <li><b>F-C low-light dice</b> :109-114 — {@code nextFloat() <
 *       5.0E-4F * biomeMod * (1 - blv/16F)} → set bit.</li>
 * </ul>
 *
 * <p><b>_ordine red line (growth-rate 摸底 :29/:71 两案)</b>: the blight arm
 * runs BEFORE the B-9 light-window freeze face — MixinBlockCropsTick fires it
 * after the dry branch and the blight arm owns its own else-if chain inside
 * the gate; it never rides the light/temp freeze cancel domain.</p>
 *
 * <p>Judgment source anchors: R196 {@code BlockCrops.updateTick :59-135},
 * {@code chanceOfBlightPerRandomTick :263-265 = 5.0E-4F},
 * {@code getBlightBit :267-269 = bit 8},
 * {@code getBlightChanceModifierForBiome :137-149}.</p>
 */
public final class ETIMBlight {

    /** R196 :263-265 — the constant low-light blight rate. */
    public static final float CHANCE_OF_BLIGHT_PER_RANDOM_TICK = 5.0E-4F;
    /** R196 :102 — the blood-moon 25% face (NBT-free, in-code value). */
    public static final float BLOOD_MOON_BLIGHT_CHANCE = 0.25F;

    /**
     * The blight metadata bit, shared with the MixinBlockCrops state
     * mapping. R196 {@code getBlightBit :267-269} = bit 8 — the 1.12 AGE
     * property occupies only 0..7, so bit 8 rides the raw metadata byte
     * byte-for-byte identically to R196.
     *
     * <p><b>NOT {@code PropertyBool.create("blighted")}</b>: vanilla 1.12
     * {@code PropertyBool.getAllowedValues()} returns
     * {@code ImmutableSet.of(true, false)} — TRUE first — so the Cartesian
     * enumeration of a container {@code [AGE, BLIGHTED]} seeds
     * {@code validStates[0]} = age0+blighted=TRUE, and
     * {@code getBaseState()} (BlockStateContainer.java:145) hands that to
     * {@code getDefaultState()}: every vanilla {@code withAge(i)} write
     * would then carry bit 8 (the arena meta-13/14 growth-mystery root).
     * The subclass flips the order so the base state is blighted=FALSE.</p>
     */
    public static final PropertyBool BLIGHTED = new PropertyBool("blighted") {
        @Override
        public java.util.Collection<Boolean> getAllowedValues() {
            return com.google.common.collect.ImmutableSet.of(Boolean.FALSE, Boolean.TRUE);
        }
    };

    private ETIMBlight() {
    }

    /** R196 family seat: wheat/carrot/onion/potato (onion has no 1.12
     *  carrier); beetroot self-owns its state container and R196 has no
     *  beetroot — excluded (摸底 C-13-2); Stem carries no blight face. */
    public static boolean isBlightSeat(Block block) {
        return block == Blocks.WHEAT || block == Blocks.CARROTS || block == Blocks.POTATOES;
    }

    public static boolean isBlighted(IBlockState state) {
        return state.getBlock() instanceof BlockCrops
                && state.getProperties().containsKey(BLIGHTED)
                && ((java.lang.Boolean) state.getProperties().get(BLIGHTED)).booleanValue();
    }

    private static int ageOf(IBlockState state) {
        return ((java.lang.Integer) state.getValue(BlockCrops.AGE)).intValue();
    }

    /**
     * One candidate blight evaluation for a corporate random tick. Returns
     * {@code true} when the tick is CONSUMED (R196 returned before the
     * growth arm) — the caller cancels the vanilla body in that case.
     * Called server-side only (the mixin gates {@code !isRemote}).
     */
    public static boolean blightTickArm(World world, BlockPos pos, IBlockState state, Random rand) {
        if (!ETIMConfig.blightR196 || !isBlightSeat(state.getBlock())) {
            return false;
        }

        if (isBlighted(state)) {
            // ---- F-A :75-98 (the blighted-state arm consumes the tick) ----
            int age = ageOf(state);
            // :76-78 — 1/64 death dice
            if (rand.nextInt(64) == 0) {
                int growth = age >= 7 ? 6 : age; // isMature ? getGrowth-1 : getGrowth
                world.setBlockState(pos, ETIMBlockDeadPlant.DEAD_CROP.getDefaultState()
                        .withProperty(BlockCrops.AGE, Integer.valueOf(growth)), 3);
                ETIMFarm.row("blight src=dead1of64 block=" + name(state.getBlock())
                        + " age=" + age + " ->dead age=" + growth
                        + " pos=" + key(pos));
                return true;
            }
            // :80-82 — 1/2 discard
            if (rand.nextBoolean()) {
                return true;
            }
            // :84-96 — ±1 neighbor spread (dy included verbatim)
            int dx = rand.nextInt(3) - 1;
            int dy = rand.nextInt(3) - 1;
            int dz = rand.nextInt(3) - 1;
            if ((dx != 0 || dy != 0 || dz != 0) && world.isBlockLoaded(pos.add(dx, dy, dz))) {
                BlockPos t = pos.add(dx, dy, dz);
                IBlockState ts = world.getBlockState(t);
                if (isBlightSeat(ts.getBlock()) && !isBlighted(ts)) {
                    world.setBlockState(t, ts.withProperty(BLIGHTED, java.lang.Boolean.TRUE), 2);
                    ETIMFarm.row("blight src=spread dx=" + dx + " dy=" + dy + " dz=" + dz
                            + " from=" + key(pos) + " to=" + key(t)
                            + " dstAge=" + ageOf(ts));
                }
            }
            return true; // :98 — the arm always owns the tick
        }

        // ---- F-B :100-107 — blood moon (dice BEFORE the light checks) ----
        if (world instanceof WorldServer
                && ETIMMoonState.phase((WorldServer) world) == ETIMMoonState.Phase.BLOOD
                && rand.nextFloat() < BLOOD_MOON_BLIGHT_CHANCE
                && !world.getMinecraftServer().isDedicatedServer()
                && (!hasStandardFormOpaqueBlockAbove(world, pos) || isOutdoors(world, pos))) {
            if (setBlighted(state.getBlock(), world, pos, state, true, "bloodMoon")) {
                return true;
            }
        }

        // ---- F-C :109-114 — the low-light dice ----
        float blv = world.getLightFromNeighbors(pos.up());
        float biomeMod = getBlightChanceModifierForBiome(world.getBiome(pos));
        float p = CHANCE_OF_BLIGHT_PER_RANDOM_TICK * biomeMod * (1.0F - blv / 16.0F);
        if (rand.nextFloat() < p) {
            setBlighted(state.getBlock(), world, pos, state, true, "lowLight");
            return true;
        }
        return false; // fall through: vanilla growth arm (B-9 face) — R196 :115 else-if
    }

    /** The metadata write face (R196 {@code setBlockMetadataWithNotify(...,bit8,2)}). */
    private static boolean setBlighted(Block block, World world, BlockPos pos, IBlockState state,
                                       boolean blighted, String src) {
        boolean changed = ((java.lang.Boolean) state.getProperties().get(BLIGHTED)).booleanValue() != blighted;
        if (!changed) {
            return false;
        }
        boolean ok = world.setBlockState(pos, state.withProperty(BLIGHTED, java.lang.Boolean.valueOf(blighted)), 2);
        if (ok) {
            ETIMFarm.row("blight src=" + src + " block=" + name(block)
                    + " pos=" + key(pos) + " age=" + ageOf(state) + " blighted=" + (blighted ? 1 : 0));
        }
        return ok;
    }

    /** B-13 工装: install/clear the bit directly (the /etest blight set seat —
     *  the verdict window plants the state it wants to judge; no dice). */
    public static boolean forceSetBlight(World world, BlockPos pos, boolean blighted) {
        IBlockState state = world.getBlockState(pos);
        if (!isBlightSeat(state.getBlock())) {
            ETIMFarm.row("blight src=forceSet pos=" + key(pos) + " ->skip (not a blight seat)");
            return false;
        }
        return setBlighted(state.getBlock(), world, pos, state, blighted, "forceSet");
    }

    /** /etest blight probe — the verdict-input dump, no dice. */
    public static void probeBlight(World world, BlockPos pos) {
        IBlockState state = world.getBlockState(pos);
        float blv = world.getLightFromNeighbors(pos.up());
        Biome biome = world.getBiome(pos);
        float biomeMod = getBlightChanceModifierForBiome(biome);
        ETIMFarm.row("blight probe block=" + name(state.getBlock())
                + " pos=" + key(pos)
                + " age=" + (state.getBlock() instanceof BlockCrops ? ageOf(state) : -1)
                + " blighted=" + (isBlighted(state) ? 1 : 0)
                + " seat=" + (isBlightSeat(state.getBlock()) ? 1 : 0)
                + " master=" + (ETIMConfig.blightR196 ? 1 : 0)
                + " blv=" + (int) blv
                + " temp=" + String.format(java.util.Locale.ROOT, "%.2f", biome.getDefaultTemperature())
                + " humidity=" + String.format(java.util.Locale.ROOT, "%.3f", biome.getRainfall())
                + " biomeMod=" + String.format(java.util.Locale.ROOT, "%.3f", biomeMod)
                + " lowLightP=" + String.format(java.util.Locale.ROOT, "%.8f",
                        CHANCE_OF_BLIGHT_PER_RANDOM_TICK * biomeMod * (1.0F - blv / 16.0F))
                + " bloodPhase=" + (world instanceof WorldServer
                        && ETIMMoonState.phase((WorldServer) world) == ETIMMoonState.Phase.BLOOD ? 1 : 0)
                + " dedicated=" + (world.getMinecraftServer().isDedicatedServer() ? 1 : 0)
                + " opaqueAbove=" + (hasStandardFormOpaqueBlockAbove(world, pos) ? 1 : 0)
                + " outdoors=" + (isOutdoors(world, pos) ? 1 : 0));
    }

    /** /etest blight roll — ONE forced arm evaluation (the drought roll馆例). */
    public static void forceBlightRoll(World world, BlockPos pos, boolean blood) {
        IBlockState state = world.getBlockState(pos);
        if (!isBlightSeat(state.getBlock())) {
            ETIMFarm.row("blight roll branch=skip-not-seat block=" + name(state.getBlock())
                    + " pos=" + key(pos));
            return;
        }
        if (blood) {
            // F-B rack: the dedicated face is OVERRIDDEN off (R196 never fires
            // it on a dedicated server) — C-13-1, the verdict exercises the
            // dice + light-checks + write for real.
            float roll = world.rand.nextFloat();
            boolean lightOk = !hasStandardFormOpaqueBlockAbove(world, pos) || isOutdoors(world, pos);
            boolean hit = roll < BLOOD_MOON_BLIGHT_CHANCE;
            ETIMFarm.row("blight roll src=forceBloodMoon roll=" + String.format(java.util.Locale.ROOT, "%.4f", roll)
                    + " hit=" + (hit ? 1 : 0)
                    + " lightOk=" + (lightOk ? 1 : 0)
                    + " force=dedicated-off"
                    + " pos=" + key(pos));
            if (hit && lightOk) {
                setBlighted(state.getBlock(), world, pos, state, true, "bloodMoon");
            }
            return;
        }
        // F-C rack: the real computed p, one dice.
        float blv = world.getLightFromNeighbors(pos.up());
        float biomeMod = getBlightChanceModifierForBiome(world.getBiome(pos));
        float p = CHANCE_OF_BLIGHT_PER_RANDOM_TICK * biomeMod * (1.0F - blv / 16.0F);
        float roll = world.rand.nextFloat();
        boolean hit = roll < p && !isBlighted(state);
        ETIMFarm.row("blight roll src=forceLowLight roll=" + String.format(java.util.Locale.ROOT, "%.6f", roll)
                + " p=" + String.format(java.util.Locale.ROOT, "%.8f", p)
                + " blv=" + (int) blv
                + " alreadyBlighted=" + (isBlighted(state) ? 1 : 0)
                + " hit=" + (hit ? 1 : 0)
                + " pos=" + key(pos));
        if (hit) {
            setBlighted(state.getBlock(), world, pos, state, true, "lowLight");
        }
    }

    /** R196 {@code fertilize :151-159} — bone meal unblights AND ONLY unblights. */    public static boolean unblight(World world, BlockPos pos, IBlockState state) {
        if (!ETIMConfig.blightR196 || !isBlightSeat(state.getBlock())) {
            return false;
        }
        if (!isBlighted(state)) {
            return false; // R196 :158 — non-blighted = no-op, item NOT consumed
        }
        return setBlighted(state.getBlock(), world, pos, state, false, "unblight");
    }

    /** R196 :137-149 — the biome roll modifier (直抄，1.12 平温度字段座位). */
    public static float getBlightChanceModifierForBiome(Biome biome) {
        float temperature = biome.getDefaultTemperature();
        float delta = temperature < 1.0F ? 1.0F - temperature
                : (temperature > 1.2F ? temperature - 1.2F : 0.0F);
        return Math.max((1.0F - delta) * (getHighHumidity(biome) ? 1.5F : 1.0F), 0.0F);
    }

    /** 1.12 Biome :232-234 — {@code getRainfall() > 0.85F} (胞在). */
    private static boolean getHighHumidity(Biome biome) {
        return biome.getRainfall() > 0.85F;
    }

    /**
     * R196 {@code hasStandardFormOpaqueBlockAbove World:6427-6435} — the
     * heightmap staircase scan for a standard-form opaque cube.
     */
    public static boolean hasStandardFormOpaqueBlockAbove(World world, BlockPos pos) {
        int height = world.getChunk(pos).getHeightValue(pos.getX() & 15, pos.getZ() & 15);
        for (int yy = pos.getY() + 1; yy < height; yy++) {
            IBlockState s = world.getBlockState(new BlockPos(pos.getX(), yy, pos.getZ()));
            if (s.getBlock().isOpaqueCube(s)) {
                return true;
            }
        }
        return false;
    }

    /**
     * R196 {@code isAirOrPassableBlock(x,y,z,false)} (World :5638-5648) —
     * air true, null false, liquid FALSE either way, else not-solid. The
     * 1.12 sittable face: air ∨ (¬liquid ∧ ¬blocksMovement).
     */
    private static boolean isAirOrPassable(World world, BlockPos pos) {
        IBlockState s = world.getBlockState(pos);
        if (s.getBlock().isAir(s, world, pos)) {
            return true;
        }
        if (s.getMaterial().isLiquid()) {
            return false;
        }
        return !s.getMaterial().blocksMovement();
    }

    private static int precipHeight(World world, int x, int z) {
        return world.getPrecipitationHeight(new BlockPos(x, 0, z)).getY();
    }

    /**
     * R196 {@code isOutdoors World:5658-5874} — the 49-slot precipitation
     * pillar lattice, ported statement-for-statement (the check_block index
     * bookkeeping is load-bearing: it is the reachability set of the
     * sideways scans).
     */
    public static boolean isOutdoors(World world, BlockPos pos) {
        return isOutdoorsPort(world, pos, true);
    }

    private static boolean isOutdoorsPort(World world, BlockPos pos, boolean initialCall) {
        int x = pos.getX();
        int y = pos.getY();
        int z = pos.getZ();
        if (!world.provider.hasSkyLight()) {
            return false;
        }
        boolean[] check_block = new boolean[49];

        if (initialCall && isAirOrPassable(world, pos.up())) {
            if (isOutdoorsPort(world, pos.up(), false)) {
                return true;
            }
            if (isAirOrPassable(world, pos.up(2)) && isOutdoorsPort(world, pos.up(2), false)) {
                return true;
            }
        }

        if (isAirOrPassable(world, pos) && precipHeight(world, x, z) <= y) {
            return true;
        }

        if (isAirOrPassable(world, new BlockPos(x + 1, y, z))) {
            if (precipHeight(world, x + 1, z) <= y) {
                return true;
            }
            check_block[18] = true;
            check_block[26] = true;
            check_block[32] = true;
        }
        if (isAirOrPassable(world, new BlockPos(x - 1, y, z))) {
            if (precipHeight(world, x - 1, z) <= y) {
                return true;
            }
            check_block[16] = true;
            check_block[22] = true;
            check_block[30] = true;
        }
        if (isAirOrPassable(world, new BlockPos(x, y, z + 1))) {
            if (precipHeight(world, x, z + 1) <= y) {
                return true;
            }
            check_block[30] = true;
            check_block[38] = true;
            check_block[32] = true;
        }
        if (isAirOrPassable(world, new BlockPos(x, y, z - 1))) {
            if (precipHeight(world, x, z - 1) <= y) {
                return true;
            }
            check_block[16] = true;
            check_block[10] = true;
            check_block[18] = true;
        }

        if (check_block[18] && isAirOrPassable(world, new BlockPos(x + 1, y, z - 1))) {
            if (precipHeight(world, x + 1, z - 1) <= y) {
                return true;
            }
            check_block[11] = true;
            check_block[19] = true;
        }
        if (check_block[32] && isAirOrPassable(world, new BlockPos(x + 1, y, z + 1))) {
            if (precipHeight(world, x + 1, z + 1) <= y) {
                return true;
            }
            check_block[33] = true;
            check_block[39] = true;
        }
        if (check_block[30] && isAirOrPassable(world, new BlockPos(x - 1, y, z + 1))) {
            if (precipHeight(world, x - 1, z + 1) <= y) {
                return true;
            }
            check_block[29] = true;
            check_block[37] = true;
        }
        if (check_block[16] && isAirOrPassable(world, new BlockPos(x - 1, y, z - 1))) {
            if (precipHeight(world, x - 1, z - 1) <= y) {
                return true;
            }
            check_block[9] = true;
            check_block[15] = true;
        }

        if (check_block[26] && isAirOrPassable(world, new BlockPos(x + 2, y, z))) {
            if (precipHeight(world, x + 2, z) <= y) {
                return true;
            }
            check_block[19] = true;
            check_block[27] = true;
            check_block[33] = true;
        }
        if (check_block[38] && isAirOrPassable(world, new BlockPos(x, y, z + 2))) {
            if (precipHeight(world, x, z + 2) <= y) {
                return true;
            }
            check_block[37] = true;
            check_block[39] = true;
            check_block[45] = true;
        }
        if (check_block[22] && isAirOrPassable(world, new BlockPos(x - 2, y, z))) {
            if (precipHeight(world, x - 2, z) <= y) {
                return true;
            }
            check_block[15] = true;
            check_block[21] = true;
            check_block[29] = true;
        }
        if (check_block[10] && isAirOrPassable(world, new BlockPos(x, y, z - 2))) {
            if (precipHeight(world, x, z - 2) <= y) {
                return true;
            }
            check_block[3] = true;
            check_block[9] = true;
            check_block[11] = true;
        }

        if (check_block[11] && isAirOrPassable(world, new BlockPos(x + 1, y, z - 2))) {
            if (precipHeight(world, x + 1, z - 2) <= y) {
                return true;
            }
            check_block[12] = true;
        }
        if (check_block[19] && isAirOrPassable(world, new BlockPos(x + 2, y, z - 1))) {
            if (precipHeight(world, x + 2, z - 1) <= y) {
                return true;
            }
            check_block[12] = true;
        }
        if (check_block[33] && isAirOrPassable(world, new BlockPos(x + 2, y, z + 1))) {
            if (precipHeight(world, x + 2, z + 1) <= y) {
                return true;
            }
            check_block[40] = true;
        }
        if (check_block[39] && isAirOrPassable(world, new BlockPos(x + 1, y, z + 2))) {
            if (precipHeight(world, x + 1, z + 2) <= y) {
                return true;
            }
            check_block[40] = true;
        }
        if (check_block[37] && isAirOrPassable(world, new BlockPos(x - 1, y, z + 2))) {
            if (precipHeight(world, x - 1, z + 2) <= y) {
                return true;
            }
            check_block[36] = true;
        }
        if (check_block[29] && isAirOrPassable(world, new BlockPos(x - 2, y, z + 1))) {
            if (precipHeight(world, x - 2, z + 1) <= y) {
                return true;
            }
            check_block[36] = true;
        }
        if (check_block[15] && isAirOrPassable(world, new BlockPos(x - 2, y, z - 1))) {
            if (precipHeight(world, x - 2, z - 1) <= y) {
                return true;
            }
            check_block[8] = true;
        }
        if (check_block[9] && isAirOrPassable(world, new BlockPos(x - 1, y, z - 2))) {
            if (precipHeight(world, x - 1, z - 2) <= y) {
                return true;
            }
            check_block[8] = true;
        }

        if (check_block[12] && isAirOrPassable(world, new BlockPos(x + 2, y, z - 2))
                && precipHeight(world, x + 2, z - 2) <= y) {
            return true;
        } else if (check_block[40] && isAirOrPassable(world, new BlockPos(x + 2, y, z + 2))
                && precipHeight(world, x + 2, z + 2) <= y) {
            return true;
        } else if (check_block[36] && isAirOrPassable(world, new BlockPos(x - 2, y, z + 2))
                && precipHeight(world, x - 2, z + 2) <= y) {
            return true;
        } else if (check_block[8] && isAirOrPassable(world, new BlockPos(x - 2, y, z - 2))
                && precipHeight(world, x - 2, z - 2) <= y) {
            return true;
        } else if (check_block[27] && isAirOrPassable(world, new BlockPos(x + 3, y, z))
                && precipHeight(world, x + 3, z) <= y) {
            return true;
        } else if (check_block[45] && isAirOrPassable(world, new BlockPos(x, y, z + 3))
                && precipHeight(world, x, z + 3) <= y) {
            return true;
        } else if (check_block[21] && isAirOrPassable(world, new BlockPos(x - 3, y, z))
                && precipHeight(world, x - 3, z) <= y) {
            return true;
        } else {
            return check_block[3] && isAirOrPassable(world, new BlockPos(x, y, z - 3))
                    && precipHeight(world, x, z - 3) <= y;
        }
    }

    private static String name(Block block) {
        return block.getRegistryName() == null ? block.toString() : block.getRegistryName().toString();
    }

    private static String key(BlockPos pos) {
        return pos.getX() + "," + pos.getY() + "," + pos.getZ();
    }
}
