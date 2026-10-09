package io.github.etim.etim.mining;

import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.block.state.IBlockState;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

/**
 * Tree felling (ToolSuite 终审 §四;ItemInWorldManager.java:174-183): a broken
 * wood log with the felling enchant removes, straight up, as many further
 * wood logs as the enchant level — each layer independently through the
 * str>0 gate AND the tool-decay gates, exactly like an independent harvest.
 */
public final class ETIMTreeFelling {

    private ETIMTreeFelling() {
    }

    public static void fellUpwards(EntityPlayerMP player, World world, BlockPos start, IBlockState harvested) {
        ItemStack held = player.getHeldItemMainhand();
        int level = EnchantmentHelper.getEnchantmentLevel(ETIMEnchantments.TREE_FELLING, held);
        if (level <= 0 || !isLog(harvested)) {
            return;
        }
        BlockPos pos = start.up();
        for (int i = 0; i < level; i++) {
            IBlockState log = world.getBlockState(pos);
            if (!isLog(log)) {
                break;
            }
            if (!ETIMMining.canPlayerDamageBlock(player, log)) {
                break;
            }
            world.destroyBlock(pos, true);
            int decay = ETIMMining.getToolDecayFromBreakingBlock(player, log, world, pos);
            if (decay > 0) {
                held.damageItem(decay, player);
            }
            pos = pos.up();
        }
    }

    private static boolean isLog(IBlockState state) {
        String key = state.getBlock().getRegistryName().getPath();
        return key.equals("log") || key.equals("log2");
    }
}
