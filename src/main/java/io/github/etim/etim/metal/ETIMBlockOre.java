package io.github.etim.etim.metal;

import net.minecraft.block.Block;
import net.minecraft.block.SoundType;
import net.minecraft.block.material.Material;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.ResourceLocation;

import io.github.etim.etim.ETIM;

/**
 * One ETIM ore block (R196 BlockOre 四矿, 终审 G-FB-9 = A): hardness
 * 2.5/2.5/3.5/4.0, pickaxe harvest level 2/2/3/4 (copper/silver/mithril/
 * adamantium), drops ITSELF (R196 :48-101 — the smelting row consumes the
 * block item). The fortune 1+0.1×fortune row rides batch B2
 * (BLOCK_MIN_LEVEL 行) — B1 keeps the plain self-drop.
 *
 * <p>Adamantium generates NOWHERE in the main world (R196 BiomeDecorator
 * :345-357 — adamantiteGen is underworld-only, 终审 G-FB-10); the block
 * exists for stage 7.</p>
 */
public class ETIMBlockOre extends Block {

    public ETIMBlockOre(String name, float hardness, int harvestLevel) {
        super(Material.ROCK);
        this.setRegistryName(new ResourceLocation(ETIM.MOD_ID, name));
        this.setTranslationKey("etim." + name);
        this.setHardness(hardness);
        // Same-class value: vanilla BlockOre carries 5.0 resistance (R196 pins
        // no resistance row — C 级登记观察).
        this.setResistance(5.0F);
        this.setSoundType(SoundType.STONE);
        this.setHarvestLevel("pickaxe", harvestLevel);
        this.setCreativeTab(CreativeTabs.BUILDING_BLOCKS);
    }

    /** Drops itself (vanilla default getItemDropped) ×1 — R196 掉自身块. */
    @Override
    public Item getItemDropped(net.minecraft.block.state.IBlockState state, java.util.Random rand, int fortune) {
        return Item.getItemFromBlock(this);
    }

    /**
     * Batch-B2 fortune face (批文 §〇 待核① 闭, R196 BlockOre:99 +
     * Block.java:2001-2040): the main unit always drops (chance ≥ 1) and
     * the extra unit rides a separate {@code rand < fortune × 0.1} roll —
     * the R196 {@code chance − 1.0} accumulator. The suppress face
     * (BlockOre:94, metadata bit 1) never triggers: ETIM ore metadata is
     * always 0/placement-1, bit 1 clear.
     */
    @Override
    public java.util.List<ItemStack> getDrops(net.minecraft.world.IBlockAccess world, net.minecraft.util.math.BlockPos pos,
                                              net.minecraft.block.state.IBlockState state, int fortune) {
        ItemStack self = new ItemStack(Item.getItemFromBlock(this));
        java.util.List<ItemStack> drops = new java.util.ArrayList<>();
        drops.add(self);
        if (RANDOM.nextFloat() < fortune * 0.1F) {
            drops.add(self.copy());
        }
        return drops;
    }
}
