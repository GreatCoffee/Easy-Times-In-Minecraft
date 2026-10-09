package io.github.etim.etim.mining;

import io.github.etim.etim.Tags;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * Task 2.2 drop gate: vanilla 1.12 decides drops via the item/tool check;
 * R196 replaces the predicate with {@code str > 0}
 * (ItemInWorldManager.tryHarvestBlock, 掉落门控 pre-核 §四.4.2). The Forge
 * {@code HarvestCheck} event is the player-side consumer of that predicate,
 * so registering here pipes the R196 verdict into the vanilla drop path
 * without a second mixin.
 *
 * <p>The strict "no str → no breaking at all" behaviour currently comes from
 * the progress formula (str 0 → progress 0, see {@link ETIMMining}); whether
 * R196 additionally decays such blocks without drops is the audit session's
 * remaining verdict (追加任务 4 P1) and will land on this gate.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class ETIMMiningEvents {

    private ETIMMiningEvents() {
    }

    @SubscribeEvent
    public static void onHarvestCheck(PlayerEvent.HarvestCheck event) {
        if (!ETIMConfig.miningReform || event.getEntityPlayer().capabilities.isCreativeMode) {
            return;
        }
        event.setCanHarvest(ETIMMining.canPlayerDamageBlock(event.getEntityPlayer(), event.getTargetBlock()));
    }

    /**
     * Post-harvest chain from the server mixin (PlayerInteractionManager
     * tryHarvestBlock TAIL): the tree-felling recursion first (so undermining
     * scans run on the final state after logs came off), then the underminable
     * neighbour plane (up + four horizontal).
     */
    public static void postHarvest(World world, BlockPos pos, IBlockState harvested, EntityPlayerMP player) {
        ETIMTreeFelling.fellUpwards(player, world, pos, harvested);
        ETIMUndermine.undermineAround(world, pos, player);
    }
}
