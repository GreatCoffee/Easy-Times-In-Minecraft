package io.github.etim.etim.world;

import javax.annotation.Nullable;

import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.DimensionType;
import net.minecraft.world.WorldProvider;
import net.minecraft.world.biome.BiomeProvider;
import net.minecraft.world.biome.BiomeProviderSingle;
import net.minecraft.world.gen.IChunkGenerator;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * R196 {@code WorldProviderUnderworld.java:3-45} port (M1-07/09).
 *
 * <ul>
 *   <li>{@code init()}: {@code BiomeProviderSingle(underworld)} (M3-05/06,
 *       R196 :10 {@code WorldChunkManagerHell(biome, 1.0F, 0.0F)}) +
 *       {@code hasSkyLight=false} (R196 {@code hasNoSky = !is_overworld},
 *       World.java:150-155). <b>{@code nether} stays false</b> — setting it
 *       would collapse {@code getActualHeight} to 128 (1.12
 *       {@code world/WorldProvider.java:608-611}, B-4).</li>
 *   <li>{@code calculateCelestialAngle = 0.5F} (R196 :32-34) — fixed
 *       celestial angle, the underworld has no day cycle of its own.</li>
 *   <li>{@code canRespawnHere=false} (R196 :37-39), {@code
 *       canCoordinateBeSpawn=false} (R196 :27-29), {@code
 *       doesXZShowFog=false} (R196 :42-44).</li>
 *   <li>Fog (R196 :14-19): the 32-day grayscale cycle
 *       {@code |dayOfCycle-16| * 0.004F}. B-14: the day number MUST be the
 *       adjusted clock {@code (time+6000)/24000+1} (R196
 *       {@code World.getDayOfWorld :5303-5309}) — NOT the plain
 *       {@code worldTime/24000} helper in {@code ETIMMobEquip}.</li>
 *   <li>B-2 裁定 (provider 自带): {@link #getYOffset()} is the single source
 *       of the underworld y-offset face (R196 {@code World.underworld_y_offset
 *       :185/:277}); consumers read it via {@code world.provider}.</li>
 *   <li>C-10: the R196 {@code block_domain_radius=524288} chunk-domain cap has
 *       no 1.12 counterpart — the vanilla ±29999984 border stands.</li>
 * </ul>
 */
public class ETIMWorldProviderUnderworld extends WorldProvider {

    /** B-2 裁定 — the offset face's single source (R196 World.java:185). */
    private static final int Y_OFFSET = 120;

    @Override
    protected void init() {
        this.biomeProvider = new BiomeProviderSingle(ETIMBiomeUnderworld.INSTANCE);
        this.hasSkyLight = false;
        // this.nether stays false → getActualHeight() = 256 (M1-05)
        ETIMDimensions.dimLog("provider init hasSkyLight=false nether=false yOffset=" + Y_OFFSET);
        ETIMDimensions.dimLog("biomeProvider=single");
    }

    /** M1-02 — the y-offset face, provider-carried (B-2 裁定). */
    public int getYOffset() {
        return Y_OFFSET;
    }

    @Override
    public IChunkGenerator createChunkGenerator() {
        return new ETIMChunkGeneratorUnderworld(this.world, this.world.getSeed());
    }

    @Override
    public boolean canCoordinateBeSpawn(int x, int z) {
        return false;
    }

    @Override
    public float calculateCelestialAngle(long worldTime, float partialTicks) {
        return 0.5F;
    }

    @Override
    public boolean canRespawnHere() {
        return false;
    }

    @Override
    public boolean isSurfaceWorld() {
        return false;
    }

    @Override
    public boolean doesXZShowFog(int x, int z) {
        return false;
    }

    @Override
    @SideOnly(Side.CLIENT)
    public Vec3d getFogColor(float angle, float partialTicks) {
        // R196 WorldProviderUnderworld.java:14-19 — the 32-day grayscale cycle,
        // on the adjusted day clock (B-14: getDayOfWorld = (t+6000)/24000 + 1).
        int day = (int) ((this.world.getTotalWorldTime() + 6000L) / 24000L) + 1;
        float grayscale = Math.abs(day % 32 - 16) * 0.004F;
        return new Vec3d(grayscale, grayscale, grayscale);
    }

    @Override
    public DimensionType getDimensionType() {
        return ETIMDimensions.UNDERWORLD_TYPE;
    }

    @Nullable
    @Override
    public BlockPos getSpawnCoordinate() {
        return null;
    }

    @Override
    public BiomeProvider getBiomeProvider() {
        return this.biomeProvider;
    }
}
