package io.github.etim.etim.weather;

import net.minecraft.block.state.IBlockState;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.WorldServer;
import net.minecraft.world.biome.Biome;

import io.github.etim.etim.mob.ETIMMoonState;

/**
 * R196 rain batch (C-16): the three rain predicates, ported verbatim. The
 * C-16 debt recorded three deltas of the B-5-era bridge
 * {@code world.isRainingAt(pos.up())} ("rainStrength>0.2 / canSnowAt /
 * blood moon are NOT ported", farmlandmoisture 终审回执 :136) — each delta is
 * now first-hand:
 * <ol>
 *   <li><b>Strength gate</b> — R196 {@code isPrecipitating(true)} = the
 *       rain-STRENGTH ramp ({@code getRainStrength(1.0F) > 0.2}, World
 *       :6622-6624), not the boolean {@code isRaining()}; 1.12 keeps the same
 *       float field ({@code world.rainingStrength}) and
 *       {@link io.github.etim.etim.weather.ETIMWeatherClock} drives its ramp
 *       exactly as vanilla (clock lines 158-163), so the gate rides the
 *       field.</li>
 *   <li><b>Snow claw</b> — the 1.12 {@code isRainingAt}`s
 *       {@code getEnableSnow() + canSnowAt(pos,false)} double claw is DROPPED;
 *       R196 {@code isInRain} only excludes freezing biomes
 *       ({@code temperature <= 0.15F}, BiomeGenBase :351-353) and
 *       {@code canLightningStrikeAt} excludes snow-enabled biomes via
 *       {@code canSpawnLightningBolt} (:5428, :277-279).</li>
 *   <li><b>Blood moon</b> — R196 lets a blood moon rain anywhere
 *       ({@code rainfall != 0 || isBloodMoon24HourPeriod()}, World :5394 and
 *       :5409; {@code enableRain || blood_moon}, BiomeGenBase :278); the
 *       carrier is {@link ETIMMoonState.Phase#BLOOD} (B-13 face).</li>
 * </ol>
 *
 * <p>Judgment anchors (R196 first hand): World {@code isPrecipitatingAt
 * :5393-5397}, {@code isInRain :5403-5412},
 * {@code canLightningStrikeAt :5414-5429}, {@code isPrecipitating
 * :6622-6624}, {@code isThundering :6626-6628}, {@code getRainStrength
 * :5384-5386}, {@code getWeightedThunderStrength :5380-5382};
 * BiomeGenBase {@code canSpawnLightningBolt :277-279}, {@code isFreezing
 * :351-353}. Consumers upgraded this batch:
 * {@code BlockFarmland.updateTick :55} (the B-6 rain-wet face),
 * {@code EntityFishHook :156} (lightning fishing face),
 * {@code BlockGrass :183} (worm rain-bonus face),
 * {@code ServerPlayer :1830} (wetness face),
 * {@code EntityLivestock :226} (thirst face).</p>
 */
public final class ETIMRain {

    private ETIMRain() {
    }

    /** R196 {@code World.isPrecipitating(true) :6622-6624} — the STRENGTH
     *  gate. {@code getRainStrength(1.0F)} collapses the interpolation to the
     *  plain field, so the bridge reads {@code world.rainingStrength}
     *  directly (the ETIM weather clock keeps the vanilla ramp shape). */
    public static boolean isPrecipitating(World world) {
        return world.rainingStrength > 0.2F;
    }

    /** R196 {@code World.isBloodMoon24HourPeriod} carrier — the B-13 moon
     *  state face (blood = the whole 24h day, not just the night). */
    public static boolean isBloodMoonPeriod(World world) {
        return world instanceof WorldServer
                && ETIMMoonState.phase((WorldServer) world) == ETIMMoonState.Phase.BLOOD;
    }

    /** R196 {@code BiomeGenBase.isFreezing :351-353} verbatim. */
    public static boolean isFreezing(Biome biome) {
        return biome.getDefaultTemperature() <= 0.15F;
    }

    /** R196 {@code BiomeGenBase.canSpawnLightningBolt :277-279} — snow gates
     *  first, then rain-or-blood-moon. The 1.12 {@code canRain()} is itself
     *  {@code enableSnow ? false : enableRain} (Biome :226), so under a
     *  non-snow biome it IS the R196 {@code enableRain} field. */
    private static boolean canSpawnLightningBolt(Biome biome, boolean bloodMoon) {
        return biome.getEnableSnow() ? false : biome.canRain() || bloodMoon;
    }

    /** R196 {@code World.isPrecipitatingAt :5393-5397} verbatim — the
     *  precipitation-height seat (no sky check, no freezing claw; the
     *  humidity entity face). */
    public static boolean isPrecipitatingAt(World world, BlockPos pos) {
        int x = pos.getX();
        int y = pos.getY();
        int z = pos.getZ();
        Biome biome = world.getBiome(pos);
        return (biome.getRainfall() > 0.0F || isBloodMoonPeriod(world))
                && isPrecipitating(world)
                && world.getPrecipitationHeight(new BlockPos(x, 0, z)).getY() <= y;
    }

    /** R196 {@code World.isInRain :5403-5412} verbatim — the rain-in-face
     *  seat (freezing biomes never rain in; a blood moon rains on drought
     *  biomes too). */
    public static boolean isInRain(World world, BlockPos pos) {
        if (!isPrecipitating(world)) {
            return false;
        }
        int y = pos.getY();
        Biome biome = world.getBiome(pos);
        return (biome.getRainfall() != 0.0F || isBloodMoonPeriod(world)) && !isFreezing(biome)
                ? world.canSeeSky(pos) && world.getPrecipitationHeight(new BlockPos(pos.getX(), 0, pos.getZ())).getY() <= y
                : false;
    }

    /** R196 {@code World.canLightningStrikeAt :5414-5429} verbatim — the
     *  lightning seat (the R196 farmland rain-wet and fishing faces judge
     *  through THIS, not isInRain). */
    public static boolean canLightningStrikeAt(World world, BlockPos pos) {
        if (!isPrecipitating(world)) {
            return false;
        }
        if (!world.canSeeSky(pos)) {
            return false;
        }
        if (world.getPrecipitationHeight(new BlockPos(pos.getX(), 0, pos.getZ())).getY() > pos.getY()) {
            return false;
        }
        Biome biome = world.getBiome(pos);
        return canSpawnLightningBolt(biome, isBloodMoonPeriod(world));
    }

    /** R196 {@code World.isThundering(true) :6626-6628} —
     *  {@code getWeightedThunderStrength(1.0F) > 0.9} where the weighted
     *  strength is {@code (prev + (t - prev) * 1.0) * getRainStrength(1.0)}
     *  (:5380-5382) — thunder is MULITPLIED by rain, the two fields are not
     *  independent gates. */
    public static boolean isThundering(World world) {
        return world.thunderingStrength * world.rainingStrength > 0.9F;
    }
}
