package io.github.etim.etim.item;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.block.Block;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.entity.item.EntityXPOrb;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.Explosion;
import net.minecraft.world.World;
import io.github.etim.etim.world.ExplosionGates;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * B-67 (F-4): R196 block drop chain for explosions.
 *
 * <p>Faces: Block.java:1882-1918 (explosion rewrite table), :1984-1992 (chance
 * modifiers), :2042-2057 (experience orbs), :2059-2093 (spawn point / pickup delay /
 * explosion motion). The chain is explosion-scoped on purpose: normal mining keeps the
 * 1.12 drop path (D-3 ruling covers the explosion chain).</p>
 *
 * <p>中文：爆炸专用掉落链——改写表、概率修正、经验球、落点与拾取延迟；普通采掘仍走 1.12
 * 原路径（D-3 裁定范围）。</p>
 */
public final class ETIMBlockDrops {

    private static final String TAG = "DropLog";
    private static final Random RAND = new Random();

    private ETIMBlockDrops() {
    }

    /** Entry point used by the explosion redirect. */
    public static void explosionDrops(World world, BlockPos pos, IBlockState state,
                                      double ex, double ey, double ez) {
        if (world.isRemote || state.getMaterial() == Material.AIR) {
            return;
        }
        Block block = state.getBlock();
        List<ItemStack> drops = new ArrayList<>();
        float chance = 1.0F;

        // R196 :1882-1918 explosion rewrite table.
        if (block == Blocks.BRICK_BLOCK) {
            drops.add(new ItemStack(Items.BRICK));
            chance = 1.5F;
        } else if (block == Blocks.COBBLESTONE || block == Blocks.MOSSY_COBBLESTONE) {
            drops.add(new ItemStack(Item.getItemFromBlock(Blocks.GRAVEL)));
        } else if (block == Blocks.LAPIS_BLOCK) {
            drops.add(new ItemStack(Items.DYE, 9, 4));
            chance = 0.5F;
        } else if (state.getMaterial() == Material.CLOTH) {
            drops.add(new ItemStack(Items.STRING));
        } else if (state.getMaterial() == Material.WOOD) {
            drops.add(new ItemStack(Items.STICK));
        } else if (block == Blocks.HARDENED_CLAY || block == Blocks.NETHERRACK) {
            // R196: nothing.
        } else if (block == Blocks.STONE) {
            drops.add(new ItemStack(Item.getItemFromBlock(Blocks.COBBLESTONE)));
        } else if (block == Blocks.COAL_BLOCK) {
            drops.add(new ItemStack(Items.COAL, 9));
            chance = 0.5F;
        } else {
            drops.addAll(block.getDrops(world, pos, state, 0));
            chance = ExplosionGates.chanceFor(chanceClass(state.getMaterial()));
        }

        int dropped = 0;
        for (ItemStack stack : drops) {
            if (stack.isEmpty()) {
                continue;
            }
            int kept = ExplosionGates.keep(stack.getCount(), chance, RAND::nextFloat);
            if (kept <= 0) {
                continue;
            }
            // R196 :2001-2040 — one EntityItem per surviving unit.
            for (int i = 0; i < kept; i++) {
                ItemStack out = stack.copy();
                out.setCount(1);
                spawn(world, pos, state, out, ex, ey, ez);
            }
            dropped += kept;
            row("boomdrop block=" + block.getRegistryName()
                    + " drop=" + stack.getItem().getRegistryName()
                    + " count=" + kept
                    + " chance=" + fmt(chance)
                    + " x=" + pos.getX() + " y=" + pos.getY() + " z=" + pos.getZ());
        }

        // R196 :2042-2057 — experience scales with the number of drops; lapis is exempt.
        boolean exempt = block == Blocks.LAPIS_BLOCK;
        int base = exempt ? 0 : block.getExpDrop(state, world, pos, 0);
        int xp = ExplosionGates.experience(base, dropped, exempt);
        row("xpcheck block=" + block.getRegistryName() + " base=" + base
                + " drops=" + dropped + " xp=" + xp + " exempt=" + exempt);
        if (xp > 0) {
            EntityXPOrb orb = new EntityXPOrb(world, pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D, xp);
            world.spawnEntity(orb);
            row("xp block=" + block.getRegistryName() + " xp=" + xp + " drops=" + dropped);
        }
    }

    /** R196 :1984-1992 — material class feeding {@link ExplosionGates#chanceFor}. */
    private static ExplosionGates.ChanceClass chanceClass(Material material) {
        if (material == Material.SNOW || material == Material.CRAFTED_SNOW || material == Material.GLASS) {
            return ExplosionGates.ChanceClass.FRAGILE;
        }
        if (material == Material.PLANTS || material == Material.CACTUS
                || material == Material.VINE || material == Material.CAKE) {
            return ExplosionGates.ChanceClass.INERT;
        }
        return ExplosionGates.ChanceClass.NORMAL;
    }

    /** R196 :350-356 + :2059-2093 — selected box × 0.5, pickup delay 10, explosion motion. */
    private static void spawn(World world, BlockPos pos, IBlockState state, ItemStack stack, double ex, double ey, double ez) {
        AxisAlignedBB box = state.getBlock().getBoundingBox(state, world, pos);
        double cx = (box.minX + box.maxX) * 0.5D;
        double cy = (box.minY + box.maxY) * 0.5D;
        double cz = (box.minZ + box.maxZ) * 0.5D;
        double hx = (box.maxX - box.minX) * 0.25D;
        double hy = (box.maxY - box.minY) * 0.25D;
        double hz = (box.maxZ - box.minZ) * 0.25D;
        AxisAlignedBB bounds = new AxisAlignedBB(cx - hx, cy - hy, cz - hz, cx + hx, cy + hy, cz + hz);
        double x = bounds.minX + RAND.nextDouble() * (bounds.maxX - bounds.minX);
        double y = bounds.minY + RAND.nextDouble() * (bounds.maxY - bounds.minY);
        double z = bounds.minZ + RAND.nextDouble() * (bounds.maxZ - bounds.minZ);
        EntityItem item = new EntityItem(world, x, y, z, stack);
        item.setPickupDelay(10);

        double dx = x - ex;
        double dy = y - ey;
        double dz = z - ez;
        double len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 1.0E-4D) {
            double speed = ExplosionGates.motionSpeed(RAND.nextFloat());
            item.motionX = dx / len * speed;
            item.motionY = dy / len * speed + 0.15D;
            item.motionZ = dz / len * speed;
        }
        world.spawnEntity(item);
        if (ETIMConfig.dropR196) {
            row("spawn block=" + state.getBlock().getRegistryName()
                    + " item=" + stack.getItem().getRegistryName()
                    + " delay=10 x=" + fmt(x) + " y=" + fmt(y) + " z=" + fmt(z));
        }
    }

    public static void row(String line) {
        ETIM.LOGGER.info("[{}] {} [server]", TAG, line);
    }

    private static String fmt(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }
}
