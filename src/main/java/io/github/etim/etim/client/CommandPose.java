package io.github.etim.etim.client;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import net.minecraft.command.CommandBase;
import net.minecraft.command.CommandException;
import net.minecraft.command.ICommandSender;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.text.TextComponentString;
import net.minecraftforge.client.ClientCommandHandler;

/**
 * 客户端姿态调试命令（clientpose B-1 观感收敛工装）。
 *
 * <p>纯客户端：只改 {@link ETIMConfig} 的五个静态量（blockPoseTX/TY/Rot1/Rot2/Rot3），
 * 下一帧即生效，不需要重启游戏。每次改动写一行 {@code [PoseLog]} 到客户端日志，
 * 收敛后由主会话直接读日志把数值烘成 config 默认值。</p>
 *
 * <p>总开关：{@code ETIMConfig.blockPoseDebug}（默认 false，发布态不注册该命令）。</p>
 */
public class CommandPose extends CommandBase {

    public static void register() {
        ClientCommandHandler.instance.registerCommand(new CommandPose());
    }

    @Override
    public String getName() {
        return "etimpose";
    }

    @Override
    public String getUsage(ICommandSender sender) {
        return "/etimpose <tx|ty|r1|r2|r3> <value> | /etimpose show | /etimpose reset";
    }

    @Override
    public int getRequiredPermissionLevel() {
        return 0;
    }

    @Override
    public boolean checkPermission(MinecraftServer server, ICommandSender sender) {
        return true;
    }

    @Override
    public List<String> getTabCompletions(MinecraftServer server, ICommandSender sender, String[] args, BlockPos pos) {
        if (args.length == 1) {
            return CommandBase.getListOfStringsMatchingLastWord(args, "tx", "ty", "r1", "r2", "r3", "show", "reset");
        }
        return Collections.emptyList();
    }

    @Override
    public void execute(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length == 0) {
            show(sender);
            return;
        }
        switch (args[0].toLowerCase()) {
            case "show":
                show(sender);
                return;
            case "reset":
                ETIMConfig.blockPoseTX = -0.5F;
                ETIMConfig.blockPoseTY = 0.2F;
                ETIMConfig.blockPoseRot1 = 30.0F;
                ETIMConfig.blockPoseRot2 = -80.0F;
                ETIMConfig.blockPoseRot3 = 60.0F;
                log("reset");
                show(sender);
                return;
            default:
                break;
        }
        if (args.length < 2) {
            throw new CommandException(getUsage(sender));
        }
        float v = (float) parseDouble(args[1]);
        switch (args[0].toLowerCase()) {
            case "tx": ETIMConfig.blockPoseTX = v; break;
            case "ty": ETIMConfig.blockPoseTY = v; break;
            case "r1": ETIMConfig.blockPoseRot1 = v; break;
            case "r2": ETIMConfig.blockPoseRot2 = v; break;
            case "r3": ETIMConfig.blockPoseRot3 = v; break;
            default:
                throw new CommandException("unknown field: " + args[0] + " (tx|ty|r1|r2|r3)");
        }
        log(args[0].toLowerCase() + "=" + fmt(v));
        show(sender);
    }

    private void show(ICommandSender sender) {
        String line = String.format("tx=%.2f ty=%.2f r1=%.1f r2=%.1f r3=%.1f",
                ETIMConfig.blockPoseTX, ETIMConfig.blockPoseTY,
                ETIMConfig.blockPoseRot1, ETIMConfig.blockPoseRot2, ETIMConfig.blockPoseRot3);
        sender.sendMessage(new TextComponentString("[Pose] " + line));
    }

    private void log(String what) {
        ETIM.LOGGER.info("[PoseLog] set {} -> tx={} ty={} r1={} r2={} r3={}",
                what, fmt(ETIMConfig.blockPoseTX), fmt(ETIMConfig.blockPoseTY),
                fmt(ETIMConfig.blockPoseRot1), fmt(ETIMConfig.blockPoseRot2),
                fmt(ETIMConfig.blockPoseRot3));
    }

    private static String fmt(float v) {
        return String.format(java.util.Locale.ROOT, "%.3f", v);
    }
}
