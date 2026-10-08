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
        if (Float.isNaN(miningSpeedPerLevel) || Float.isNaN(meleeDamagePerLevel)
                || Float.isNaN(regenBasePerTick) || Float.isNaN(regenPerFoodPerTick)
                || Float.isNaN(bedRegenFactor) || Float.isNaN(exhaustionPerHealedHp)) {
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
