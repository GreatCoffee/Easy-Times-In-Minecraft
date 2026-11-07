package io.github.etim.etim.world;

import java.util.Random;

import net.minecraft.block.BlockLog;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.gen.structure.StructureBoundingBox;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.farm.ETIMBlockDeadPlant;
import io.github.etim.etim.farm.ETIMFarm;

/**
 * Village-field batch (B-14): the R196 abandoned-village face —
 * {@code ComponentVillageField.getRandomCrop :45-56} rolls a SIX-face die
 * where EVERY face is a DEAD crop (carrotDead/potatoDead/onionsDead — and
 * the default face {@code Block.cropsDead}, the :54 debt anchor), every
 * planting dice reads {@code getRandomIntegerInRange(2, 6)} (:91-113 /
 * :78-91), there are NO water strips and the frame is plain
 * {@code Block.wood} (no biome theming). This transplants that whole face
 * onto the 1.12 {@code StructureVillagePieces$Field1/Field2} bodies AFTER
 * they run (the mixins fire at {@code addComponentParts} returns and hand
 * us both the generation clip box and the component's own bounding box).
 *
 * <p>Carrier verdicts (摸底 §三/§五): the four die faces collapse to the
 * single {@code etim:dead_crop} carrier (B-8 batch) — the die's whole
 * semantic is "the field plants dead crops", nothing else is judgeable;
 * the age dice run on a per-field deterministic {@link Random} derived
 * from the world seed and the field-box coordinates, so (a) repeated
 * per-chunk passes converge on the same distribution (each pass re-rolls
 * the cells it re-writes, idempotent by range) and (b) the vanilla
 * worldgen RNG stream is untouched (R196 stream values are unreachable on
 * the 1.12 pipeline — C-14-3, final-block equivalence is the judgment).</p>
 *
 * <p>Flag: {@code villageFieldsR196} (new "worldgen" config domain). Off =
 * vanilla fields (10-face live-crop die, water strips, biome-themed
 * frames) untouched.</p>
 */
public final class ETIMVillageFields {

    private ETIMVillageFields() {
    }

    /** R196 :45-56 collapsed — the die has no live face, so this is the
     *  whole distribution. Kept as a constant for the javadoc/backlink. */
    public static final int DEAD_FIELD_AGE_MIN = 2;   // :91 getRandomIntegerInRange low
    public static final int DEAD_FIELD_AGE_SPAN = 5;  // 2..6 inclusive → nextInt(5)

    /**
     * One addComponentParts-return pass. Both boxes are the mixin's raw
     * arguments (@At("RETURN") so early ground-fail returns are no-ops
     * anyway — the vanilla body wrote nothing on those paths).
     */
    public static void r196ize(World world, StructureBoundingBox clip, StructureBoundingBox fieldBox, String type) {
        if (!ETIMConfig.villageFieldsR196) {
            return;
        }
        int x0 = Math.max(clip.minX, fieldBox.minX);
        int x1 = Math.min(clip.maxX, fieldBox.maxX);
        int y0 = Math.max(clip.minY, fieldBox.minY);
        int y1 = Math.min(clip.maxY, fieldBox.maxY);
        int z0 = Math.max(clip.minZ, fieldBox.minZ);
        int z1 = Math.min(clip.maxZ, fieldBox.maxZ);
        if (x0 > x1 || y0 > y1 || z0 > z1) {
            return; // a clip window that misses the field entirely
        }
        Random fieldRand = fieldRand(world, fieldBox);
        int dead = 0;
        int water = 0;
        int logNorm = 0;
        for (int x = x0; x <= x1; x++) {
            for (int z = z0; z <= z1; z++) {
                for (int y = y0; y <= y1; y++) {
                    BlockPos pos = new BlockPos(x, y, z);
                    IBlockState state = world.getBlockState(pos);
                    net.minecraft.block.Block block = state.getBlock();
                    if (block == Blocks.WATER || block == Blocks.FLOWING_WATER) {
                        world.setBlockState(pos, Blocks.AIR.getDefaultState(), 2);
                        water++;
                        continue;
                    }
                    if (block == Blocks.WHEAT || block == Blocks.CARROTS
                            || block == Blocks.POTATOES || block == Blocks.BEETROOTS) {
                        // R196 :91-113 — every planted cell rolls its own age 2..6
                        int age = DEAD_FIELD_AGE_MIN + fieldRand.nextInt(DEAD_FIELD_AGE_SPAN);
                        world.setBlockState(pos, ETIMBlockDeadPlant.DEAD_CROP.getDefaultState()
                                .withProperty(net.minecraft.block.BlockCrops.AGE, Integer.valueOf(age)), 2);
                        dead++;
                        continue;
                    }
                    if (y == fieldBox.minY && (block instanceof BlockLog
                            || block == Blocks.SANDSTONE || block == Blocks.RED_SANDSTONE)) {
                        // R196 :83-87/:73-76 — plain Block.wood frame, no biome theming
                        world.setBlockState(pos, Blocks.LOG.getDefaultState(), 2);
                        logNorm++;
                    }
                }
            }
        }
        if (dead != 0 || water != 0 || logNorm != 0) {
            ETIMFarm.row("villageField src=r196ized type=" + type
                    + " fieldMin=" + fieldBox.minX + "," + fieldBox.minY + "," + fieldBox.minZ
                    + " dead=" + dead + " water=" + water + " logNorm=" + logNorm
                    + " flag=" + (ETIMConfig.villageFieldsR196 ? 1 : 0));
        }
    }

    /**
     * Deterministic per-field dice: world seed hashed with the field-box
     * corner coordinates (SplitMix-style mixing for bit scatter). Never
     * touches the worldgen {@code Random} stream (C-14-3).
     */
    private static Random fieldRand(World world, StructureBoundingBox box) {
        long seed = world.getSeed();
        seed += 0x9E3779B97F4A7C15L * box.minX;
        seed += 0xBF58476D1CE4E5B9L * box.minZ;
        seed += 0x94D049BB133111EBL * box.maxY;
        seed ^= seed >>> 30;
        seed *= 0xBF58476D1CE4E5B9L;
        seed ^= seed >>> 27;
        seed *= 0x94D049BB133111EBL;
        seed ^= seed >>> 31;
        return new Random(seed);
    }
}
