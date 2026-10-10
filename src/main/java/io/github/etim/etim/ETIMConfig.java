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
                || Float.isNaN(regenBasePerTick) || Float.isNaN(regenPerFoodPerTick)
                || Float.isNaN(bedRegenFactor) || Float.isNaN(exhaustionPerHealedHp)
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
