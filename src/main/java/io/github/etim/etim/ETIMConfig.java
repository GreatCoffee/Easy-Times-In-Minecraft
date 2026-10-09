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

    // regen ---------------------------------------------------------
    /** Heal progress (1.0 = one healed HP) accumulated per tick. */
    public static float regenBasePerTick = 0.0004F;
    /** Additional heal progress per tick per food point. */
    public static float regenPerFoodPerTick = 0.00002F;
    /** Heal rate multiplier while LYING IN A BED (R196: 4x, any time of day). */
    public static float bedRegenFactor = 4.0F;
    /** Allow lying in a bed during the day purely for the regen boost (MITE behavior). */
    public static boolean allowDayBedRegen = true;
    /** Exhaustion charged per healed HP. */
    public static float exhaustionPerHealedHp = 1.0F;

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

        regenBasePerTick = config.getFloat("regenBasePerTick", "regen", regenBasePerTick, 0.0F, 0.1F,
                comment("Heal progress per tick, 1 HP per 1.0 accumulated",
                        "每tick累积的回血进度，满1.0回1点生命"));
        regenPerFoodPerTick = config.getFloat("regenPerFoodPerTick", "regen", regenPerFoodPerTick, 0.0F, 0.1F,
                comment("Additional heal progress per tick per food point",
                        "每tick每点饥饿值额外累积的回血进度"));
        bedRegenFactor = config.getFloat("bedRegenFactor", "regen", bedRegenFactor, 1.0F, 100.0F,
                comment("Heal rate multiplier while lying in a bed (MITE R196: 4x)",
                        "躺在床上的回血倍率（MITE R196 为4倍）"));
        allowDayBedRegen = config.getBoolean("allowDayBedRegen", "regen", true,
                comment("Allow lying in a bed during the day purely for the regen boost (MITE behavior)",
                        "允许白天躺床来获得回血加速（MITE 行为），关闭则白天不能上床"));
        exhaustionPerHealedHp = config.getFloat("exhaustionPerHealedHp", "regen", exhaustionPerHealedHp, 0.0F, 40.0F,
                comment("Exhaustion charged per healed HP",
                        "每回1点生命累积的消耗（4.0=消耗1点饥饿值）"));

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
                || Float.isNaN(regenBasePerTick) || Float.isNaN(regenPerFoodPerTick)
                || Float.isNaN(bedRegenFactor) || Float.isNaN(exhaustionPerHealedHp)
                || Float.isNaN(sugarToInsulin) || Float.isNaN(malnourishedRegenFactor)) {
            throw new IllegalStateException("[ETIM] Invalid config: NaN in a numeric entry (file "
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
