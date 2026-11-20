package io.github.etim.etim.commands;

import java.util.List;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.skill.ETIMSkill;
import io.github.etim.etim.skill.ETIMSkillRules;
import io.github.etim.etim.skill.ETIMSkills;
import io.github.etim.etim.skill.IETIMSkills;
import net.minecraft.command.CommandBase;
import net.minecraft.command.CommandException;
import net.minecraft.command.ICommandSender;
import net.minecraft.command.WrongUsageException;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.text.TextComponentTranslation;

/**
 * {@code /etimskill} — the player-facing acquisition command for the minimal
 * skill layer. R196 carries the same acquire/abandon operation on
 * {@code /skill}; the 1.12 command root is {@code etimskill} because
 * {@code /etim} is already the underworld command and must stay
 * permission-2.
 */
public class CommandEtimSkill extends CommandBase {

    @Override
    public String getName() {
        return "etimskill";
    }

    @Override
    public int getRequiredPermissionLevel() {
        return 0;
    }

    @Override
    public String getUsage(ICommandSender sender) {
        return "/etimskill learn|abandon <skill> [player] | list [player]";
    }

    @Override
    public void execute(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        EntityPlayerMP senderPlayer = sender instanceof EntityPlayerMP ? (EntityPlayerMP) sender : null;
        if (args.length < 1) {
            throw new WrongUsageException(getUsage(sender));
        }

        if ("list".equalsIgnoreCase(args[0])) {
            EntityPlayerMP player = args.length >= 2
                    ? CommandBase.getPlayer(server, sender, args[1])
                    : senderPlayer;
            if (player == null) {
                throw new CommandException("commands.etimskill.playeronly");
            }
            int mask = ETIMSkills.mask(player);
            StringBuilder out = new StringBuilder();
            for (ETIMSkill skill : ETIMSkill.values()) {
                if ((mask & skill.mask()) == 0) {
                    continue;
                }
                if (out.length() > 0) {
                    out.append(", ");
                }
                out.append(skill.key());
            }
            player.sendMessage(new TextComponentTranslation(
                    out.length() == 0 ? "commands.etimskill.list.none" : "commands.etimskill.list",
                    out.toString()));
            ETIM.LOGGER.info("[SkillLog] list player={} mask={} [server]", player.getName(), mask);
            return;
        }

        if (args.length < 2) {
            throw new WrongUsageException(getUsage(sender));
        }
        EntityPlayerMP player = args.length >= 3
                ? CommandBase.getPlayer(server, sender, args[2])
                : senderPlayer;
        if (player == null) {
            throw new CommandException("commands.etimskill.playeronly");
        }
        ETIMSkill skill = ETIMSkill.byKey(args[1]);
        if (skill == null) {
            throw new CommandException("commands.etimskill.unknown", args[1]);
        }

        IETIMSkills state = ETIMSkills.get(player);
        if (state == null) {
            throw new CommandException("commands.etimskill.capability");
        }

        if ("learn".equalsIgnoreCase(args[0])) {
            if (!ETIMSkillRules.enabled(player.world)) {
                throw new CommandException("commands.etimskill.disabled");
            }
            if (state.has(skill)) {
                throw new CommandException("commands.etimskill.already", skill.key());
            }
            int cost = ETIMSkillRules.learnCost(player);
            if (player.experienceLevel < cost) {
                throw new CommandException("commands.etimskill.cost", cost);
            }
            if (state.getLastLearnDay() >= ETIMSkillRules.currentDay(player.world)) {
                throw new CommandException("commands.etimskill.once");
            }
            if (!ETIMSkillRules.learn(player, skill)) {
                throw new CommandException("commands.etimskill.failed");
            }
            player.sendMessage(new TextComponentTranslation("commands.etimskill.learned", skill.key(), cost));
            ETIM.LOGGER.info("[SkillLog] learn player={} skill={} cost={} mask={} [server]",
                    player.getName(), skill.key(), cost, ETIMSkills.mask(player));
            return;
        }

        if ("abandon".equalsIgnoreCase(args[0])) {
            if (!state.has(skill)) {
                throw new CommandException("commands.etimskill.nothave", skill.key());
            }
            if (!ETIMSkillRules.abandon(player, skill)) {
                throw new CommandException("commands.etimskill.disabled");
            }
            player.sendMessage(new TextComponentTranslation("commands.etimskill.abandoned", skill.key()));
            ETIM.LOGGER.info("[SkillLog] abandon player={} skill={} mask={} [server]",
                    player.getName(), skill.key(), ETIMSkills.mask(player));
            return;
        }

        throw new WrongUsageException(getUsage(sender));
    }

    @Override
    public List<String> getTabCompletions(MinecraftServer server, ICommandSender sender, String[] args,
            net.minecraft.util.math.BlockPos targetPos) {
        if (args.length == 1) {
            return getListOfStringsMatchingLastWord(args, "learn", "abandon", "list");
        }
        if (args.length == 2 && ("learn".equalsIgnoreCase(args[0]) || "abandon".equalsIgnoreCase(args[0]))) {
            String[] keys = new String[ETIMSkill.values().size()];
            for (int i = 0; i < keys.length; i++) {
                keys[i] = ETIMSkill.values().get(i).key();
            }
            return getListOfStringsMatchingLastWord(args, keys);
        }
        return java.util.Collections.emptyList();
    }
}
