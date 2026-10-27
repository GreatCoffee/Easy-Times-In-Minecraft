package io.github.etim.etim.mining;

import io.github.etim.etim.ETIM;
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
    public static Enchantment ENDURANCE;
    public static Enchantment PIERCING;

    private ETIMEnchantments() {
    }

    public static void register() {
        TREE_FELLING = new EnchantmentTreeFelling();
        TREE_FELLING.setRegistryName(new ResourceLocation(Tags.MOD_ID, "tree_felling"));
        ForgeRegistries.ENCHANTMENTS.register(TREE_FELLING);
        // v2+ Endurance product order (F-5-29): R196 Enchantment.java:45 id 95,
        // four levels, chestpieces only — hunger-package port (G4/G5).
        ENDURANCE = new io.github.etim.etim.hunger.EnchantmentEndurance();
        ENDURANCE.setRegistryName(new ResourceLocation(Tags.MOD_ID, "endurance"));
        ForgeRegistries.ENCHANTMENTS.register(ENDURANCE);
        // Batch E / AD-7 (条 94/95): R196 Enchantment.java:42 id 92, rarity rare,
        // difficulty 10, five levels — combat-package class, single entry here.
        PIERCING = new io.github.etim.etim.combat.EnchantmentPiercing();
        PIERCING.setRegistryName(new ResourceLocation(Tags.MOD_ID, "piercing"));
        ForgeRegistries.ENCHANTMENTS.register(PIERCING);
        // Harness convenience: the numeric id for raw-NBT staging
        // (/replaceitem ... {ench:[{id:n,lvl:L}]}) without a decompile round.
        ETIM.LOGGER.info("[EtimInit] enchant {} id={}", ENDURANCE.getRegistryName(),
                Enchantment.getEnchantmentID(ENDURANCE));
        ETIM.LOGGER.info("[EtimInit] enchant {} id={}", PIERCING.getRegistryName(),
                Enchantment.getEnchantmentID(PIERCING));
    }
}
