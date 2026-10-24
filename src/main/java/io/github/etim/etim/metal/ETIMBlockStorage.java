package io.github.etim.etim.metal;

import net.minecraft.block.Block;
import net.minecraft.block.SoundType;
import net.minecraft.block.material.Material;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.util.ResourceLocation;

import io.github.etim.etim.ETIM;

/**
 * 金属砧块批 T2① — one ETIM metal storage block (R196 {@code BlockOreStorage}
 * constructor :4-10 对位; Block.java :772-784/:950 registers copper 204/silver
 * 205/mithril 206/adamantium 207/ancient_metal 252).
 *
 * <p>Judged values (补-2, 批文 §一):</p>
 * <ul>
 *   <li>harvest level = the metal's tool grade + 1 (R196 :6
 *       modifyMinHarvestLevel(1)) — copper/silver 3, ancient 4, mithril 5,
 *       adamantium 6.</li>
 *   <li>hardness = the same relative form as the anvils (R196 :9), 1.2 ×
 *       metal durability; resistance = the vanilla metal-block value 10.0
 *       (R196 pins no resistance row — vanilla Blocks.IRON_BLOCK carries
 *       10.0, C 级登记观察, same convention as {@link ETIMBlockOre}).</li>
 *   <li>stack 4 (R196 :8, set on the ItemBlock at registration); creative
 *       tab building blocks (R196 :7 tabBlock); Material.IRON +
 *       METAL sound (the 1.12 metal-block convention standing in for the
 *       R196 per-metal blockMaterial).</li>
 *   <li>component crafting difficulty = ingot × 9 (R196 :13-17) — NO
 *       hardcoding: the value emerges automatically from the 9-ingot→block
 *       recipe through the T8① produce-difficulty sum (补-1 定谳).</li>
 *   <li>gold/iron storage blocks stay vanilla (A-1 定谳口径).</li>
 * </ul>
 */
public class ETIMBlockStorage extends Block {

    public ETIMBlockStorage(String name, int harvestLevel, float hardness) {
        super(Material.IRON);
        this.setRegistryName(new ResourceLocation(ETIM.MOD_ID, name));
        this.setTranslationKey("etim." + name);
        this.setHardness(hardness);
        this.setResistance(10.0F);
        this.setSoundType(SoundType.METAL);
        this.setHarvestLevel("pickaxe", harvestLevel);
        this.setCreativeTab(CreativeTabs.BUILDING_BLOCKS);
    }
}
