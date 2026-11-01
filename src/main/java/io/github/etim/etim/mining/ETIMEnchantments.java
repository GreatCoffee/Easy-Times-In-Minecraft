package io.github.etim.etim.mining;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.Tags;
import net.minecraft.enchantment.Enchantment;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * MITE-ported enchantments (task 2.2 / ToolSuite 终审 §四): the tree-felling
 * helper, id 83 in R196, applies to axes only (battle axes included, hatchets
 * excluded in MITE — enforced at the table gate after the ETIMItemHatchet
 * class landed, see EnchantmentTreeFelling:canApplyAtEnchantingTable) and
 * reads its felling depth straight from the enchantment level on the held
 * stack.
 */
public final class ETIMEnchantments {

    public static Enchantment TREE_FELLING;
    public static Enchantment ENDURANCE;
    public static Enchantment PIERCING;
    // batch enchant1 (路丙一期 5 条, 条 241-245): R196 ids 85/86/90/89/88.
    public static Enchantment SPEED;
    public static Enchantment REGENERATION;
    public static Enchantment POISON;
    public static Enchantment TRUE_FLIGHT;
    public static Enchantment QUICKNESS;

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
        // Batch enchant1 (路丙一期 — 条 241-245): the five R196 entries, case-M
        // windows (ETIMMiteEnchantment), α2 true_flight, poison case-A potion.
        SPEED = new io.github.etim.etim.combat.EnchantmentSpeed();
        SPEED.setRegistryName(new ResourceLocation(Tags.MOD_ID, "speed"));
        ForgeRegistries.ENCHANTMENTS.register(SPEED);
        REGENERATION = new io.github.etim.etim.hunger.EnchantmentRegeneration();
        REGENERATION.setRegistryName(new ResourceLocation(Tags.MOD_ID, "regeneration"));
        ForgeRegistries.ENCHANTMENTS.register(REGENERATION);
        POISON = new io.github.etim.etim.combat.EnchantmentPoison();
        POISON.setRegistryName(new ResourceLocation(Tags.MOD_ID, "poison"));
        ForgeRegistries.ENCHANTMENTS.register(POISON);
        TRUE_FLIGHT = new io.github.etim.etim.combat.EnchantmentTrueFlight();
        TRUE_FLIGHT.setRegistryName(new ResourceLocation(Tags.MOD_ID, "true_flight"));
        ForgeRegistries.ENCHANTMENTS.register(TRUE_FLIGHT);
        QUICKNESS = new io.github.etim.etim.combat.EnchantmentQuickness();
        QUICKNESS.setRegistryName(new ResourceLocation(Tags.MOD_ID, "quickness"));
        ForgeRegistries.ENCHANTMENTS.register(QUICKNESS);
        // Case A poison potion (条 243/245) — R196 arithmetic on a self-owned
        // Potion (vanilla 1.12 poison is 25-tick + health-gated; ours is
        // 100>>amp + gate-less). Registered BEFORE cfg init (:87) like the
        // other claims — runtime reads of the icon cfg key are lazy.
        io.github.etim.etim.combat.ETIMPotionPoison.register();
        // Harness convenience: the numeric id for raw-NBT staging
        // (/replaceitem ... {ench:[{id:n,lvl:L}]}) without a decompile round.
        ETIM.LOGGER.info("[EtimInit] enchant {} id={}", ENDURANCE.getRegistryName(),
                Enchantment.getEnchantmentID(ENDURANCE));
        ETIM.LOGGER.info("[EtimInit] enchant {} id={}", PIERCING.getRegistryName(),
                Enchantment.getEnchantmentID(PIERCING));
        ETIM.LOGGER.info("[EtimInit] enchant{} ids={} {} {} {} {}",
                SPEED.getRegistryName(),
                Enchantment.getEnchantmentID(SPEED),
                Enchantment.getEnchantmentID(REGENERATION),
                Enchantment.getEnchantmentID(POISON),
                Enchantment.getEnchantmentID(TRUE_FLIGHT),
                Enchantment.getEnchantmentID(QUICKNESS));
    }
}
