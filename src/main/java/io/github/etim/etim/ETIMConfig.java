package io.github.etim.etim;

import io.github.etim.etim.crafting.CraftingDifficulty;
import io.github.etim.etim.furnace.FurnaceHeat;
import io.github.etim.etim.furnace.FurnaceXpRewards;
import io.github.etim.etim.quality.ETIMQuality;
import net.minecraft.client.Minecraft;
import net.minecraftforge.common.config.Configuration;
import net.minecraftforge.fml.common.event.FMLPreInitializationEvent;
import net.minecraftforge.fml.common.FMLCommonHandler;
import net.minecraftforge.fml.relauncher.Side;

/**
 * ETIM configuration (config/etim.cfg, standard Forge Configuration).
 *
 * <p>Every player-perceivable tuning value and gameplay toggle lives here;
 * mechanic code reads these statics directly. Values load once in preInit
 * (runtime reload is not wired: changing requires a restart) and invalid
 * values abort the mod load — no fallback, per the project constraints.</p>
 *
 * <p>Option comments are written in the game's language (Chinese when the
 * client runs zh*, English otherwise, plain English on dedicated servers).
 * The comment language is decided when the file is first generated; a
 * later language change does not rewrite an existing file.</p>
 */
public final class ETIMConfig {

    // playerCaps -------------------------------------------------
    /** Health/food cap (in points, 2 = one icon) at level 0. */
    public static int capAtLevel0 = 6;
    /** Cap added (in points) per 5 levels. */
    public static int capGrowthPerFiveLevels = 2;
    /** Highest cap the level table can reach. */
    public static int capMaximum = 20;

    // leveling ----------------------------------------------------
    /** Hard cap of player levels. */
    public static int levelCap = 200;
    /** Mining speed bonus fraction per level. */
    public static float miningSpeedPerLevel = 0.02F;
    /** Melee damage bonus fraction per level. */
    public static float meleeDamagePerLevel = 0.005F;

    // regen (sleep/bed side of the food model) ---------------------
    /** Heal rate multiplier while LYING IN A BED (R196: 4x, any time of day). */
    public static float bedRegenFactor = 4.0F;
    /** Allow lying in a bed during the day purely for the regen boost (MITE behavior). */
    public static boolean allowDayBedRegen = true;

    // food (task 1.5 R196 dual-pool model) ---------------------------
    /** Master switch: R196 satiation/nutrition dual-pool model (false = vanilla food bar system). */
    public static boolean foodModel = true;
    /** Hunger pool accrual per tick (R196 FoodStats.getHungerPerTick 0.002). */
    public static float hungerGainPerTick = 0.002F;
    /** Hunger pool units per consumed food point (R196 getHungerPerFoodUnit 4.0). */
    public static float hungerPerFoodUnit = 4.0F;
    /** The nutrition-only accumulator accrual factor (R196 :43 = 0.002×0.25 per tick). */
    public static float hungerNutritionOnlyFactor = 0.25F;
    /** Hunger pool cap (R196 addHunger clamp 40.0). */
    public static float hungerPoolCap = 40.0F;
    /** Starve progress accrual per tick at nutrition 0 (R196 :64 = 0.002). */
    public static float starveGainPerTick = 0.002F;
    /** Health above which starving players take no starve damage (R196 :66 = 10.0). */
    public static float starveHealthCeiling = 10.0F;
    /** Heal progress base per tick (R196 :77 = 4.0E-4). */
    public static float healBasePerTick = 0.0004F;
    /** Additional heal progress per tick per nutrition point (R196 :77 = 2.0E-5). */
    public static float healPerNutritionPerTick = 0.00002F;
    /** Hunger pool charge per damage event taken while lying in a bed (R196 :58-60 ≈ 0.04). */
    public static float inBedHitListHunger = 0.04F;
    /** Hungrover sleepers are woken with a message (R196 EntityPlayer:421-429; nutrition == 0). */
    public static boolean hungerSleepDeny = true;
    /** TEST compression: hunger accrual and starve progress ×5 (burn a unit every 20 s, a starve strike every 5 s). */
    public static boolean foodTestMode = false;
    /** Server-log every pool mutation/eat/starve strike as [FoodLog] lines (dev channel). */
    public static boolean foodDebugLog = true;

    /** Task 2.4 (ingestion): use duration for all R196-ingestible items (R196 §四: every
     *  eating/drinking family runs 32 ticks — ItemFood/ItemBowl/ItemPotion/ItemBucketMilk). */
    public static int ingestUseDurationTicks = 32;

    /** Task 2.4 (ingestion): [IngestLog] server dev channel for routing/refusal decisions. */
    public static boolean ingestDebugLog = true;
    /** TEST-mode multipliers of the R196 pacing (hunger accrual + starve progress ×5). */
    private static final float TEST_MODE_MULTIPLIER = 5.0F;

    /** Hunger accrual actually in effect (test compression multiplies it). */
    public static float effectiveHungerGainPerTick() {
        return hungerGainPerTick * (foodTestMode ? TEST_MODE_MULTIPLIER : 1.0F);
    }

    /** Starve progress accrual actually in effect (test compression multiplies it). */
    public static float effectiveStarveGainPerTick() {
        return starveGainPerTick * (foodTestMode ? TEST_MODE_MULTIPLIER : 1.0F);
    }

    /** Hunger rate factor while malnourished (R196 ServerPlayer:1845 = 0.5; the regen factor is the 0.25 in nutrition). */
    public static float malnourishedHungerFactor = 0.5F;
    /** Wetness factor for standing in (light) rain (R196 ServerPlayer:1830 = 0.25). */
    public static float wetnessRainLight = 0.25F;
    /** Wetness factor for standing in a thunderstorm's rain (R196 ServerPlayer:1830 = 0.5). */
    public static float wetnessRainThunder = 0.5F;
    /** Wetness factor when the head's block is water (R196 ServerPlayer:1831-1832 = 0.5). */
    public static float wetnessImmerseAbove = 0.5F;
    /** Wetness factor when the feet's block is water (R196 ServerPlayer:1833 = 0.25). */
    public static float wetnessImmerseBelow = 0.25F;
    /** Extra wetness for light rain + feet-only immersion combo (R196 ServerPlayer:1836 = 0.125). */
    public static float wetnessCombo = 0.125F;
    /** Multiplier when the biome is freezing (R196 ServerPlayer:1840 = 2.0). */
    public static float wetnessFreezingMultiplier = 2.0F;
    /** Biome temperature at or below which the freeze multiplier applies (≈ R196 isBiomeFreezing). */
    public static float wetnessFreezingTemperature = 0.15F;
    /** Biome temperature at or above which wetness is washed out entirely (≈ R196 desertRiver rule). */
    public static float wetnessHotExemptTemperature = 1.0F;

    // nutrition ---------------------------------------------------
    /** Full pool size, in ticks (R196: 160000 = 20 nutrition points worth). */
    public static int nutritionPoolMax = 160000;
    /** Pool tick gain per food nutrition point (R196: 8000). */
    public static int nutritionTicksPerPoint = 8000;
    /** Sugar content → insulin response conversion (R196 MITEConstant 4.8). */
    public static float sugarToInsulin = 4.8F;
    /** Insulin resistance cap (R196 MITEConstant: 192000). */
    public static int insulinCap = 192000;
    /** Insulin resistance level thresholds (R196: 48000/96000/144000). */
    public static int insulinThresholdMild = 48000;
    public static int insulinThresholdModerate = 96000;
    public static int insulinThresholdSevere = 144000;
    /** Regen rate factor while malnourished (R196: 0.25). */
    public static float malnourishedRegenFactor = 0.25F;

