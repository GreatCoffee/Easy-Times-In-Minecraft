package io.github.etim.etim.metal;

import io.github.etim.etim.ETIM;
import net.minecraft.creativetab.CreativeTabs;
import net.minecraft.item.Item;
import net.minecraft.util.ResourceLocation;

/**
 * The ETIM chain-mail link (R196 ItemChain: a plain material item, max
 * stack 8, tabMaterials — ItemChain.java:4-8). The armor-face component:
 * R196 RecipesArmor feeds chains into the SAME armor shapes as ingots
 * (待核② 闭).
 */
public class ETIMItemChain extends Item {

    public ETIMItemChain(String name) {
        this.setRegistryName(new ResourceLocation(ETIM.MOD_ID, name));
        this.setTranslationKey("etim." + name);
        this.setMaxStackSize(8); // R196 ItemChain.java:6
        this.setCreativeTab(CreativeTabs.MATERIALS);
    }
}
