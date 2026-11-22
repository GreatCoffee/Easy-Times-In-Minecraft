package io.github.etim.etim.farm;

import net.minecraft.block.BlockCrops;
import net.minecraft.block.state.IBlockState;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.NonNullList;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.IBlockAccess;
import net.minecraft.world.World;

/**
 * R196 {@code BlockOnion} (block 234 {@code onions}) — B-68 (census F :129).
 *
 * <p>1.12 carrier is {@link BlockCrops} (AGE 0..7, the same eight growth bits
 * R196 uses); R196's five texture stages ({@code getGrowthStage}: 0, 1, 1, 2,
 * 2, 3, 3, 4) live in the blockstate JSON, so no Java stage mapping is
 * needed.</p>
 *
 * <p>Drop face (R196 {@code BlockCrops.dropBlockAsEntityItem :328-367} +
 * {@code BlockOnion.getMatureYield :27-30}): blight → 0, growth 0 → one seed
 * (the onion item is both seed and crop), mature → 2 or 3 onions (25 % three).
 * The harvester gate (machine/explosion → 0) rides
 * {@code ETIMFarmingEvents.onHarvestDrops}, where 1.12 exposes the player.</p>
 */
public class ETIMBlockOnion extends BlockCrops {

    @Override
    protected Item getSeed() {
        return ETIMFarmBlocks.onionItem();
    }

    @Override
    protected Item getCrop() {
        return ETIMFarmBlocks.onionItem();
    }

    @Override
    public Item getItemDropped(IBlockState state, java.util.Random rand, int fortune) {
        // Identity face only (pick block / harvesting-bonus carrier lookup);
        // the quantity face is getDrops below (never the default funnel).
        return isMaxAge(state) ? getCrop() : getSeed();
    }

    @Override
    public void getDrops(NonNullList<ItemStack> drops, IBlockAccess world, BlockPos pos,
                         IBlockState state, int fortune) {
        if (ETIMBlight.isBlighted(state)) {
            return; // R196 :337-339 — blighted crops yield nothing
        }
        int age = getAge(state);
        if (age == 0) {
            drops.add(new ItemStack(getSeed())); // R196 :352-353 — one seed
            return;
        }
        if (age < getMaxAge()) {
            return; // R196 :355-357 — immature, growth > 0 → nothing
        }
        java.util.Random rand = world instanceof World ? ((World) world).rand : RANDOM;
        drops.add(new ItemStack(getCrop(), rand.nextFloat() < 0.25F ? 3 : 2)); // R196 BlockOnion :27-30
    }
}
