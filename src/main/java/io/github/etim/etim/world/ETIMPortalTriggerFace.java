package io.github.etim.etim.world;

import net.minecraft.advancements.Advancement;
import net.minecraft.advancements.AdvancementProgress;
import net.minecraft.advancements.PlayerAdvancements;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.init.Blocks;
import net.minecraft.server.MinecraftServer;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMBlocks;

/**
 * underworld 二阶段 T10 — the F-5-48判定 face behind the
 * {@code tryHarvestBlock} mixin hook (R196 ItemInWorldManager.java:204-213):
 *
 * <pre>removed (TAIL return) ∧ isUnderworld() ∧ y &lt; 6 ∧ any of the four
 * horizontal neighbours == Block.mantleOrCore → triggerAchievement(portalToNether)</pre>
 *
 * <p>The mantle block cannot itself be removed (unbreakable), so the
 * trigger reads the HARVESTED block's neighbours — a y&lt;6 dig exposing a
 * mantle face. The [DimLog] achievement row is the verdict channel.</p>
 */
public final class ETIMPortalTriggerFace {

    public static void check(World world, BlockPos pos, EntityPlayerMP player) {
        if (world.provider.getDimension() != ETIMDimensions.UNDERWORLD) {
            return;
        }
        if (isMantle(world, pos.add(0, 0, -1))
                || isMantle(world, pos.add(1, 0, 0))
                || isMantle(world, pos.add(0, 0, 1))
                || isMantle(world, pos.add(-1, 0, 0))) {
            ETIMDimensions.dimLog("achievement-portalToNether y=" + pos.getY()
                    + " x=" + pos.getX() + " z=" + pos.getZ());
            ETIMPortalTrigger.INSTANCE.grant(player);
        }
    }

    private static boolean isMantle(World world, BlockPos pos) {
        return world.getBlockState(pos).getBlock() == ETIMBlocks.MANTLE_OR_CORE;
    }

    private ETIMPortalTriggerFace() {
    }
}
