package io.github.etim.etim.farm;

import net.minecraft.block.BlockCrops;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.IBlockAccess;
import net.minecraft.world.World;

import java.util.Random;

/**
 * Drought-death batch (B-8): the dead-crop carrier — R196
 * {@code BlockCropsDead} (block 235 {@code cropsDead}) transcribed verbatim:
 * <ul>
 *   <li>{@code setTickRandomly(false)} (:6) — the dead plant NEVER random
 *       ticks, so it can never revive or regrow.</li>
 *   <li>{@code dropBlockAsEntityItem == 0} (:39-41) — breaking yields
 *       nothing, harvest or machine alike. Both Forge drop entry points are
 *       zeroed here ({@code getDrops} is the 1.12 funnel;
 *       {@code getItemDropped → AIR} backs the quantity face).</li>
 *   <li>{@code fertilize == false} (:20-22) — bone meal cannot revive a dead
 *       plant (IGrowable both gates false + {@code grow()} no-op).</li>
 *   <li>R196 {@code canBeCarried false} (BaseCrops :322-325) — no ItemBlock
 *       is registered for these blocks, nothing can ever be carried/dropped.
 *       Same no-ItemBlock pattern as the R196 portal face (NA-28).</li>
 * </ul>
 *
 * <p>D-1 (user-ruled): the wheat-family instance bakes eight desaturated
 * (grey-dried) stage textures generated from the vanilla wheat stages; the
 * stem instance reuses the 1.12 {@code stem_growth0..7} geometry with one
 * dead-olive stem texture (the vanilla stem parents carry {@code tintindex}
 * 0 — the block keeps the default-white tint so the baked colour shows
 * as-is). D-2 (user-ruled): the STEM death swaps the whole block to
 * {@code dead_stem} (carrier-substitution adapt — R196 holds an in-block
 * dead BIT; 1.12 BlockStem has no spare bit space in its state container,
 * and the observation face — frozen, no drops, no bone-meal, dead colour —
 * is identical).</p>
 */
public class ETIMBlockDeadPlant extends BlockCrops {

    /** Wheat-family dead plant (R196 cropsDead 235). */
    public static ETIMBlockDeadPlant DEAD_CROP;
    /** Melon/pumpkin stem dead plant (carrier-substitution adapt, D-2 乙). */
    public static ETIMBlockDeadPlant DEAD_STEM;

    private final boolean stemModel;

    ETIMBlockDeadPlant(String name, boolean stemModel) {
        super();
        this.stemModel = stemModel;
        this.setRegistryName("etim", name);
        this.setTickRandomly(false); // R196 BlockCropsDead :6 — never revives
    }

    /**
     * Vanilla BlockCrops ctor arms {@code setTickRandomly(true)} (1.12
     * BlockCrops :27); the dead plant must never receive a random tick, and
     * the no-op override also freezes vanilla's {@code checkAndDropBlock}
     * style faces (dead root stays on the field — R196 :73 neighbour face).
     */
    @Override
    public void updateTick(World world, BlockPos pos, IBlockState state, Random rand) {
    }

    @Override
    public void getDrops(net.minecraft.util.NonNullList<net.minecraft.item.ItemStack> drops,
                         IBlockAccess world, BlockPos pos, IBlockState state, int fortune) {
        // R196 BlockCropsDead :39-41 — empty always.
    }

    @Override
    public Item getItemDropped(IBlockState state, Random rand, int fortune) {
        return Items.AIR;
    }

    @Override
    public boolean canGrow(World world, BlockPos pos, IBlockState state, boolean isClient) {
        return false; // R196 BlockCropsDead.fertilize :20-22 — bone meal no-op
    }

    @Override
    public boolean canUseBonemeal(World world, Random rand, BlockPos pos, IBlockState state) {
        return false;
    }

    @Override
    public void grow(World world, Random rand, BlockPos pos, IBlockState state) {
    }

    /** Blockstate-model registry name (client picks dead_crop / dead_stem). */
    public String blockName() {
        return this.stemModel ? "dead_stem" : "dead_crop";
    }
}