    // reach ---------------------------------------------------------
    /** Block selection/breaking reach with a bare hand (R196 EntityPlayer:2179 = 2.75). */
    public static float blockReachBase = 2.75F;
    /** Bare-hand melee attack reach; held weapons add their bonus (R196 EntityPlayer:2207 = 1.5). */
    public static float meleeReachBase = 1.5F;
    /** Entity interaction (right-click) reach (R196 EntityPlayer:2210-2213 = 2.5). */
    public static float interactionReachBase = 2.5F;
    /** Extended 5.0 reach while in creative mode (R196 hasExtendedReach). */
    public static float creativeReach = 5.0F;
    /** Reach bonus of generic tools/weapons — swords, pickaxes, axes, shovels
     * (R196 ItemTool base class, ItemSword extends it: 0.75). */
    public static float reachBonusTool = 0.75F;
    /** Reach bonus of stick/bone and shears (R196 Item.java:33/188 + ItemShears.java:8 = 0.5). */
    public static float reachBonusSmall = 0.5F;
    /** Server-side validation headroom against lag and metric differences. */
    public static float reachServerTolerance = 0.25F;

    /** Entity raycast hit-test expansion: origins hit the AABB grown by this border (R196 Entity.getCollisionBorderSize default = 0.1). */
    public static float entityHitboxExpansion = 0.1F;
    /** Chat feedback when the server rejects a reach-denied action (debug/test data channel). */
    public static boolean reachDenialFeedback = true;

    /** Master switch of the task-2.2 mining reform (progress formula + drop gate). */
    public static boolean miningReform = true;

    // hunger (task 2.3) ----------------------------------------------
    /** Crafting output can't be taken while hungry (R196 freezes the craft timer: MITEContainerCrafting:96). */
    public static boolean hungerCraftDeny = true;
    /** Blocks with hardness > 0 can't be placed while hungry (R196 Block.java:2822; hardness-0 blocks stay placeable). */
    public static boolean hungerPlaceDeny = true;
    /** Walk AND air movement multiplier while hungry (R196: 0.75, PlayerCapabilities.java:57 + EntityPlayer.java:693). */
    public static float hungerMoveFactor = 0.75F;
    /** Sprint start/continue requires food energy (R196 ClientPlayer.java:129). */
    public static boolean hungerSprintDeny = true;
    /** Bare-hand melee turns into a weak strike (zero damage) when hungry (R196 EntityPlayer.java:2789). */
    public static boolean hungerWeakStrike = true;
    /** Weak-strike knockback as a fraction of the normal knockback (R196 EntityLivingBase:706 = 0.6 of 1.0). */
    public static float weakStrikeKnockbackFactor = 0.6F;
    /** Player health below which strikes are weak even when fed (R196 EntityPlayer.java:2791 = 2.0). */
    public static float weakStrikeHealthThreshold = 2.0F;
    /** Dig strength divisor while hungry (R196 EntityPlayer.java:938-940 = ÷5). */
    public static float hungerDigStrDivisor = 5.0F;
    /** Chat/action-bar feedback when a hunger gate denies an action (dev/test channel). */
    public static boolean hungerDenialFeedback = true;


    /** Maximum level of the tree-felling enchant (ToolSuite audit: level per-log recursion depth). */
    public static int treeFellingMaxLevel = 10;
    /** Length of the debug overlay's DISPLAY-ONLY ray (never affects gameplay). */
    public static float debugRayLength = 8.0F;


    // crafting (stage 3, batch 1: server-authoritative craft timer) --------------
    /** Master switch of the R196 crafting timer (false = vanilla instant crafting). */
    public static boolean craftingTimer = true;
    /** Creative players keep vanilla instant crafting (test convenience switch). */
    public static boolean craftingSkipCreative = true;
    /** Crafting speed bonus fraction per level (R196 getLevelModifier CRAFTING = 0.02). */
    public static float craftingSpeedPerLevel = 0.02F;
    /** Bench speed modifier of the vanilla crafting table (R196 lowest bench tier = 0.2). */
    public static float craftingBenchModifier = 0.2F;
    /** Minimum crafting period in ticks (R196 floor = 25). */
    public static int craftingPeriodFloor = 25;
    /** Exponent of the difficulty>100 period curve (R196 pow(d−100, 0.8)+100). */
    public static float craftingCurveExponent = 0.8F;
    /** Difficulty of unlisted generic ingredients (R196 §4.1 one-family = 25). */
    public static float craftingGenericDifficulty = 25.0F;
    /** Craft progress in ticks lost per whole damage point taken (R196 = 50 = 2.5 s). */
    public static int craftingDamagePenaltyPerDamagePoint = 50;
    /** Chat line when a craft completes (dev/test feedback channel). */
    public static boolean craftingCompleteFeedback = true;
    /** Chat line when a craft starts, with the expected duration (dev/test feedback channel). */
    public static boolean craftingStartFeedback = true;
    /** Fill the crafting arrow with white progress (MITE GUI look). */
    public static boolean craftingProgressArrow = true;
    /** Server-log [CraftingLog] lines for period sets, starts, penalties and completions (dev channel). */
    public static boolean craftingDebugLog = true;
    /** Batch-3 master switch of the R196 quality ladder (false = vanilla-no-quality v1). */
    public static boolean qualitySystem = true;
    /** Batch-3: chat line when the right-click quality cycling changes the rung (dev/test channel). */
    public static boolean craftingQualityFeedback = true;
    /** Batch-3: max quality rung (0..7) for items with no mapped material (R196 material rows only for knowns). */
    public static int qualityDefaultMax = 5;
    /** Batch-3: per-item max-quality overrides as "registryName=0..7" CSV, beating the material mapping. */
    public static String qualityMaxOverrides = "";
    /** Batch-3: crafting freezes when the player's upper body is inside a spider web (R196 SlotCrafting:155-157). */
    public static boolean craftingWebDeny = true;
    /** Batch-3: any damaged item in the crafting grid freezes the craft (R196 MITEContainerCrafting:178-181). */
    public static boolean craftingDamagedDeny = true;
    /** Batch-3: completion effect — level-up sound + witch sparkles (user-named dot, off until picked). */
    public static boolean craftingFx = false;

    // furnace (stage 4 batch A: heat gate on the vanilla furnace) -------------
    /** Master switch of the R196 heat ladder on the vanilla furnace tier. */
    public static boolean furnaceHeatSystem = true;
    /** Vanilla furnace cap (R196 cobblestone tier). */
    public static int furnaceVanillaMaxHeat = 2;
    /** Server-log [FurnaceLog] lines for heat denials (dev channel). */
    public static boolean furnaceDebugLog = true;
    /** Batch-B: R196 fuel burn times replace vanilla where they differ (audit 9 §2.2). */
    public static boolean furnaceBurnTimeR196 = true;
    /** Batch-C: furnace take pays the R196 per-item reward as one orb (audit 9 §1.4). */
    public static boolean furnaceXpRewards = true;
    /** Batch-B GUI hints: gold noSmelt/notFuel/tooHot text when a carried item is refused by a furnace slot. */
    public static boolean furnaceGuiHints = true;

