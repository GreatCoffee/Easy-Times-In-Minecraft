package io.github.etim.etim.item;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.init.Blocks;
import net.minecraft.item.Item;
import net.minecraft.item.ItemBlock;
import net.minecraftforge.fml.common.registry.ForgeRegistries;

/**
 * R196 {@code Block.java:1000} — every block item defaults to a stack size of
 * 4 (census F :87):
 *
 * <ul>
 *   <li>field {@code private int max_stack_size = 4;} (:1000), read by
 *       {@code getItemStackLimit} (:2588-2595) and copied onto the block item
 *       at {@code Block.java:3368};</li>
 *   <li>explicit 4 overrides at {@code Block.java:297}, {@code :626},
 *       {@code BlockCauldron.java:12}, {@code BlockOreStorage.java:8},
 *       {@code BlockPoweredOre.java:7};</li>
 *   <li>anvil is the one 1-stack exception — {@code BlockAnvil.java:19}
 *       {@code setMaxStackSize(1)}.</li>
 * </ul>
 *
 * <p>This pass runs once after item registration. Every 1.12 {@link ItemBlock}
 * whose limit is greater than 1 is pinned to 4 (B-64's default-16 pass already
 * moved vanilla items off 64, so a plain {@code == 64} test would never fire),
 * then the anvil exception is applied.</p>
 */
public final class ETIMBlockStacks {

    private ETIMBlockStacks() {
    }

    public static void apply() {
        if (!ETIMConfig.blockR196Face) {
            return;
        }
        int changed = 0;
        for (Block block : ForgeRegistries.BLOCKS) {
            Item item = Item.getItemFromBlock(block);
            if (!(item instanceof ItemBlock || item instanceof net.minecraft.item.ItemBlockSpecial)
                    || item.getRegistryName() == null) {
                continue;
            }
            if (item.getItemStackLimit() > 1) {
                item.setMaxStackSize(4);
                changed++;
            }
        }
        Item anvil = Item.getItemFromBlock(Blocks.ANVIL);
        if (anvil != null) {
            anvil.setMaxStackSize(1);
        }
        // B-71: the R196 berry bush is the stack-8 exception (BlockGrowingPlant :15).
        Item bush = Item.getItemFromBlock(io.github.etim.etim.farm.ETIMFarmBlocks.BUSH);
        if (bush != null) {
            bush.setMaxStackSize(8);
        }
        // 1.12 does not put ItemBlockSpecial into Block.blockToItemMap, so the
        // block loop above cannot reach cauldron / brewing stand. Sweep items.
        for (Item item : ForgeRegistries.ITEMS) {
            if (item instanceof net.minecraft.item.ItemBlockSpecial && item.getItemStackLimit() > 1) {
                item.setMaxStackSize(4);
                changed++;
            }
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[BlockFaceLog] stack4 applied blocks={} anvil=1 [server]", changed);
        }
    }
}
