package io.github.etim.etim.item;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.block.BlockVine;
import net.minecraft.block.properties.PropertyBool;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.item.ItemBlock;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;
import net.minecraft.world.World;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.fml.common.eventhandler.Event;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * R196 {@code Item.java:1820-1893} {@code tryPlaceAsBlock}, vine branch
 * (census F :150): clicking a SINGLE-FACE vine with a placeable block puts the
 * block into the vine's own cell using the vine's attachment face as the
 * placement side, instead of 1.12's "whatever face you clicked" rule. The
 * support block behind the vine must exist, matching R196's
 * {@code getNeighborBlock(x, y, z, face.getOpposite()) != null} gate.
 *
 * <p>R196's other three gates (tournament safety zone, sandstone-in-desert,
 * {@code BlockMounted}) have no 1.12 counterpart in ETIM yet and are recorded
 * as C in the 摸底 (D-5 = vine only).</p>
 */
public final class ETIMVinePlace {

    @SubscribeEvent
    public void onRightClickBlock(PlayerInteractEvent.RightClickBlock event) {
        if (!ETIMConfig.itemsVinePlaceR196 || event.getWorld().isRemote) {
            return;
        }
        EntityPlayer player = event.getEntityPlayer();
        if (player == null) {
            return;
        }
        BlockPos pos = event.getPos();
        EnumFacing face = singleFace(event.getWorld().getBlockState(pos));
        if (face == null) {
            return;
        }
        Vec3d hit = event.getHitVec();
        IBlockState placed = placeInto(event.getWorld(), pos, face, player, event.getItemStack(),
                (float) (hit.x - pos.getX()), (float) (hit.y - pos.getY()), (float) (hit.z - pos.getZ()), true);
        if (placed == null) {
            return;
        }
        event.setUseItem(Event.Result.DENY);
        event.setUseBlock(Event.Result.DENY);
        event.setCanceled(true);
    }

    /**
     * The shared placement body — the event path and {@code /etest vineplace}
     * both run through here, so the command exercises the same rules.
     *
     * @return the placed state, or null when a gate rejected the placement
     */
    public static IBlockState placeInto(World world, BlockPos pos, EnumFacing face, EntityPlayer player,
                                        ItemStack held, float hitX, float hitY, float hitZ, boolean consume) {
        if (!ETIMConfig.itemsVinePlaceR196) {
            return null;
        }
        IBlockState vine = world.getBlockState(pos);
        if (vine.getBlock() != Blocks.VINE) {
            return null;
        }
        if (held.isEmpty() || !(held.getItem() instanceof ItemBlock)) {
            return null;
        }
        if (world.isAirBlock(pos.offset(face))) {
            return null; // R196: the supporting neighbour must exist
        }
        ItemBlock itemBlock = (ItemBlock) held.getItem();
        Block block = itemBlock.getBlock();
        if (!block.isReplaceable(world, pos) && !vine.getBlock().isReplaceable(world, pos)) {
            return null;
        }
        if (!player.canPlayerEdit(pos, face, held)) {
            return null;
        }
        int meta = itemBlock.getMetadata(held.getMetadata());
        IBlockState placed = block.getStateForPlacement(world, pos, face, hitX, hitY, hitZ, meta, player,
                net.minecraft.util.EnumHand.MAIN_HAND);
        if (placed == null || !placed.getBlock().canPlaceBlockAt(world, pos)) {
            return null;
        }
        if (!world.setBlockState(pos, placed, 11)) {
            return null;
        }
        block.onBlockPlacedBy(world, pos, placed, player, held);
        world.playSound(null, pos, block.getSoundType(placed, world, pos, null).getPlaceSound(),
                SoundCategory.BLOCKS, 1.0F, 0.8F);
        if (consume && !player.capabilities.isCreativeMode) {
            held.shrink(1);
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[ItemLog] vineplace face={} block={} at {}, {}, {} player={} [server]",
                    face, block.getRegistryName(), pos.getX(), pos.getY(), pos.getZ(), player.getName());
        }
        return placed;
    }

    /** Exactly one horizontal face set -> that direction; anything else null. */
    public static EnumFacing singleFace(IBlockState state) {
        if (state.getBlock() != Blocks.VINE) {
            return null;
        }
        EnumFacing found = null;
        for (EnumFacing side : new EnumFacing[]{EnumFacing.NORTH, EnumFacing.EAST, EnumFacing.SOUTH, EnumFacing.WEST}) {
            if (state.getValue(propertyOf(side))) {
                if (found != null) {
                    return null;
                }
                found = side;
            }
        }
        return found;
    }

    private static PropertyBool propertyOf(EnumFacing side) {
        switch (side) {
            case NORTH:
                return BlockVine.NORTH;
            case EAST:
                return BlockVine.EAST;
            case SOUTH:
                return BlockVine.SOUTH;
            default:
                return BlockVine.WEST;
        }
    }
}
