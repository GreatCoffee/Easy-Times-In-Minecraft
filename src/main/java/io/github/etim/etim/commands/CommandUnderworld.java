package io.github.etim.etim.commands;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.world.ETIMDimensions;
import io.github.etim.etim.world.ETIMUnderworldTeleporter;
import io.github.etim.etim.world.ETIMWorldProviderUnderworld;

import net.minecraft.block.state.IBlockState;
import net.minecraft.command.CommandBase;
import net.minecraft.command.CommandException;
import net.minecraft.command.ICommandSender;
import net.minecraft.command.PlayerNotFoundException;
import net.minecraft.command.WrongUsageException;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.init.Blocks;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.management.PlayerList;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.text.TextComponentString;
import net.minecraft.world.WorldServer;
import net.minecraft.world.chunk.Chunk;

/**
 * M2-08/11/13 + D-06 — the minimal underworld entry: {@code /etim dim
 * enter|leave|probe}, permission level 2. The R196 portal face (M2 整类) is
 * 后置 — the command is the only entrance this batch.
 *
 * <ul>
 *   <li>{@code enter [player]}: {@code timeUntilPortal > 0} rejects
 *       (R196 {@code EntityPlayer.java:487-490} cooldown 10), then
 *       {@code PlayerList.transferPlayerToDimension(player, -2, INSTANCE)}
 *       (1.12 {@code PlayerList.java:654-681}), then the 10-tick cooldown +
 *       the visited flag (M2-13). The R196 80-tick standing-in-portal face is
 *       bypassed by design (M2-11 判行锚 {@code inPortal80=bypass}).</li>
 *   <li>{@code leave [player]}: same transfer back to the overworld.</li>
 *   <li>{@code probe [x] [z]}: the y-segment summary of one underworld column
 *       (mantle/water/stone/air/bedrock/web) — the M4 判行锚 face.</li>
 * </ul>
 */
public class CommandUnderworld extends CommandBase {

    @Override
    public String getName() {
        return "etim";
    }

    @Override
    public int getRequiredPermissionLevel() {
        return 2; // D-6
    }

    @Override
    public String getUsage(ICommandSender sender) {
        return "/etim dim <enter|leave|probe> [player]";
    }

    @Override
    public void execute(MinecraftServer server, ICommandSender sender, String[] args) throws CommandException {
        if (args.length < 2 || !"dim".equals(args[0])) {
            throw new WrongUsageException("/etim dim <enter|leave|probe> [player]");
        }
        EntityPlayerMP player = targetOrSender(server, sender, args, 2);
        switch (args[1]) {
            case "enter":
                executeEnter(server, player);
                break;
            case "leave":
                executeLeave(server, player);
                break;
            case "probe":
                executeProbe(server, player);
                break;
            default:
                throw new WrongUsageException("/etim dim <enter|leave|probe> [player]");
        }
    }

    /** M2-11 — enter face with the cooldown gate. */
    private void executeEnter(MinecraftServer server, EntityPlayerMP player) {
        if (player.timeUntilPortal > 0) {
            ETIMDimensions.dimLog("enter-reject cooldown=" + player.timeUntilPortal);
            return;
        }
        int from = player.dimension;
        PlayerList list = server.getPlayerList();
        list.transferPlayerToDimension(player, ETIMDimensions.UNDERWORLD, ETIMUnderworldTeleporter.INSTANCE);
        player.timeUntilPortal = 10; // R196 EntityPlayer.java:487-490
        ETIMDimensions.markUnderworldVisited(server.getWorld(ETIMDimensions.UNDERWORLD)); // M2-13
        ETIMDimensions.dimLog("enter player=" + player.getName() + " from=" + from
                + " to=" + ETIMDimensions.UNDERWORLD + " y=" + player.posY + " inPortal80=bypass");
    }

    private void executeLeave(MinecraftServer server, EntityPlayerMP player) {
        int from = player.dimension;
        server.getPlayerList().transferPlayerToDimension(player, 0, ETIMUnderworldTeleporter.INSTANCE);
        player.timeUntilPortal = 10;
        ETIMDimensions.dimLog("leave player=" + player.getName() + " from=" + from
                + " to=0 y=" + player.posY);
    }

    /**
     * M4-02/03/05 — the column probe: one underworld x/z column, y 0..255,
     * summarized into segments. Sender is a player (probe rides their x/z) or
     * an RCON actor — the probe face itself takes no player argument beyond
     * the shared target resolution.
     */
    private void executeProbe(MinecraftServer server, EntityPlayerMP player) {
        WorldServer underworld = server.getWorld(ETIMDimensions.UNDERWORLD);
        ETIMDimensions.dimLog("lookup " + ETIMDimensions.UNDERWORLD + " -> WorldServer "
                + (underworld != null ? "ok" : "null"));
        ETIMDimensions.dimLog("provider dim=-2 yOffset=" + (underworld.provider instanceof ETIMWorldProviderUnderworld
                ? ((ETIMWorldProviderUnderworld) underworld.provider).getYOffset() : 0)
                + " actualHeight=" + underworld.provider.getActualHeight());
        ETIMDimensions.dimLog("biome probe (0,0)=" + BiomeProbeName(underworld, 0, 0)
                + " (512,512)=" + BiomeProbeName(underworld, 512, 512));

        Chunk chunk = underworld.getChunk(player.getPosition().getX() >> 4,
                player.getPosition().getZ() >> 4);
        int x = player.getPosition().getX();
        int z = player.getPosition().getZ();

        StringBuilder segments = new StringBuilder();
        String current = null;
        int start = 0;
        for (int y = 0; y < 256; y++) {
            String face = faceOf(chunk, x, y, z);
            if (!face.equals(current)) {
                if (current != null) {
                    segments.append(' ').append(current).append('=').append(start).append("..").append(y - 1);
                }
                current = face;
                start = y;
            }
        }
        segments.append(' ').append(current).append('=').append(start).append("..255");
        ETIMDimensions.dimLog("gen-probe x=" + x + " z=" + z + segments);
        player.sendMessage(new TextComponentString("[DimLog] gen-probe x=" + x + " z=" + z + segments));
    }

    private static String BiomeProbeName(WorldServer underworld, int x, int z) {
        return underworld.getBiome(new BlockPos(x, 64, z)).getRegistryName().toString();
    }

    /** Segment face per block (the M4 probe taxonomy). */
    private static String faceOf(Chunk chunk, int x, int y, int z) {
        IBlockState state = chunk.getBlockState(new BlockPos(x, y, z));
        if (state.getBlock() == io.github.etim.etim.metal.ETIMBlocks.MANTLE_OR_CORE) {
            return "mantle";
        }
        if (state.getBlock() == Blocks.BEDROCK) {
            return "bedrock";
        }
        if (state.getMaterial() == net.minecraft.block.material.Material.WATER) {
            return "water";
        }
        if (state.getBlock() == Blocks.WEB) {
            return "web";
        }
        if (state.getBlock() == Blocks.STONE) {
            return "stone";
        }
        if (state.getBlock() == Blocks.AIR) {
            return "air";
        }
        return state.getBlock().getRegistryName().getPath();
    }

    private static EntityPlayerMP targetOrSender(MinecraftServer server, ICommandSender sender,
            String[] args, int targetIndex) throws CommandException {
        if (args.length > targetIndex) {
            return CommandBase.getPlayer(server, sender, args[targetIndex]);
        }
        if (sender instanceof EntityPlayerMP) {
            return (EntityPlayerMP) sender;
        }
        throw new PlayerNotFoundException("commands.state.no_player");
    }
}
