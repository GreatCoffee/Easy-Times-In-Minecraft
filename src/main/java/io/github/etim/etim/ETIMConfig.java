package io.github.etim.etim;

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

        if (config.hasChanged()) {
            config.save();
        }
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
                || Float.isNaN(weakStrikeHealthThreshold) || Float.isNaN(hungerDigStrDivisor)) {
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
