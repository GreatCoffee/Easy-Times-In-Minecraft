package io.github.etim.etim.commands;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mixins.FoodStatsAccessor;
import io.github.etim.etim.playerstate.PlayerStatLimits;
import net.minecraft.command.CommandBase;
import net.minecraft.command.CommandException;
import net.minecraft.command.ICommandSender;
import net.minecraft.command.PlayerNotFoundException;
import net.minecraft.command.WrongUsageException;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.network.play.server.SPacketSetExperience;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.FoodStats;
import net.minecraft.util.text.Style;
import net.minecraft.util.text.TextComponentTranslation;
import net.minecraft.util.text.TextFormatting;

/**
 * {@code /etest} — dev/test state setter for the debug-overlay test rounds
 * (development facility, mirrors {@code /state}). Lets the tester stage
 * whatever system state the currently tested task needs instead of grinding
 * to it in-game:
 *
 * <ul>
 *   <li>{@code /etest food <points> [saturation] [exhaustion]} — food
 *       bar/saturation/exhaustion, clamped to the level-scaled cap
 *       ({@code 0} starves the player for the task-2.3 gates).</li>
 *   <li>{@code /etest health <points>} — health, clamped to the cap.</li>
 *   <li>{@code /etest level <number>} — XP level (task-1.2 cap applies).</li>
 * </ul>
 */
public class CommandDevTest extends CommandBase {

    @Override
    public String getName() {
        return "etest";
    }

    @Override
    public int getRequiredPermissionLevel() {
        return 0;
    }

    @Override
    public String getUsage(ICommandSender sender) {
        return new TextComponentTranslation("commands.etest.usage").getUnformattedText();
    }

    @Override
    public void execute(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (!(sender instanceof EntityPlayerMP)) {
            throw new PlayerNotFoundException("commands.state.no_player");
        }
        EntityPlayerMP player = (EntityPlayerMP) sender;
        if (args.length == 0) {
            throw new WrongUsageException("commands.etest.usage");
        }

        switch (args[0]) {
            case "food":
            case "hunger":
                executeFood(player, args);
                break;
            case "health":
                executeHealth(player, args);
                break;
            case "level":
                executeLevel(player, args);
                break;
            default:
                throw new WrongUsageException("commands.etest.usage");
        }
    }

    private static void executeFood(EntityPlayerMP player, String[] args) throws CommandException {
        int cap = PlayerStatLimits.getHealthFoodCap(player.experienceLevel);
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        int level = CommandBase.parseInt(args[1], 0, cap);
        float saturation = args.length >= 3 ? (float) parseDouble(args[2], 0.0D, cap) : 0.0F;
        float exhaustion = args.length >= 4 ? (float) parseDouble(args[3], 0.0D, 100.0D) : 0.0F;

        FoodStats stats = player.getFoodStats();
        stats.setFoodLevel(level);
        stats.setFoodSaturationLevel(saturation); // vanilla clamps saturation to the food level
        ((FoodStatsAccessor) stats).etim$setFoodExhaustion(exhaustion);

        respond(player, "commands.etest.food_set",
                level, stats.getSaturationLevel(), ((FoodStatsAccessor) stats).etim$getFoodExhaustion(), cap);
    }

    private static void executeHealth(EntityPlayerMP player, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        int cap = PlayerStatLimits.getHealthFoodCap(player.experienceLevel);
        float health = (float) parseDouble(args[1], 0.0D, cap);
        player.setHealth(health);
        respond(player, "commands.etest.health_set", health, cap);
    }

    private static void executeLevel(EntityPlayerMP player, String[] args) throws CommandException {
        if (args.length < 2) {
            throw new WrongUsageException("commands.etest.usage");
        }
        int target = CommandBase.parseInt(args[1], 0, ETIMConfig.levelCap);
        int delta = target - player.experienceLevel;
        if (delta != 0) {
            player.addExperienceLevel(delta);
        }
        // addExperienceLevel relies on the periodic XP packet; push one now.
        player.connection.sendPacket(new SPacketSetExperience(
                player.experience, player.experienceTotal, player.experienceLevel));
        respond(player, "commands.etest.level_set", player.experienceLevel);
    }

    private static void respond(EntityPlayerMP player, String key, Object... params) {
        player.sendMessage(new TextComponentTranslation(key, params)
                .setStyle(new Style().setColor(TextFormatting.GREEN)));
    }
}
