package io.github.etim.etim.mining;

import io.github.etim.etim.Tags;
import net.minecraft.enchantment.Enchantment;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * MITE-ported enchantments (task 2.2 / ToolSuite 终审 §四): the tree-felling
 * helper, id 83 in R196, applies to axes only (battle axes included, hatchets
 * excluded in MITE — vanilla 1.12 has no hatchet class to mirror) and reads
 * its felling depth straight from the enchantment level on the held stack.
 */
public final class ETIMEnchantments {

    public static Enchantment TREE_FELLING;

    private ETIMEnchantments() {
    }

    public static void register() {
        TREE_FELLING = new EnchantmentTreeFelling();
        TREE_FELLING.setRegistryName(new ResourceLocation(Tags.MOD_ID, "tree_felling"));
        ForgeRegistries.ENCHANTMENTS.register(TREE_FELLING);
    }
}
