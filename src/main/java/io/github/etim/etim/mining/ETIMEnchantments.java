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
    // batch melee1 (B2 三条, 条 249-251): R196 ids 80/84/91.
    public static Enchantment STUN;
    public static Enchantment VAMPIRIC;
    public static Enchantment DISARMING;
    // batch farm1 (B4 农作两条, 条 254-257): R196 ids 82/93.
    public static Enchantment FERTILITY;
    public static Enchantment HARVESTING;
    // batch B5 butchering (条 262-265): R196 id 94 — the 14th registered enchant.
    public static Enchantment BUTCHERING;
    // batch five fishing (条 268-271): R196 ids 81/51 — the 15th/16th enchants
    // (both five-level defaults; carriers fishing-rod / bow family faces).
    public static Enchantment FISHING_FORTUNE;
    public static Enchantment ARROW_RECOVERY;
    // batch six D-1 pool (条 274-277): R196 id 87 — the 17th enchant (D-C 甲;
    // leggings slot, 4 levels native; effect face debt-registered 条 278).
    public static Enchantment FREE_ACTION;

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
        // Batch melee1 (B2 — 条 249-251): stun/vampiric/disarming, three
        // levels keyed case-M windows, the shared ETIMMelee helper rides the
        // two mixins MixinEntityPlayerMelee / MixinEntityMobMelee.
        STUN = new io.github.etim.etim.combat.EnchantmentStun();
        STUN.setRegistryName(new ResourceLocation(Tags.MOD_ID, "stun"));
        ForgeRegistries.ENCHANTMENTS.register(STUN);
        VAMPIRIC = new io.github.etim.etim.combat.EnchantmentVampiric();
        VAMPIRIC.setRegistryName(new ResourceLocation(Tags.MOD_ID, "vampiric"));
        ForgeRegistries.ENCHANTMENTS.register(VAMPIRIC);
        DISARMING = new io.github.etim.etim.combat.EnchantmentDisarming();
        DISARMING.setRegistryName(new ResourceLocation(Tags.MOD_ID, "disarming"));
        ForgeRegistries.ENCHANTMENTS.register(DISARMING);
        // Batch farm1 (B4 — 条 254-257): fertility/harvesting, the two
        // farming entries riding the fraction read (F3) and the fertilized
        // TE carrier; the shared ETIMFarm helper + ETIMFarmingEvents bus.
        FERTILITY = new io.github.etim.etim.farm.EnchantmentFertility();
        FERTILITY.setRegistryName(new ResourceLocation(Tags.MOD_ID, "fertility"));
        ForgeRegistries.ENCHANTMENTS.register(FERTILITY);
        HARVESTING = new io.github.etim.etim.farm.EnchantmentHarvesting();
        HARVESTING.setRegistryName(new ResourceLocation(Tags.MOD_ID, "harvesting"));
        ForgeRegistries.ENCHANTMENTS.register(HARVESTING);
        // Batch B5 (butchering — 条 262-265): R196 id 94, 3 levels, integer-level
        // read (no fraction helper); carriers = ETIMItemKnifeFlint + ETIMItemDagger.
        BUTCHERING = new io.github.etim.etim.combat.EnchantmentButchering();
        BUTCHERING.setRegistryName(new ResourceLocation(Tags.MOD_ID, "etim_butchering"));
        ForgeRegistries.ENCHANTMENTS.register(BUTCHERING);
        // Batch five (fishing — 条 268-271): R196 ids 81/51, both five levels
        // by default (no getNumLevels override); carriers = ItemFishingRod /
        // ItemBow family faces. fishing_fortune = bite-cascade multiplier;
        // arrow_recovery = the contained-arrow guaranteed band.
        FISHING_FORTUNE = new io.github.etim.etim.fishing.EnchantmentFishingFortune();
        FISHING_FORTUNE.setRegistryName(new ResourceLocation(Tags.MOD_ID, "fishing_fortune"));
        ForgeRegistries.ENCHANTMENTS.register(FISHING_FORTUNE);
        ARROW_RECOVERY = new io.github.etim.etim.fishing.EnchantmentArrowRecovery();
        ARROW_RECOVERY.setRegistryName(new ResourceLocation(Tags.MOD_ID, "arrow_recovery"));
        ForgeRegistries.ENCHANTMENTS.register(ARROW_RECOVERY);
        // Batch six D-1 pool (条 274-277): R196 id 87, the 17th entry.
        FREE_ACTION = new io.github.etim.etim.combat.EnchantmentFreeAction();
        FREE_ACTION.setRegistryName(new ResourceLocation(Tags.MOD_ID, "free_action"));
        ForgeRegistries.ENCHANTMENTS.register(FREE_ACTION);
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
        ETIM.LOGGER.info("[EtimInit] enchant{} ids={} {} {} {} {} {} {} {} {} {} {} {} {} {}",
                SPEED.getRegistryName(),
                Enchantment.getEnchantmentID(SPEED),
                Enchantment.getEnchantmentID(REGENERATION),
                Enchantment.getEnchantmentID(POISON),
                Enchantment.getEnchantmentID(TRUE_FLIGHT),
                Enchantment.getEnchantmentID(QUICKNESS),
                Enchantment.getEnchantmentID(STUN),
                Enchantment.getEnchantmentID(VAMPIRIC),
                Enchantment.getEnchantmentID(DISARMING),
                Enchantment.getEnchantmentID(FERTILITY),
                Enchantment.getEnchantmentID(HARVESTING),
                Enchantment.getEnchantmentID(BUTCHERING),
                Enchantment.getEnchantmentID(FISHING_FORTUNE),
                Enchantment.getEnchantmentID(ARROW_RECOVERY),
                Enchantment.getEnchantmentID(FREE_ACTION));
    }
}