    public static boolean furnaceInputRecipeGate = true;

    // death (stage 4 batch C: death chain / 8.3) ------------------------------
    /** Death drops total/3 as XP orbs at the death spot (R196 xp/3 verdict). */
    public static boolean deathXpOrbs = true;
    /** Death settles the XP balance (orb drop aside, R196 deposit/refill verdict: respawn = total − 20 sub-1, stale above). */
    public static boolean deathXpSettle = true;
    /** Server-log [DeathLog] lines for the death chain (dev channel). */
    public static boolean deathDebugLog = true;

    // mobs (stage 5 slice 1: R196 despawn chain) ------------------------------
    /** Master switch of the R196 despawn chain (audit 11 §2.1): view-resets, mob-path hold, animal walls, zombie-villager hold, hour-of-grace dy and the counter≥200 kill pass. Off = vanilla 1.12 despawn. */
    public static boolean mobDespawnR196 = true;
    /** Master switch of the R196 per-class mob attribute table (audit 11 §3.1): skeleton 6 hp/4 atk/32 follow, zombie 5 atk/32 follow/0 armor, pigman 8 atk, spider 12 hp/4 atk/28 follow. Off = vanilla 1.12 attributes. */
    public static boolean mobStatsR196 = true;
    /** Master switch of the R196 livestock wellness pipeline (audit 11 §2.2 v1: needs floats + supervision, production comes later). Off = vanilla livestock carries nothing. */
    public static boolean livestockNeedsR196 = true;
    /** Server-log [AILog] lines for despawn kills, holds and rerolls (dev channel). */
    public static boolean mobDebugLog = true;
    /** Master switch of the R196 spawn cycle (audit 11 §4 + audit 14): cap table 50/10/5/5 over /256, hostile dual probability rings, the modifier four events and the admission fine print. Off = vanilla 1.12 world-entity spawner. */
    public static boolean mobSpawnR196 = true;
    /** R196 spawn caps per creature type (audit 14 §2.1/§2.2): monster 50, animal 10, ambient 5, aquatic 5 — before the ×chunks/256 conversion. */
    public static int spawnCapMonster = 50;
    public static int spawnCapAnimal = 10;
    public static int spawnCapAmbient = 5;
    public static int spawnCapAquatic = 5;
    /** Forced moon overlay state for the spawn cycle ("", "blue", "blood", "full", "new") — test determinism; stage 6 replaces the backend. */
    public static String moonStateOverride = "";

    // compat group: interop switches (rule 2 — player-perceivable, configurable)
    /** Crafting Tweaks rightClickCraftsStack auto-disable (see CraftingTweaksCompat). */
    public static boolean compatCraftingTweaksFix = true;

    // devtools ----------------------------------------------------
    /** Master switch of the DEV TEST FACILITIES: the GRAVE-key debug HUD
     * (ETIMDebugOverlay) and the /etest state command. Off = player-facing
     * release behaves as if they never existed (no overlay, command not
     * registered). Requires a restart (like every other key). */
    public static boolean devTools = true;

    private static boolean chinese;

    private ETIMConfig() {
    }

