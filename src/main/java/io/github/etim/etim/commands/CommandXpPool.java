package io.github.etim.etim.commands;

import io.github.etim.etim.playerstate.ETIMXp;
import net.minecraft.command.CommandBase;
import net.minecraft.command.CommandException;
import net.minecraft.command.ICommandSender;
import net.minecraft.command.WrongUsageException;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.server.MinecraftServer;

/**
 * ❗F-4-30（第二批裁点3=A）：the /xp POOL semantics — R196 CommandHandler:617-619
 * {@code addExperience(experience − player.experience)} sets the POOL to the
 * absolute value (not an increment); {@code level N} face (:535-538) is the
 * same shape onto the level curve. Vanilla 1.12 /xp is an INCREMENT onto the
 * level machinery — this command replaces the vanilla registration (the map
 * entry is swapped at server start) so both syntaxes carry R196 pool math:
 * <ul>
 *   <li>{@code /xp <pool>} → pool := &lt;pool&gt; (absolute; negative = debt)</li>
 *   <li>{@code /xp <amount>L} → pool += amount×20 (R196 level-point face)</li>
 * </ul>
 */
public class CommandXpPool extends CommandBase {

    @Override
    public String getName() {
        return "xp";
    }

    @Override
    public int getRequiredPermissionLevel() {
        return 2;
    }

    @Override
    public String getUsage(ICommandSender sender) {
        return "/xp <pool> | /xp <amount>L [player]";
    }

    @Override
    public void execute(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 1) {
            throw new WrongUsageException(getUsage(sender));
        }
        String arg = args[0];
        EntityPlayerMP player = args.length >= 2
                ? CommandBase.getPlayer(server, sender, args[1])
                : CommandBase.getCommandSenderAsPlayer(sender);
        if (arg.endsWith("L") || arg.endsWith("l")) {
            int levels = CommandBase.parseInt(arg.substring(0, arg.length() - 1));
            int target = Math.max(Math.min(levels, ETIMXp.MAX_LEVEL), 0);
            // R196 :535-538 shape: absolute level via the pool delta to the curve point.
            ETIMXp.applyTotal(player, ETIMXp.pointsForLevel(target));
        } else {
            // R196 :617-619: absolute pool set (negative rides the debt branch).
            ETIMXp.applyTotal(player, CommandBase.parseInt(arg));
        }
    }
}
