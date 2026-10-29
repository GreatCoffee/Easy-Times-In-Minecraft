package io.github.etim.etim.commands;

import io.github.etim.etim.harness.TestDriver;

import net.minecraft.command.CommandBase;
import net.minecraft.command.CommandException;
import net.minecraft.command.ICommandSender;
import net.minecraft.command.WrongUsageException;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.server.MinecraftServer;

/**
 * 盾面削弱批测试口（<b>D-6</b>，派修单要件 4）——
 * {@code /etimghost hurt <selector> <amount> <spectral:true|false>}，
 * permission 2，{@code devTools} 门内注册（serverStarting）。逐次 {@code new}
 * {@code EntityDamageSource}（**只传逐次新建源，静态单例绝不进标记口**——账本
 * 条 30 类型门双保险），{@code spectral=true} 时调 {@code ETIMGhost.markSpectral}
 * 再结算；两腿同命令 → 窗内 spectral=true/false 相邻行直接互证。
 * 已闭单的 {@code /etest} 判据面一字不动（audit20 条 114）。
 */
public class CommandEtimGhost extends CommandBase {

    @Override
    public String getName() {
        return "etimghost";
    }

    @Override
    public int getRequiredPermissionLevel() {
        return 2;
    }

    @Override
    public String getUsage(ICommandSender sender) {
        return "/etimghost hurt <selector> <amount> <spectral:true|false>";
    }

    @Override
    public void execute(MinecraftServer server, ICommandSender sender, String[] args)
            throws CommandException {
        if (args.length < 4 || !"hurt".equals(args[0])) {
            throw new WrongUsageException("/etimghost hurt <selector> <amount> <spectral:true|false>");
        }
        EntityPlayerMP player = CommandBase.getPlayer(server, sender, args[1]);
        float amount = (float) CommandBase.parseDouble(args[2]);
        boolean spectral = "true".equalsIgnoreCase(args[3]);
        TestDriver.hurtSpectral(player, amount, spectral);
    }
}
