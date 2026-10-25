package io.github.etim.etim.world;

import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.event.world.BlockEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

import java.util.Random;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItems;

/**
 * underworld 二阶段 T9 — the R196 {@code BlockGravel.java:12-81} nugget
 * bypass (D-12), carried on the Forge {@code HarvestDropsEvent} (the 1.12
 * face for "the player harvested this block" — R196
 * {@code info.wasHarvestedByPlayer()}; the wasExploded face maps to
 * {@code harvester == null} and keeps the vanilla drop chain).
 *
 * <p>R196 gate verbatim: {@code nextInt(12 - fortune*2) > 2 → super}
 * (normal gravel); else the chain. The chain is the D-12 trim: the flint
 * face (2/3, R196 :30-39) keeps the vanilla FlINT (the 15/16 chip face is
 * dropped — no chip item), then the nugget ladder copper→silver→gold→
 * mithril→adamantium at 2/3 per rung; the three shard rungs (:47-51) are
 * DROPPED (no shard items). Tournament scoring / flintFinder achievement
 * are not ported (C2-5/C2-6, no 1.12 achievement face in ETIM).</p>
 */
@Mod.EventBusSubscriber(modid = ETIM.MOD_ID)
public final class ETIMGravelDrop {

    @SubscribeEvent
    public static void onHarvestDrops(BlockEvent.HarvestDropsEvent event) {
        if (event.getState().getBlock() != Blocks.GRAVEL) {
            return;
        }
        EntityPlayer harvester = event.getHarvester();
        if (harvester == null || event.isSilkTouching()) {
            // exploded / silk faces → the vanilla drop chain (R196 super face)
            return;
        }
        World world = event.getWorld();
        Random random = world.rand != null ? world.rand : new Random();
        int fortune = Math.min(event.getFortuneLevel(), 3);
        if (random.nextInt(12 - fortune * 2) > 2) {
            return; // R196 :25-27 — vanilla gravel face
        }
        event.getDrops().clear(); // the chain replaces the whole drop list
        ItemStack chain = gravelChain(random);
        if (chain != null) {
            event.getDrops().add(chain);
        }
        if (ETIMConfig.miningDebugLog && chain != null) {
            ETIM.LOGGER.info("[MiningLog] gravel-nugget ore=" + chain.getItem().getRegistryName()
                    + " fortune=" + fortune + " pos=" + event.getPos() + " [server]");
        }
    }

    /** R196 :29-56 (trim). Returns null when the face lands nothing. */
    private static ItemStack gravelChain(Random random) {
        if (random.nextInt(3) > 0) { // 2/3 — the flint face (:30-39), chip face dropped
            return new ItemStack(Items.FLINT, 1);
        }
        if (random.nextInt(3) > 0) { // copper nugget
            return new ItemStack(ETIMItems.nuggetCopper, 1);
        }
        if (random.nextInt(3) > 0) { // silver
            return new ItemStack(ETIMItems.nuggetSilver, 1);
        }
        if (random.nextInt(3) > 0) { // gold
            return new ItemStack(net.minecraft.init.Items.GOLD_NUGGET, 1);
        }
        if (random.nextInt(3) > 0) { // mithril (:52-53, after the shard rungs)
            return new ItemStack(ETIMItems.nuggetMithril, 1);
        }
        // adamantium — the trap rung (:54-55)
        return new ItemStack(ETIMItems.nuggetAdamantium, 1);
    }

    private ETIMGravelDrop() {
    }
}
