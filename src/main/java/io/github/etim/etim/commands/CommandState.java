package io.github.etim.etim.commands;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.hunger.ETIMFoodStats;
import io.github.etim.etim.nutrition.NutritionSystem;
import net.minecraft.command.CommandBase;
import net.minecraft.command.CommandException;
import net.minecraft.command.ICommandSender;
import net.minecraft.command.PlayerNotFoundException;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.text.ITextComponent;
import net.minecraft.util.text.Style;
import net.minecraft.util.text.TextComponentString;
import net.minecraft.util.text.TextComponentTranslation;
import net.minecraft.util.text.TextFormatting;

/**
 * {@code /state} — ETIM nutrient status inspection (task 1.4). All output is
 * translation-key driven (en_us / zh_cn lang files), following the MITE
 * insulin palette: mild yellow / moderate gold / severe red; zero pools of
 * protein or phytonutrients get the malnourishment marker; moderate or above
 * adds the sugar-satiation-discount hint (R196 has no hard sugar gate — the
 * penalty is the discount plus nausea/poison side effects).
 *
 * <p>Values are server-authoritative; the command reads the server-side
 * capability directly.</p>
 */
public class CommandState extends CommandBase {

    @Override
    public String getName() {
        return "state";
    }

    @Override
    public int getRequiredPermissionLevel() {
        return 0;
    }

    @Override
    public String getUsage(ICommandSender sender) {
        // Resolved server-side; the lang files carry both languages.
        return new TextComponentTranslation("commands.state.usage").getUnformattedText();
    }

    @Override
    public void execute(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (!(sender instanceof EntityPlayerMP)) {
            throw new PlayerNotFoundException("commands.state.no_player");
        }
        EntityPlayerMP player = (EntityPlayerMP) sender;
        NutritionSystem.INutrition capsule = NutritionSystem.get(player);
        if (capsule == null) {
            throw new CommandException("commands.state.not_attached");
        }

        player.sendMessage(poolLine("etim.state.protein", capsule.getProtein(), true));
        player.sendMessage(poolLine("etim.state.fats", capsule.getEssentialFats(), false));
        player.sendMessage(poolLine("etim.state.phytonutrients", capsule.getPhytonutrients(), true));
        player.sendMessage(insulinLine(capsule));
        if (ETIMConfig.foodModel) {
            ETIMFoodStats.IFoodState food = ETIMFoodStats.get(player);
            if (food != null) {
                int limit = ETIMFoodStats.getLimit(player);
                player.sendMessage(valueLine("etim.state.satiation", food.getSatiation() + " / " + limit, food.getSatiation() == 0));
                player.sendMessage(valueLine("etim.state.nutrition", food.getNutrition() + " / " + limit, food.getNutrition() == 0));
                player.sendMessage(valueLine("etim.state.hungerPool", String.format("%.3f / %.1f", food.getHungerPool(), ETIMConfig.hungerPoolCap), false));
            }
        }
        // Stage 4C: the death-chain numbers (stale respawn total + a pending
        // settle readout) for the E-group test rounds.
        io.github.etim.etim.death.ETIMDeathXp.IState deathXp =
                io.github.etim.etim.death.ETIMDeathXp.get(player);
        if (deathXp != null) {
            player.sendMessage(valueLine("etim.state.deathXp",
                    String.format("total=%d stale=%d pending=%s", player.experienceTotal,
                            deathXp.getRespawnTotal(),
                            deathXp.getPendingSettle() == Integer.MIN_VALUE ? "none" : Integer.toString(deathXp.getPendingSettle())),
                    player.experienceTotal < 0));
        }
    }

    /** One food-pool line (amber label, red value when empty). */
    private static ITextComponent valueLine(String labelKey, String value, boolean empty) {
        return label(labelKey)
                .appendSibling(new TextComponentString(value).setStyle(style(empty ? TextFormatting.RED : TextFormatting.WHITE)));
    }

    /**
     * One colored pool line: yellow label, red/white value, gray cap and
     * percentage; R196 malnourishment counts protein and phytonutrients only
     * (essential fats are deliberately not part of it, ServerPlayer:1550).
     */
    private static ITextComponent poolLine(String labelKey, int value, boolean countsTowardMalnourishment) {
        int percent = MathHelper.clamp(value * 100 / ETIMConfig.nutritionPoolMax, 0, 100);
        ITextComponent line = label(labelKey)
                .appendSibling(number(value, value <= 0))
                .appendSibling(new TextComponentString(
                        " / " + ETIMConfig.nutritionPoolMax + " (" + percent + "%)").setStyle(style(TextFormatting.GRAY)));
        if (countsTowardMalnourishment && value <= 0) {
            line.appendSibling(new TextComponentTranslation("etim.state.malnourished").setStyle(style(TextFormatting.RED)));
        }
        return line;
    }

    private static ITextComponent insulinLine(NutritionSystem.INutrition capsule) {
        int level = capsule.getInsulinLevel();
        ITextComponent line = label("etim.state.insulin")
                .appendSibling(number(capsule.getInsulinResistance(), false))
                .appendSibling(new TextComponentString(" / " + ETIMConfig.insulinCap).setStyle(style(TextFormatting.GRAY)))
                .appendSibling(new TextComponentString("（").setStyle(style(TextFormatting.GRAY)))
                .appendSibling(levelComponent(level))
                .appendSibling(new TextComponentString("）").setStyle(style(TextFormatting.GRAY)));
        if (level >= NutritionSystem.LEVEL_MODERATE) {
            line.appendSibling(new TextComponentTranslation("etim.state.sugar_discount").setStyle(style(TextFormatting.GRAY)));
        }
        return line;
    }

    private static ITextComponent levelComponent(int level) {
        String key;
        TextFormatting format;
        switch (level) {
            case NutritionSystem.LEVEL_MILD:
                key = "etim.state.level.mild";
                format = TextFormatting.YELLOW;
                break;
            case NutritionSystem.LEVEL_MODERATE:
                key = "etim.state.level.moderate";
                format = TextFormatting.GOLD;
                break;
            case NutritionSystem.LEVEL_SEVERE:
                key = "etim.state.level.severe";
                format = TextFormatting.RED;
                break;
            default:
                key = "etim.state.level.none";
                format = TextFormatting.GRAY;
                break;
        }
        return new TextComponentTranslation(key).setStyle(style(format));
    }

    private static ITextComponent label(String key) {
        return new TextComponentTranslation(key).setStyle(style(TextFormatting.YELLOW));
    }

    private static ITextComponent number(int value, boolean red) {
        return new TextComponentString(Integer.toString(value)).setStyle(style(red ? TextFormatting.RED : TextFormatting.WHITE));
    }

    private static Style style(TextFormatting format) {
        return new Style().setColor(format);
    }
}
