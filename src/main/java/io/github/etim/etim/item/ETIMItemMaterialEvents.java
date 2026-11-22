package io.github.etim.etim.item;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.init.Blocks;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import java.util.Locale;

/**
 * R196 dropped-item material faces (census F :92):
 *
 * <ul>
 *   <li>{@code EntityItem.java:389-391} — a fire-damaged item whose material
 *       {@code canDouseFire} is consumed by the fire (the ice/snow family);
 *       R196 also calls {@code world.douseFire(...)} at :342-345.</li>
 *   <li>{@code EntityItem.java:292-297} — a dropped stack whose material
 *       {@code dissolvesInWater} takes 1.0 melt damage every 20 ticks; when
 *       the stack dies the vanish particle fires.</li>
 * </ul>
 *
 * <p>1.12 has neither carrier. Both arms run in the dropped-item tick hook
 * ({@code MixinEntityItem.onUpdate} TAIL) and are gated by
 * {@code blockR196Face}.</p>
 */
public final class ETIMItemMaterialEvents {

    private static final int DISSOLVE_STEP_TICKS = 20;
    private static final int DISSOLVE_STEPS = 5;

    private ETIMItemMaterialEvents() {
    }

    public static void tickDropped(EntityItem entity) {
        if (!ETIMConfig.blockR196Face) {
            return;
        }
        World world = entity.world;
        if (world.isRemote || entity.isDead) {
            return;
        }
        ItemStack stack = entity.getItem();
        if (stack.isEmpty()) {
            return;
        }
        ETIMMaterialTraits.Trait trait = ETIMMaterialTraits.ofItem(stack);
        BlockPos pos = new BlockPos(entity);
        if (trait.canDouseFire && world.getBlockState(pos).getBlock() == Blocks.FIRE) {
            world.setBlockToAir(pos);
            world.playSound(null, pos, SoundEvents.BLOCK_FIRE_EXTINGUISH, SoundCategory.BLOCKS,
                    0.5F, 2.6F + (world.rand.nextFloat() - world.rand.nextFloat()) * 0.8F);
            world.spawnParticle(EnumParticleTypes.SMOKE_LARGE,
                    entity.posX, entity.posY + 0.2D, entity.posZ, 0.0D, 0.1D, 0.0D);
            row("douse item=" + stack.getItem().getRegistryName() + " pos="
                    + pos.getX() + "," + pos.getY() + "," + pos.getZ() + " entity="
                    + entity.getEntityId());
            entity.setDead();
            return;
        }
        if (!trait.dissolvesInWater() || !entity.isInWater()) {
            return;
        }
        if (entity.ticksExisted % DISSOLVE_STEP_TICKS != 0) {
            return;
        }
        int step = entity.getEntityData().getInteger("etimDissolve") + 1;
        entity.getEntityData().setInteger("etimDissolve", step);
        world.spawnParticle(EnumParticleTypes.WATER_BUBBLE,
                entity.posX, entity.posY + 0.1D, entity.posZ, 0.0D, 0.05D, 0.0D);
        if (step >= DISSOLVE_STEPS) {
            entity.setDead();
            world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL,
                    entity.posX, entity.posY + 0.1D, entity.posZ, 0.0D, 0.05D, 0.0D);
            row("dissolve item=" + stack.getItem().getRegistryName() + " steps=" + step
                    + " left=" + stack.getCount() + " entity=" + entity.getEntityId());
            return;
        }
        if (ETIMConfig.mobDebugLog) {
            row("dissolvestep item=" + stack.getItem().getRegistryName() + " step=" + step);
        }
    }

    /** Shared [BlockFaceLog] row; floats use Locale.ROOT. */
    public static void row(String line) {
        ETIM.LOGGER.info("[BlockFaceLog] {} [server]", line);
    }

    public static String fmt(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }

    /** The eight axes of a stack, for the /etest probe. */
    public static String describe(ItemStack stack) {
        if (stack.isEmpty()) {
            return "item=air";
        }
        ETIMMaterialTraits.Trait trait = ETIMMaterialTraits.ofItem(stack);
        return "item=" + stack.getItem().getRegistryName()
                + " fire=" + trait.harmedByFire
                + " pepsin=" + trait.harmedByPepsin
                + " acid=" + trait.harmedByAcid
                + " douse=" + trait.canDouseFire
                + " dissolve=" + trait.dissolvesInWater()
                + " catch=" + trait.canCatchFire
                + " fuel=" + trait.canBurnAsFuel
                + " replace=" + trait.isReplaceable;
    }

    /** Block-face describe helper (default state). */
    public static String describe(Block block) {
        ETIMMaterialTraits.Trait trait = ETIMMaterialTraits.ofBlock(block.getDefaultState());
        return "block=" + block.getRegistryName()
                + " fire=" + trait.harmedByFire
                + " pepsin=" + trait.harmedByPepsin
                + " acid=" + trait.harmedByAcid
                + " douse=" + trait.canDouseFire
                + " dissolve=" + trait.dissolvesInWater()
                + " catch=" + trait.canCatchFire
                + " fuel=" + trait.canBurnAsFuel
                + " replace=" + trait.isReplaceable;
    }
}