    public static void init(FMLPreInitializationEvent event) {
        chinese = isChineseLocale();
        Configuration config = new Configuration(event.getSuggestedConfigurationFile());

        capAtLevel0 = config.getInt("capAtLevel0", "playerCaps", capAtLevel0, 2, 2000,
                comment("Health/food cap (points; 2 points = one icon) at level 0",
                        "0级时的生命/饥饿上限（点数；2点=1个图标/半心）"));
        capGrowthPerFiveLevels = config.getInt("capGrowthPerFiveLevels", "playerCaps", capGrowthPerFiveLevels, 0, 100,
                comment("Cap added per full 5 levels (points)",
                        "每满5级增加的上限（点数）"));
        capMaximum = config.getInt("capMaximum", "playerCaps", capMaximum, 2, 2000,
                comment("Highest reachable cap (points)",
                        "上限天花板（点数）"));

        levelCap = config.getInt("levelCap", "leveling", levelCap, 0, 2000,
                comment("Hard cap of player levels", "玩家等级硬上限"));
        miningSpeedPerLevel = config.getFloat("miningSpeedPerLevel", "leveling", miningSpeedPerLevel, 0.0F, 10.0F,
                comment("Mining speed bonus fraction per level", "每级挖掘速度加成（0.02=2%）"));
        meleeDamagePerLevel = config.getFloat("meleeDamagePerLevel", "leveling", meleeDamagePerLevel, 0.0F, 10.0F,
                comment("Melee damage bonus fraction per level", "每级近战伤害加成（0.005=0.5%）"));

        bedRegenFactor = config.getFloat("bedRegenFactor", "regen", bedRegenFactor, 1.0F, 100.0F,
                comment("Heal rate multiplier while lying in a bed (MITE R196: 4x)",
                        "躺在床上的回血倍率（MITE R196 为4倍）"));
        allowDayBedRegen = config.getBoolean("allowDayBedRegen", "regen", true,
                comment("Allow lying in a bed during the day purely for the regen boost (MITE behavior)",
                        "允许白天躺床来获得回血加速（MITE 行为），关闭则白天不能上床"));

        foodModel = config.getBoolean("foodModel", "food", true,
                comment("R196 dual-pool food model (task 1.5): satiation+nutrition pools, wetness hunger, starve/heal rules. Off = vanilla hunger bar",
                        "R196 双池食物模型（任务 1.5）：饱食+营养双池、湿冷饥饿、饿伤/回血规则。关闭则回到原版饥饿条"));
        hungerGainPerTick = config.getFloat("hungerGainPerTick", "food", hungerGainPerTick, 0.0F, 1.0F,
                comment("Hunger pool accrual per tick (R196: 0.002; multiplied by the wetness factor)",
                        "每tick饥饿池积攒量（R196 为 0.002；再乘湿冷系数）"));
        hungerPerFoodUnit = config.getFloat("hungerPerFoodUnit", "food", hungerPerFoodUnit, 0.1F, 100.0F,
                comment("Hunger pool units per consumed food point (R196: 4.0)",
                        "每消耗1点食物所需消耗的饥饿池单位（R196 为 4.0）"));
        hungerNutritionOnlyFactor = config.getFloat("hungerNutritionOnlyFactor", "food", hungerNutritionOnlyFactor, 0.0F, 1.0F,
                comment("Accrual factor of the nutrition-only accumulator (R196: 0.002×0.25 per tick); a full accumulator makes the next eaten point come from nutrition",
                        "营养独占积分器的积攒系数（R196 为每tick 0.002×0.25）；积满后下一个被吃的点取自营养池"));
        hungerPoolCap = config.getFloat("hungerPoolCap", "food", hungerPoolCap, 1.0F, 1000.0F,
                comment("Hunger pool cap (R196: 40.0)",
                        "饥饿池上限（R196 为 40.0）"));
        starveGainPerTick = config.getFloat("starveGainPerTick", "food", starveGainPerTick, 0.0F, 1.0F,
                comment("Starve progress accrual per tick while nutrition == 0 (R196: 0.002, one strike per 500 ticks = 25 s)",
                        "营养为0时每tick饿伤进度（R196 为 0.002，即每500tick=25秒掉一次"));
        starveHealthCeiling = config.getFloat("starveHealthCeiling", "food", starveHealthCeiling, 0.0F, 2000.0F,
                comment("Health above which starving players are immune (R196: 10.0); difficulty ≥ 3 or health > 1 && difficulty ≥ 2 also allow the strike",
                        "生命高于该值时饿伤免疫（R196 为 10.0）；难度≥3 或 生命>1 且难度≥2 时照样挨打"));
        healBasePerTick = config.getFloat("healBasePerTick", "food", healBasePerTick, 0.0F, 0.1F,
                comment("Heal progress base per tick (R196: 4.0E-4), full 1.0 = one HP",
                        "每tick基础回血进度（R196 为 4.0E-4），满 1.0 回1点生命"));
        healPerNutritionPerTick = config.getFloat("healPerNutritionPerTick", "food", healPerNutritionPerTick, 0.0F, 0.1F,
                comment("Additional heal progress per tick per nutrition point (R196: 2.0E-5)",
                        "每tick每点营养额外回血进度（R196 为 2.0E-5）"));
        inBedHitListHunger = config.getFloat("inBedHitListHunger", "food", inBedHitListHunger, 0.0F, 10.0F,
                comment("Hunger pool charge per damage taken while lying in a bed (R196 FoodStats:58-60 ≈ 0.04/tick on its hit-list; ETIM charges per damage event)",
                        "躺床时每次被打收取的饥饿（R196 FoodStats:58-60 每tick约0.04；ETIM 改为每次受击计一次）"));
        hungerSleepDeny = config.getBoolean("hungerSleepDeny", "food", true,
                comment("Players with nutrition == 0 cannot sleep: lie-down is refused / sleepers are woken (R196 EntityPlayer:421-429, tile.bed.wakeHungry/tooHungry)",
                        "营养为0时无法睡觉：已躺下的会被踢醒（R196 EntityPlayer:421-429，wakeHungry/tooHungry 语义）"));
        foodTestMode = config.getBoolean("foodTestMode", "food", false,
                comment("TEST compression: hunger accrual and starve progress ×5 (a food unit burns every 20 s, a starve strike every 5 s)",
                        "测试压缩：饥饿积累与饿伤进度×5（每20秒烧掉1点食物、每5秒掉一次饿伤）"));
        foodDebugLog = config.getBoolean("foodDebugLog", "food", true,
                comment("Server log [FoodLog] lines for eats, pool consumption, starve strikes and bed events (dev channel)",
                        "服务端日志 [FoodLog] 行：进食、池消耗、饿伤判定与床事件（开发通道）"));
        ingestUseDurationTicks = config.getInt("ingestUseDurationTicks", "food", ingestUseDurationTicks, 1, 200,
                comment("Use duration in ticks for the R196-ingestible items added by the ingestion task (sugar / mushrooms / egg). R196 runs every eating/drinking family at 32 ticks",
                        "可食化任务新增件（糖/蘑菇/蛋）的食用时长（tick）。R196 全部吃/喝家族固定 32 tick"));
        ingestDebugLog = config.getBoolean("ingestDebugLog", "food", true,
                comment("Server log [IngestLog] lines for ingestion routing: what starts eating, what is refused, egg eat/throw fork (dev channel)",
                        "服务端日志 [IngestLog] 行：可食化路由——开吃、拒绝与蛋的吃/掷分叉（开发通道）"));
        malnourishedHungerFactor = config.getFloat("malnourishedHungerFactor", "food", malnourishedHungerFactor, 0.0F, 10.0F,
                comment("Hunger rate factor while malnourished (R196: 0.5 added to the multiplier)",
                        "营养不良时的饥饿消耗附加系数（R196 为 0.5，加在倍率上）"));
        wetnessRainLight = config.getFloat("wetnessRainLight", "food", wetnessRainLight, 0.0F, 10.0F,
                comment("Wetness factor for standing in light rain (R196: 0.25)",
                        "雨中站立的湿冷系数（R196 为 0.25）"));
        wetnessRainThunder = config.getFloat("wetnessRainThunder", "food", wetnessRainThunder, 0.0F, 10.0F,
                comment("Wetness factor for standing in a thunderstorm (R196: 0.5)",
                        "雷暴中站立的湿冷系数（R196 为 0.5）"));
        wetnessImmerseAbove = config.getFloat("wetnessImmerseAbove", "food", wetnessImmerseAbove, 0.0F, 10.0F,
                comment("Wetness factor when the head's block is water (R196: 0.5)",
                        "头部方块为水时的湿冷系数（R196 为 0.5）"));
        wetnessImmerseBelow = config.getFloat("wetnessImmerseBelow", "food", wetnessImmerseBelow, 0.0F, 10.0F,
                comment("Wetness factor when only the feet's block is water (R196: 0.25)",
                        "仅脚部方块为水时的湿冷系数（R196 为 0.25）"));
        wetnessCombo = config.getFloat("wetnessCombo", "food", wetnessCombo, 0.0F, 10.0F,
                comment("Extra wetness for light rain + feet-only immersion (R196: 0.125)",
                        "小雨+仅脚部浸水的附加湿冷（R196 为 0.125）"));
        wetnessFreezingMultiplier = config.getFloat("wetnessFreezingMultiplier", "food", wetnessFreezingMultiplier, 1.0F, 100.0F,
                comment("Multiplier when the biome is freezing (R196: 2.0)",
                        "寒冷群系时湿冷倍率（R196 为 2.0）"));
        wetnessFreezingTemperature = config.getFloat("wetnessFreezingTemperature", "food", wetnessFreezingTemperature, -2.0F, 2.0F,
                comment("Biome temperature at or below which the freeze multiplier applies (≈ R196 isBiomeFreezing)",
                        "群系温度低于该值时按寒冷处理（≈ R196 isBiomeFreezing）"));
        wetnessHotExemptTemperature = config.getFloat("wetnessHotExemptTemperature", "food", wetnessHotExemptTemperature, 0.0F, 5.0F,
                comment("Biome temperature at or above which wetness is washed out entirely (≈ R196 desertRiver rule)",
                        "群系温度高于该值时湿冷全部免除（≈ R196 沙漠河规则）"));

        nutritionPoolMax = config.getInt("nutritionPoolMax", "nutrition", nutritionPoolMax, 1000, 10000000,
                comment("Full nutrient pool size, in ticks (R196: 160000 = 20 nutrition points)",
                        "营养池容量（tick），R196 为 160000 = 20 点营养"));
        nutritionTicksPerPoint = config.getInt("nutritionTicksPerPoint", "nutrition", nutritionTicksPerPoint, 1, 1000000,
                comment("Pool tick gain per food nutrition point (R196: 8000)",
                        "每点营养为营养池带来的 tick 增益（R196 为 8000）"));
        sugarToInsulin = config.getFloat("sugarToInsulin", "nutrition", sugarToInsulin, 0.0F, 100.0F,
                comment("Sugar content → insulin response conversion (R196: 4.8)",
                        "糖含量→胰岛素响应的换算系数（R196 为 4.8）"));
        insulinCap = config.getInt("insulinCap", "nutrition", insulinCap, 1000, 10000000,
                comment("Insulin resistance cap (R196: 192000)",
                        "胰岛素抵抗上限（R196 为 192000）"));
        insulinThresholdMild = config.getInt("insulinThresholdMild", "nutrition", insulinThresholdMild, 0, 10000000,
                comment("Insulin resistance threshold for the mild level (R196: 48000)",
                        "轻度胰岛素抵抗阈值（R196 为 48000）"));
        insulinThresholdModerate = config.getInt("insulinThresholdModerate", "nutrition", insulinThresholdModerate, 0, 10000000,
                comment("Insulin resistance threshold for the moderate level (R196: 96000); moderate/severe cannot eat sugars",
                        "中度胰岛素抵抗阈值（R196 为 96000）；中度及以上不能再吃含糖食物"));
        insulinThresholdSevere = config.getInt("insulinThresholdSevere", "nutrition", insulinThresholdSevere, 0, 10000000,
                comment("Insulin resistance threshold for the severe level (R196: 144000)",
                        "重度胰岛素抵抗阈值（R196 为 144000）"));
        malnourishedRegenFactor = config.getFloat("malnourishedRegenFactor", "nutrition", malnourishedRegenFactor, 0.0F, 1.0F,
                comment("Regen rate factor while malnourished (R196: 0.25 = a quarter speed)",
                        "营养不良时的回血倍率（R196 为 0.25 = 1/4 速度）"));

        blockReachBase = config.getFloat("blockReachBase", "reach", blockReachBase, 0.1F, 32.0F,
                comment("Block reach with a bare hand (R196: 2.75); tools effective against the block add their bonus",
                        "空手可触及方块的直线距离（R196 为 2.75）；工具对联类方块生效时加其加成"));
        meleeReachBase = config.getFloat("meleeReachBase", "reach", meleeReachBase, 0.1F, 32.0F,
                comment("Bare-hand melee attack reach with ±1 elevation advantage (R196: 1.5); weapons add their bonus",
                        "空手近战攻击距离，附加高低差 ±1（R196 为 1.5）；持武器加其加成"));
        interactionReachBase = config.getFloat("interactionReachBase", "reach", interactionReachBase, 0.1F, 32.0F,
                comment("Entity interaction (right-click) reach with the elevation advantage (R196: 2.5)",
                        "对实体的交互（右键）距离，附加高低差（R196 为 2.5）"));
        creativeReach = config.getFloat("creativeReach", "reach", creativeReach, 0.1F, 64.0F,
                comment("Extended reach while in creative mode (R196: 5.0)",
                        "创造模式的加长触及距离（R196 为 5.0）"));
        reachBonusTool = config.getFloat("reachBonusTool", "reach", reachBonusTool, 0.0F, 32.0F,
                comment("Reach bonus of swords/pickaxes/axes/shovels (R196 ItemTool: 0.75)",
                        "剑/镐/斧/铲的触及加成（R196 ItemTool 为 0.75）"));
        reachBonusSmall = config.getFloat("reachBonusSmall", "reach", reachBonusSmall, 0.0F, 32.0F,
                comment("Reach bonus of stick/bone and shears (R196: 0.5)",
                        "木棍/骨头与剪刀的触及加成（R196 为 0.5）"));
        reachServerTolerance = config.getFloat("reachServerTolerance", "reach", reachServerTolerance, 0.0F, 2.0F,
                comment("Server-side validation headroom (lag tolerance)",
                        "服务端校验的宽松余量（网络延迟容差）"));
        entityHitboxExpansion = config.getFloat("entityHitboxExpansion", "reach", entityHitboxExpansion, 0.0F, 2.0F,
                comment("Entity hit-test box expansion for ray reach (R196 collision border size default = 0.1)",
                        "实体触及射线判定的命中盒外扩量（R196 碰撞边界默认 0.1）"));
        reachDenialFeedback = config.getBoolean("reachDenialFeedback", "reach", true,
                comment("Chat feedback when the server rejects an action for being out of reach (dev/test data channel)",
                        "服务端拒绝超出触及的动作时发送聊天反馈（开发/测试数据通道）"));
        debugRayLength = config.getFloat("debugRayLength", "reach", debugRayLength, 1.0F, 64.0F,
                comment("Length of the debug overlay's DISPLAY-ONLY ray (never affects gameplay)",
                        "调试覆盖显示用的射线长度（不影响游戏判定）"));
        miningReform = config.getBoolean("miningReform", "mining", true,
                comment("R196 mining reform (task 2.2): MITE dig-progress formula, tool-level gating and hardness table",
                        "R196 挖掘改革（任务 2.2）：MITE 挖掘进度公式、工具等级门控与硬度表"));
        treeFellingMaxLevel = config.getInt("treeFellingMaxLevel", "mining", treeFellingMaxLevel, 1, 20,
                comment("Maximum level of the tree-felling enchant (each level fells one further wood log)",
                        "树木连根附魔的最大等级（每级向上多伐一根原木）"));

        hungerCraftDeny = config.getBoolean("hungerCraftDeny", "hunger", true,
                comment("Crafting output cannot be taken while hungry (R196 MITEContainerCrafting:96 freezes the craft timer)",
                        "饥饿时无法取出合成产物（R196 MITEContainerCrafting:96 冻结合成计时）"));
        hungerPlaceDeny = config.getBoolean("hungerPlaceDeny", "hunger", true,
                comment("Blocks with hardness > 0 cannot be placed while hungry; hardness-0 blocks (torch etc.) stay placeable (R196 Block.java:2822)",
                        "饥饿时不能放置硬度>0 的方块；硬度为0的方块（火把等）仍可放置（R196 Block.java:2822）"));
        hungerMoveFactor = config.getFloat("hungerMoveFactor", "hunger", hungerMoveFactor, 0.0F, 1.0F,
                comment("Walk AND air movement multiplier while hungry (R196: 0.75)",
                        "饥饿时的走路/空中移动倍率（R196 为 0.75）"));
        hungerSprintDeny = config.getBoolean("hungerSprintDeny", "hunger", true,
                comment("Sprint start/continue requires food energy (R196 ClientPlayer.java:129)",
                        "冲刺的启动/维持需要身上还有食物能量（R196 ClientPlayer.java:129）"));
        hungerWeakStrike = config.getBoolean("hungerWeakStrike", "hunger", true,
                comment("Bare-hand melee turns into a weak strike (zero damage) when hungry (R196 EntityPlayer.java:2789)",
                        "饥饿时空手近战变为弱击（零伤害）（R196 EntityPlayer.java:2789）"));
        weakStrikeKnockbackFactor = config.getFloat("weakStrikeKnockbackFactor", "hunger", weakStrikeKnockbackFactor, 0.0F, 10.0F,
                comment("Weak-strike knockback as a fraction of normal knockback (R196 0.6)",
                        "弱击的击退强度占正常击退的比例（R196 为 0.6）"));
        weakStrikeHealthThreshold = config.getFloat("weakStrikeHealthThreshold", "hunger", weakStrikeHealthThreshold, 0.0F, 2000.0F,
                comment("Player health below which strikes are weak even when fed (R196: 2.0 = one heart)",
                        "生命低于该值时即使吃饱也弱击（R196 为 2.0 = 一心）"));
        hungerDigStrDivisor = config.getFloat("hungerDigStrDivisor", "hunger", hungerDigStrDivisor, 1.0F, 100.0F,
                comment("Dig strength divisor while hungry (R196: 5.0 = dig 5x slower)",
                        "饥饿时挖掘强度除数（R196 为 5.0 = 挖掘变慢5倍）"));
        hungerDenialFeedback = config.getBoolean("hungerDenialFeedback", "hunger", true,
                comment("Action-bar feedback when a hunger gate denies an action (dev/test channel)",
                        "饥饿门拒绝动作时发送动作栏反馈（开发/测试通道）"));

        craftingTimer = config.getBoolean("craftingTimer", "crafting", true,
                comment("R196 crafting timer (stage 3): recipes take difficulty ticks; off = vanilla instant crafting",
                        "R196 合成计时（阶段三）：配方需要难度 tick 数才完成；关闭则回到原版瞬时合成"));
        craftingSkipCreative = config.getBoolean("craftingSkipCreative", "crafting", true,
                comment("Creative players keep vanilla instant crafting",
                        "创造模式玩家保留原版瞬时合成"));
        craftingSpeedPerLevel = config.getFloat("craftingSpeedPerLevel", "crafting", craftingSpeedPerLevel, 0.0F, 10.0F,
                comment("Crafting speed bonus fraction per level (R196 CRAFTING skill: 0.02 = 2%)",
                        "每级合成速度加成（R196 合成技能为 0.02，即每级 2%）"));
        craftingBenchModifier = config.getFloat("craftingBenchModifier", "crafting", craftingBenchModifier, 0.0F, 10.0F,
                comment("Bench speed modifier of the vanilla crafting table (R196 lowest bench tier: 0.2); the 2x2 inventory grid counts as no bench (0)",
                        "合成台的提速系数（R196 最低档台面为 0.2）；2x2 随身网格视作无台面（0）"));
        craftingPeriodFloor = config.getInt("craftingPeriodFloor", "crafting", craftingPeriodFloor, 1, 1000000,
                comment("Minimum crafting period in ticks (R196: 25)",
                        "合成周期下限（tick），R196 为 25"));
        craftingCurveExponent = config.getFloat("craftingCurveExponent", "crafting", craftingCurveExponent, 0.1F, 2.0F,
                comment("Exponent of the difficulty>100 period curve (R196: pow(d−100, 0.8)+100)",
                        "难度>100 时的周期曲线指数（R196 为 pow(d−100, 0.8)+100）"));
        craftingGenericDifficulty = config.getFloat("craftingGenericDifficulty", "crafting", craftingGenericDifficulty, 0.0F, 100000.0F,
                comment("Difficulty of unlisted generic ingredients (R196 §4.1 one-family: 25)",
                        "未列名普通配料的合成难度（R196 §4.1 统一档为 25）"));
        craftingDamagePenaltyPerDamagePoint = config.getInt("craftingDamagePenaltyPerDamagePoint", "crafting", craftingDamagePenaltyPerDamagePoint, 0, 100000,
                comment("Craft progress in ticks lost per whole damage point taken while crafting (R196: 50 ticks = 2.5 s)",
                        "合成进行中每受 1 点伤害损失的进度（tick），R196 为 50 tick = 2.5 秒"));
        craftingCompleteFeedback = config.getBoolean("craftingCompleteFeedback", "crafting", true,
                comment("Chat line when a craft completes (dev/test feedback channel)",
                        "合成完成时的聊天提示（开发/测试反馈通道）"));
        craftingStartFeedback = config.getBoolean("craftingStartFeedback", "crafting", true,
                comment("Chat line when a craft starts, with the expected duration",
                        "开始合成时的聊天提示，附带预计耗时"));
        craftingProgressArrow = config.getBoolean("craftingProgressArrow", "crafting", true,
                comment("Fill the crafting GUI arrow with white progress (the arrow between grid and result slot)",
                        "合成界面的箭头以白色进度填充（网格与产物槽之间的箭头）"));
        craftingDebugLog = config.getBoolean("craftingDebugLog", "crafting", true,
                comment("Server log [CraftingLog] lines: period sets, starts, damage penalties and completions (dev channel)",
                        "服务端日志 [CraftingLog] 行：周期设定、开表、受击扣进度与完成（开发通道）"));
        qualitySystem = config.getBoolean("qualitySystem", "crafting", true,
                comment("R196 quality ladder (batch 3): right-click the result slot to cycle the rung; higher rungs cost XP and lengthen the period. Off = vanilla, no quality",
                        "R196 品质阶梯（批三）：右击产物槽循环档位；高档消耗经验并延长周期。关闭则回到原版无品质"));
        craftingQualityFeedback = config.getBoolean("craftingQualityFeedback", "crafting", true,
                comment("Chat line when right-click quality cycling changes the rung (dev/test feedback channel)",
                        "右击循环档位时的聊天提示（开发/测试反馈通道）"));
        qualityDefaultMax = config.getInt("qualityDefaultMax", "crafting", qualityDefaultMax, 0, 7,
                comment("Max quality rung for items with no mapped vanilla material: 0=wretched 1=poor 2=average 3=fine 4=excellent 5=superb 6=masterwork 7=legendary (R196 §2.4 material rows used for known materials)",
                        "无对应原版材质的物品最高品质档：0=劣质 1=贫瘠 2=普通 3=精良 4=优秀 5=华丽 6=大师之作 7=传奇（对应原版材质按 R196 §2.4 材质表取值）"));
        qualityMaxOverrides = config.getString("qualityMaxOverrides", "crafting", qualityMaxOverrides,
                comment("Per-item max-quality overrides beating the material mapping, format 'minecraft:iron_sword=6,minecraft:diamond_pickaxe=7' (empty = none)",
                        "逐物品最高品质覆盖（优先于材质映射），格式『minecraft:iron_sword=6,minecraft:diamond_pickaxe=7』（留空=无覆盖）"));
        craftingWebDeny = config.getBoolean("craftingWebDeny", "crafting", true,
                comment("Crafting freezes when the player's upper body is inside a spider web (R196 SlotCrafting:155-157); progress clears, it does not freeze",
                        "玩家上身陷在蜘蛛网内时合成清零（R196 SlotCrafting:155-157）；进度清零而非冻结"));
        craftingDamagedDeny = config.getBoolean("craftingDamagedDeny", "crafting", true,
                comment("Any damaged item placed in the crafting grid freezes the craft (R196 MITEContainerCrafting:178-181); progress clears, it does not freeze",
                        "合成格内有任何受损物品时合成清零（R196 MITEContainerCrafting:178-181）；进度清零而非冻结"));
        craftingFx = config.getBoolean("craftingFx", "crafting", false,
                comment("Completion effect: level-up sound + witch sparkles at the crafter (user-named preset; off until a visual/audio plan is picked)",
                        "合成完成特效：升级音效+巫师粒子（待裁方案暂凑；用户点名后可换）"));

        furnaceHeatSystem = config.getBoolean("furnaceHeatSystem", "furnace", true,
                comment("R196 heat ladder (stage 4 batch A): fuels carry heat levels and recipes require a minimum; lower-than-required heat = the furnace refuses to smelt (R196 getSmeltingResult null, no derating). Off = vanilla furnace",
                        "R196 热量阶梯（阶段四批A）：燃料带热度档、配方要求最低热度；热度不足时熔炉拒绝冶炼（R196 getSmeltingResult 返回 null，不降档）。关闭则回到原版熔炉"));
        furnaceVanillaMaxHeat = config.getInt("furnaceVanillaMaxHeat", "furnace", furnaceVanillaMaxHeat, 1, 4,
                comment("Max heat the vanilla furnace accepts (R196 cobblestone furnace cap = 2; the extra tiers come with batch B)",
                        "原版熔炉可承受的最高热度（R196 圆石炉 cap 为 2；其余炉型随批 B 落地）"));
        furnaceDebugLog = config.getBoolean("furnaceDebugLog", "furnace", true,
                comment("Server log [FurnaceLog] lines: smelt blocks and fuel admittance denials (dev channel)",
                        "服务端日志 [FurnaceLog] 行：熔炼拒绝与燃料准入拒绝（开发通道）"));
        furnaceBurnTimeR196 = config.getBoolean("furnaceBurnTimeR196", "furnace", true,
                comment("R196 fuel burn durations replace vanilla where they differ (audit 9 §2.2: log 1600, planks 400, torch 800, lava bucket 3200, coal block 16000, blaze rod 2400, ...)",
                        "燃料燃烧时长按 R196 判值替换与原版有差异的项（审计 9 §2.2：原木 1600、木板 400、火把 800、熔岩桶 3200、煤炭块 16000、烈焰棒 2400 等）"));
        furnaceXpRewards = config.getBoolean("furnaceXpRewards", "furnace", true,                comment("Take pays the R196 per-item XP reward as one orb at the player (audit 9 §1.4: iron 10 / gold 20 / diamond 30 / emerald 20 / quartz 10; batch-B metals keep their judged numbers), replacing the vanilla random split; creative pays identical",
                        "取产物时按 R196 逐物品经验表结算一次（审计 9 §1.4：铁 10/金 20/钻石 30/绿宝石 20/石英 10；批 B 金属照判值），替换原版随机分配；创造不豁免"));
        furnaceGuiHints = config.getBoolean("furnaceGuiHints", "furnace", true,
                comment("Gold no-smelt / not-fuel / too-hot text when the cursor's carried item is refused by a furnace slot (R196 GuiFurnace:47-85)",
                        "光标持有物被熔炉槽拒绝时的金字提示：不可熔/非燃料/过热（R196 GuiFurnace:47-85）"));
        furnaceInputRecipeGate = config.getBoolean("furnaceInputRecipeGate", "furnace", true,
                comment("Furnace input slot only admits items that HAVE a smelting recipe (R196 TileEntityFurnace:360-368 — GUI drag and hopper alike); off = vanilla open-input acceptance",
                        "熔炉输入槽只收有熔炼配方的物品（R196 TileEntityFurnace:360-368 — GUI 拖放与漏斗同门）；关闭则回到原版输入槽全部放行"));

        deathXpOrbs = config.getBoolean("deathXpOrbs", "death", true,
                comment("Death drops total/3 as XP orbs at the death spot (R196 EntityPlayer:2032-2035); keepInventory suppresses it in both games",
                        "死亡掉落 total/3 成经验球于死亡点（R196 EntityPlayer:2032-2035）；keepInventory 规则下双方都不生效"));
        deathXpSettle = config.getBoolean("deathXpSettle", "death", true,
                comment("Death settles the XP balance: below-1-total deaths subtract 20 points (floor −800); higher deaths restore the stale respawn value (R196 ServerPlayer:953-957). Off = vanilla XP carryover",
                        "死亡结算经验：总量低于 1 级线（20 点）时扣 20 点（下限 −800）；更高时重生继承上次结算值（R196 ServerPlayer:953-957）。关闭则回到原版经验全保留"));
        deathDebugLog = config.getBoolean("deathDebugLog", "death", true,
                comment("Server log [DeathLog] lines: orb dumps, settle results and respawn rewrites (dev test channel)",
                        "服务端日志 [DeathLog] 行：经验球掉落、结算结果与重生效写（开发测试通道）"));

        mobDespawnR196 = config.getBoolean("mobDespawnR196", "mobs", true,
                comment("R196 despawn chain (audit 11 §2.1): LOS view-resets (-400/-9600), the mob 48-path hold (-1200), animal walls (counter 800/2400, 1024-radius player, ±16 fence), zombie-villager holds, the hour-of-grace dy doubling and the counter>=200 kill pass at >16 blocks. Off = vanilla 1.12 despawn rules",
                        "R196 消散链（审计 11 §2.1）：视线重置（-400/-9600）、怪类 48 格寻路挽留（-1200）、动物三重墙（计数 800/2400、1024 半径玩家、±16 围栏）、僵尸村民不消散、非天亮整点的 y 折倍、计数≥200 且距离>16 格的击杀判定。关闭则回到原版 1.12 消散规则"));
        mobDebugLog = config.getBoolean("mobDebugLog", "mobs", true,
                comment("Server log [AILog] lines: despawn kills, holds and counter rerolls (dev channel)",
                        "服务端日志 [AILog] 行：消散击杀、挽留判定与计数重掷（开发通道）"));
        mobSpawnR196 = config.getBoolean("mobSpawnR196", "mobs", true,
                comment("R196 spawn cycle (audit 11 §4 + audit 14): creature caps 50/10/5/5 over /256 chunks with the deep doubling, hostile dual probability rings 0.10 (under y60) / 0.17 (surface) times the modifier events (decreased x0.5 / increased x2 / no-spawn windows, blood-moon and thunder restore only reduced mods), the %-400 peaceful windows with blue-moon animal gating, night moon rejection rates and the dual-light close branch. Off = vanilla 1.12 spawning",
                        "R196 生成周期（审计 11 §4 + 审计 14）：物种上限 50/10/5/5 ×区块数/256（深处加倍）、敌怪双概率环（y60 下 0.10/地表 0.17）×调制事件（缩减×0.5/翻倍×2/停发窗口，血月与雷雨只还原缩减类）、%400 温驯窗口（动物加蓝月门）、夜间月亮拒率与双光照近距离准入。关闭则回到原版 1.12 生成"));
        spawnCapMonster = config.getInt("spawnCapMonster", "mobs", spawnCapMonster, 0, 500,
                comment("R196 monster spawn cap before the chunk conversion (audit 14: 50; vanilla 1.12 = 70)",
                        "敌怪生成上限（区块换算前）（审计 14：50；原版 1.12 为 70）"));
        spawnCapAnimal = config.getInt("spawnCapAnimal", "mobs", spawnCapAnimal, 0, 500,
                comment("R196 animal spawn cap before the chunk conversion (audit 14: 10)",
                        "动物生成上限（区块换算前）（审计 14：10）"));
        spawnCapAmbient = config.getInt("spawnCapAmbient", "mobs", spawnCapAmbient, 0, 500,
                comment("R196 ambient spawn cap before the chunk conversion (audit 14: 5; vanilla 1.12 = 15)",
                        "环境生物生成上限（区块换算前）（审计 14：5；原版 1.12 为 15）"));
        spawnCapAquatic = config.getInt("spawnCapAquatic", "mobs", spawnCapAquatic, 0, 500,
                comment("R196 aquatic spawn cap before the chunk conversion (audit 14: 5; vanilla 1.12 = 15)",
                        "水生生物生成上限（区块换算前）（审计 14：5；原版 1.12 为 15）"));
        moonStateOverride = config.getString("moonStateOverride", "mobs", "",
                new String[] { "", "blue", "blood", "full", "new" },
                comment("Force the spawn-cycle moon overlay state (empty = vanilla clock: full/new bands; blue/blood land with the stage-6 moon slice). Test determinism only",
                        "强制生成周期的月亮状态（空=原版时钟仅满/新月两档；蓝月血月随阶段六切片落地）。仅测试确定性用"));
        mobStatsR196 = config.getBoolean("mobStatsR196", "mobs", true,
                comment("R196 per-class mob attribute rows (audit 11 §3.1, vanilla-faithful classes only): skeleton 6 hp / 4 attack / 32 follow, zombie 5 attack / 32 follow / 0 armor, zombie pigman 8 attack / 32 follow, spider 12 hp / 4 attack / 28 follow. Off = vanilla 1.12 attributes",
                        "R196 怪物逐类属性表（审计 11 §3.1，仅原版等价类）：骷髅 6 血/4 攻/32 视距，僵尸 5 攻/32 视距/0 护甲，猪人 8 攻/32 视距，蜘蛛 12 血/4 攻/28 视距。关闭则回到原版 1.12 属性"));
        livestockNeedsR196 = config.getBoolean("livestockNeedsR196", "mobs", true,
                comment("R196 livestock wellness pipeline v1 (audit 11 §2.2): food/water/freedom needs on cow/sheep/pig/chicken (0.8+rand*0.2 start, +0.1/-0.005 every 100 ticks at a 9/10 roll), near-grass food (cow eats 1% of found grass), near-water/rain fallback, crowd/freedom rules, NBT persistence. Production/milk/egg gates come in a later slice. Off = vanilla carries nothing",
                        "R196 家畜需求管线 v1（审计 11 §2.2）：牛/羊/猪/鸡带食物/饮水/自由三需求（初始 0.8+随机0.2，每 100 tick 以 9/10 概率 +0.1/-0.005），草为食（牛 1% 概率吃掉发现草块），水/雨回退，拥挤/自由规则，NBT 持久化。产出（奶/蛋/羽等）门控留后续切片。关闭则回到原版家畜无需求"));
        compatCraftingTweaksFix = config.getBoolean("compatCraftingTweaksFix", "compat", true,
                comment("With CraftingTweaks installed, auto-disable its rightClickCraftsStack (right-click = craft full stack) so ETIM's R196 quality picker keeps the result-slot right-click; also rewrites craftingtweaks.cfg",
                        "检测到 Crafting Tweaks 时自动停用其『右击产物=成组合成』，把产物槽右击归还给 ETIM 的 R196 品质选择器；同时回写 craftingtweaks.cfg"));

        devTools = config.getBoolean("devTools", "devtools", true,
                comment("DEV TEST FACILITIES master switch: the GRAVE-key left-top debug HUD (reach/mining/hunger readout) and the /etest state command. Off = both disabled (release behavior); needs restart like every key",
                        "开发测试设施总开关：GRAVE 键左上角调试 HUD（触及/挖掘/饥饿读数）与 /etest 状态指令。关闭则两者一并停用（发布形态）；与其他键一样需重启生效"));

        if (config.hasChanged()) {
            config.save();
        }
        CraftingDifficulty.setGenericDifficulty(craftingGenericDifficulty);
        ETIMQuality.setOverrides(qualityMaxOverrides);
        FurnaceHeat.setEnabled(furnaceHeatSystem);
        FurnaceHeat.setVanillaCap(furnaceVanillaMaxHeat);
        FurnaceXpRewards.setEnabled(furnaceXpRewards);
        io.github.etim.etim.mob.ETIMMoonState.setOverride(moonStateOverride);
        validate(config);
    }

    /** Rejected configurations stop the load instead of using defaults. */
    private static void validate(Configuration config) {
        if (capAtLevel0 > capMaximum) {
            throw new IllegalStateException("[ETIM] Invalid config: playerCaps.capAtLevel0 (" + capAtLevel0
                    + ") exceeds playerCaps.capMaximum (" + capMaximum + ")");
        }
        if (insulinThresholdMild > insulinThresholdModerate
                || insulinThresholdModerate > insulinThresholdSevere
                || insulinThresholdSevere > insulinCap) {
            throw new IllegalStateException("[ETIM] Invalid config: nutrition.insulin* thresholds must ascend "
                    + "mild(" + insulinThresholdMild + ") <= moderate(" + insulinThresholdModerate
                    + ") <= severe(" + insulinThresholdSevere + ") <= cap(" + insulinCap + ") (file "
                    + config.getConfigFile().getAbsolutePath() + ")");
        }
        if (craftingDamagePenaltyPerDamagePoint % 10 != 0) {
            throw new IllegalStateException("[ETIM] Invalid config: crafting.craftingDamagePenaltyPerDamagePoint ("
                    + craftingDamagePenaltyPerDamagePoint + ") must be a multiple of 10 (R196 protocol: ×10 packet × N ticks)"
                    + " (file " + config.getConfigFile().getAbsolutePath() + ")");
        }
        if (Float.isNaN(miningSpeedPerLevel) || Float.isNaN(meleeDamagePerLevel)
                || Float.isNaN(bedRegenFactor)
                || Float.isNaN(hungerGainPerTick) || Float.isNaN(hungerPerFoodUnit)
                || Float.isNaN(hungerNutritionOnlyFactor) || Float.isNaN(hungerPoolCap)
                || Float.isNaN(starveGainPerTick) || Float.isNaN(starveHealthCeiling)
                || Float.isNaN(healBasePerTick) || Float.isNaN(healPerNutritionPerTick)
                || Float.isNaN(inBedHitListHunger)
                || Float.isNaN(malnourishedHungerFactor)
                || Float.isNaN(wetnessRainLight) || Float.isNaN(wetnessRainThunder)
                || Float.isNaN(wetnessImmerseAbove) || Float.isNaN(wetnessImmerseBelow)
                || Float.isNaN(wetnessCombo) || Float.isNaN(wetnessFreezingMultiplier)
                || Float.isNaN(wetnessFreezingTemperature) || Float.isNaN(wetnessHotExemptTemperature)
                || Float.isNaN(sugarToInsulin) || Float.isNaN(malnourishedRegenFactor)
                || Float.isNaN(blockReachBase) || Float.isNaN(meleeReachBase)
                || Float.isNaN(interactionReachBase) || Float.isNaN(creativeReach)
                || Float.isNaN(reachBonusTool) || Float.isNaN(reachBonusSmall)
                || Float.isNaN(reachServerTolerance) || Float.isNaN(entityHitboxExpansion)
                || Float.isNaN(hungerMoveFactor) || Float.isNaN(weakStrikeKnockbackFactor)
                || Float.isNaN(weakStrikeHealthThreshold) || Float.isNaN(hungerDigStrDivisor)
                || Float.isNaN(craftingSpeedPerLevel) || Float.isNaN(craftingBenchModifier)
                || Float.isNaN(craftingCurveExponent) || Float.isNaN(craftingGenericDifficulty)) {
            throw new IllegalStateException("[ETIM] Invalid config: NaN in a numeric entry (file "
                    + config.getConfigFile().getAbsolutePath() + ")");
        }
        if (blockReachBase > creativeReach) {
            throw new IllegalStateException("[ETIM] Invalid config: reach.blockReachBase (" + blockReachBase
                    + ") exceeds reach.creativeReach (" + creativeReach + ") — creative reach may not be weaker (file "
                    + config.getConfigFile().getAbsolutePath() + ")");
        }
    }

    /** Picks the comment by game language (client zh* → Chinese, else English). */
    private static String comment(String en, String zh) {
        return chinese ? zh : en;
    }

    private static boolean isChineseLocale() {
        if (FMLCommonHandler.instance().getSide() == Side.SERVER) {
            return false;
        }
        String code = Minecraft.getMinecraft().getLanguageManager().getCurrentLanguage().getLanguageCode();
        return code != null && code.startsWith("zh");
    }
}
