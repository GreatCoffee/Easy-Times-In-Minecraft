package io.github.etim.etim.world;

import net.minecraft.block.Block;
import net.minecraft.block.BlockFalling;
import net.minecraft.block.BlockHorizontal;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.tileentity.TileEntity;
import net.minecraft.tileentity.TileEntityChest;
import net.minecraft.tileentity.TileEntityMobSpawner;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraft.world.gen.feature.WorldGenerator;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMItems;

/**
 * underworld 二阶段 T7/T8 — the R196 {@code WorldGenDungeons.java} (232
 * lines) underworld transcription. The overworld dungeon face stays vanilla
 * 1.12 (LootTable); ONLY the underworld branch is ported (first-stage D-1
 * closed by the M4-12 carrier decision).
 *
 * <p>R196 value faces verbatim:</p>
 * <ul>
 *   <li>Cavity ({\code :80-136}): height 3, sides nextInt(2)+2; the floor
 *       row solid, the ceiling row solid + non-falling; the open-ends carve
 *       counter 1..5.</li>
 *   <li>Body ({\code :115-137}): floor 3/4 mossy cobblestone else
 *       cobblestone; interior air carve.</li>
 *   <li>Chest rolls ({\code :139-176}): 2 spots × 3 tries at wall-adjacent
 *       solid faces; loot = weighted table, 8 rolls, count min..max; the
 *       enchanted-book component (:168-170) rides the table as a row.</li>
 *   <li>Spawner ({\code :181-191}): underworld pick nextInt(6)==0 ? Guardian
 *       : Longdead (:199-202); judge row [SpawnLog] dungeon per landing.</li>
 * </ul>
 *
 * <p>D-11 chest ruling: the 23-row table drops the seven no-carrier rows
 * (bucket/coin/horseArmor/fishingRod ancient + four underworld records) —
 * items are NOT invented; the ancient-metal bow rides the vanilla Bow
 * (B2-9). Everything else R196 verbatim (nugget 1-4 w10 leading).</p>
 */
public class ETIMWorldGenDungeons extends WorldGenerator {

    @Override
    public boolean generate(World world, Random random, BlockPos pos) {
        int x = pos.getX(), y = pos.getY(), z = pos.getZ();
        byte var6 = 3; // :81
        int var7 = random.nextInt(2) + 2; // :82
        int var8 = random.nextInt(2) + 2; // :83
        int openEnds = 0;

        for (int var10 = x - var7 - 1; var10 <= x + var7 + 1; var10++) {
            for (int var11 = y - 1; var11 <= y + var6 + 1; var11++) {
                for (int var12 = z - var8 - 1; var12 <= z + var8 + 1; var12++) {
                    net.minecraft.block.material.Material var13 =
                            world.getBlockState(new BlockPos(var10, var11, var12)).getMaterial();
                    if (var11 == y - 1 && !var13.isSolid()) {
                        return false;
                    }
                    if (var11 == y + var6 + 1) {
                        if (!var13.isSolid()) {
                            return false;
                        }
                        if (world.getBlockState(new BlockPos(var10, var11, var12)).getBlock() instanceof BlockFalling) {
                            return false;
                        }
                    }
                    if ((var10 == x - var7 - 1 || var10 == x + var7 + 1
                            || var12 == z - var8 - 1 || var12 == z + var8 + 1)
                            && var11 == y
                            && world.isAirBlock(new BlockPos(var10, var11, var12))
                            && world.isAirBlock(new BlockPos(var10, var11 + 1, var12))) {
                        openEnds++;
                    }
                }
            }
        }
        if (openEnds < 1 || openEnds > 5) { // :115
            return false;
        }

        // body — floor 3/4 mossy, interior carve (:115-137)
        for (int var181 = x - var7 - 1; var181 <= x + var7 + 1; var181++) {
            for (int var11 = y + var6; var11 >= y - 1; var11--) {
                for (int var12 = z - var8 - 1; var12 <= z + var8 + 1; var12++) {
                    BlockPos at = new BlockPos(var181, var11, var12);
                    if (var181 != x - var7 - 1 && var11 != y - 1 && var12 != z - var8 - 1
                            && var181 != x + var7 + 1 && var11 != y + var6 + 1 && var12 != z + var8 + 1) {
                        world.setBlockToAir(at);
                    } else if (var11 >= 0 && !world.getBlockState(new BlockPos(var181, var11 - 1, var12)).getMaterial().isSolid()) {
                        world.setBlockToAir(at);
                    } else if (world.getBlockState(at).getMaterial().isSolid()) {
                        if (var11 == y - 1 && random.nextInt(4) != 0) {
                            world.setBlockState(at, Blocks.MOSSY_COBBLESTONE.getDefaultState(), 2 | 16);
                        } else {
                            world.setBlockState(at, Blocks.COBBLESTONE.getDefaultState(), 2 | 16);
                        }
                    }
                }
            }
        }

        // chest — 2 spots × 3 tries at wall-adjacent solid faces (:139-176)
        String chestNote = "no-chest";
        for (int spotRoll = 0; spotRoll < 2; spotRoll++) {
            for (int tryRoll = 0; tryRoll < 3; tryRoll++) {
                int cx = x + random.nextInt(var7 * 2 + 1) - var7;
                int cz = z + random.nextInt(var8 * 2 + 1) - var8;
                BlockPos spot = new BlockPos(cx, y, cz);
                if (!world.isAirBlock(spot)) {
                    continue;
                }
                EnumFacing wall = null;
                int solidNeighbors = 0;
                if (world.getBlockState(new BlockPos(cx - 1, y, cz)).getMaterial().isSolid()) {
                    solidNeighbors++;
                    wall = EnumFacing.EAST;
                }
                if (world.getBlockState(new BlockPos(cx + 1, y, cz)).getMaterial().isSolid()) {
                    solidNeighbors++;
                    wall = EnumFacing.WEST;
                }
                if (world.getBlockState(new BlockPos(cx, y, cz - 1)).getMaterial().isSolid()) {
                    solidNeighbors++;
                    wall = EnumFacing.SOUTH;
                }
                if (world.getBlockState(new BlockPos(cx, y, cz + 1)).getMaterial().isSolid()) {
                    solidNeighbors++;
                    wall = EnumFacing.NORTH;
                }
                if (solidNeighbors == 1 && wall != null) {
                    // :167 — chest metadata = facing the solid wall (direction face)
                    world.setBlockState(spot, Blocks.CHEST.getDefaultState()
                            .withProperty(BlockHorizontal.FACING, wall.getOpposite()), 2 | 16);
                    TileEntity te = world.getTileEntity(spot);
                    if (te instanceof TileEntityChest) {
                        loot((TileEntityChest) te, random, y);
                        chestNote = "chest";
                    }
                    break;
                }
            }
            if (chestNote == "chest") {
                break;
            }
        }

        // spawner (:181-191)
        ResourceLocation pick = pickMobSpawner(random);
        world.setBlockState(new BlockPos(x, y, z), Blocks.MOB_SPAWNER.getDefaultState(), 2 | 16);
        TileEntity te = world.getTileEntity(new BlockPos(x, y, z));
        if (te instanceof TileEntityMobSpawner) {
            ((TileEntityMobSpawner) te).getSpawnerBaseLogic().setEntityId(pick);
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[SpawnLog] dungeon x=" + x + " y=" + y + " z=" + z
                    + " spawner=" + pick.getPath() + " " + chestNote + " [server]");
        }
        return true;
    }

    /** R196 :199-202 — underworld pick ONLY (the danger-ladder face is
     * overworld vanilla content and stays vanilla). */
    private ResourceLocation pickMobSpawner(Random random) {
        boolean guardian = random.nextInt(6) == 0;
        return new ResourceLocation(ETIM.MOD_ID, guardian ? "longdead_guardian" : "longdead");
    }

    // ------------------------------------------------------------------
    // T8 — the weighted chest table (R196 :49-73, D-11 trimmed)
    // ------------------------------------------------------------------

    /** One weighted loot row — count roll lives at the pick time. */
    private static final class ChestContent {
        final ItemStack stack;
        final int min;
        final int max;
        final int weight;

        ChestContent(ItemStack stack, int min, int max, int weight) {
            this.stack = stack;
            this.min = min;
            this.max = max;
            this.weight = weight;
        }
    }

    /** R196 WorldGenDungeons.java:49-73 minus the D-11 dropped rows. */
    private static final ChestContent[] UNDERWORLD_CHEST = {
            table(ETIMItems.nuggetAncientMetal, 1, 4, 10),
            table(ETIMItems.ingotAncientMetal, 1, 4, 10),
            table(new ItemStack(Items.GUNPOWDER), 1, 4, 10),
            table(new ItemStack(Items.STRING), 1, 4, 10),
            table(new ItemStack(Items.BOWL), 1, 1, 3), // :54 bowlEmpty
            table(new ItemStack(Items.NAME_TAG), 1, 1, 2), // :61
            // ancient metal tools/armor (ETIM gear carriers, B2 metal names)
            table(gear("pickaxe_ancient_metal"), 1, 1, 2),
            table(gear("shovel_ancient_metal"), 1, 1, 2),
            table(gear("dagger_ancient_metal"), 1, 1, 2),
            table(gear("sword_ancient_metal"), 1, 1, 2),
            // :68 bowAncientMetal — the vanilla bow rides in (B2-9)
            table(new ItemStack(Items.BOW), 1, 1, 2),
            // :69-72 the four chain armor pieces (handled by gear() name walk)
            table(gear("chain_boots_ancient_metal"), 1, 1, 2),
            table(gear("chain_leggings_ancient_metal"), 1, 1, 2),
            table(gear("chain_chestplate_ancient_metal"), 1, 1, 2),
            table(gear("chain_helmet_ancient_metal"), 1, 1, 2),
            // the vanilla underworld records have no 1.12 carriers (deleted rows,
            // plus bucket/coin/horseArmor/fishingRod ancient — D-11, not invented)
            // :169 — the enchanted-book component rides as a last row.
            table(enchantedBookLoot(), 1, 1, 1),
    };

    private static ChestContent table(ItemStack stack, int min, int max, int weight) {
        return new ChestContent(stack, min, max, weight);
    }

    private static ChestContent table(Item item, int min, int max, int weight) {
        return new ChestContent(new ItemStack(item, 1), min, max, weight);
    }

    private static ItemStack gear(String name) {
        Item item = net.minecraftforge.fml.common.registry.ForgeRegistries.ITEMS
                .getValue(new ResourceLocation(ETIM.MOD_ID, name));
        return item != null ? new ItemStack(item, 1) : new ItemStack(Items.STICK, 1);
    }

    private static ItemStack enchantedBookLoot() {
        // functional min face — R196 rolls the book component each pick anyway;
        // the level pool mirrors the 1.12 vanilla 5-level enchantability face.
        ItemStack book = new ItemStack(Items.BOOK);
        return net.minecraft.enchantment.EnchantmentHelper.addRandomEnchantment(
                new Random(), book, 5, false);
    }

    /** R196 WeightedRandomChestContent.generateChestContents(world, y, rand,
     * rows, chest, 8, null) — the 8-roll face with its own sampling. */
    private static void loot(TileEntityChest chest, Random random, int y) {
        int total = 0;
        for (ChestContent row : UNDERWORLD_CHEST) {
            total += row.weight;
        }
        List<Integer> emptySlots = new ArrayList<>();
        for (int roll = 0; roll < 8; roll++) {
            int pick = random.nextInt(total);
            ChestContent chosen = UNDERWORLD_CHEST[UNDERWORLD_CHEST.length - 1];
            for (ChestContent candidate : UNDERWORLD_CHEST) {
                pick -= candidate.weight;
                if (pick < 0) {
                    chosen = candidate;
                    break;
                }
            }
            ItemStack stack = chosen.stack.copy();
            int count = chosen.min == chosen.max ? chosen.min
                    : chosen.min + random.nextInt(chosen.max - chosen.min + 1);
            stack.setCount(count);
            emptySlots.clear();
            for (int i = 0; i < chest.getSizeInventory(); i++) {
                if (chest.getStackInSlot(i).isEmpty()) {
                    emptySlots.add(i);
                }
            }
            if (!emptySlots.isEmpty()) {
                chest.setInventorySlotContents(
                        emptySlots.get(random.nextInt(emptySlots.size())), stack);
            }
        }
        if (ETIMConfig.metalDebugLog) {
            ETIM.LOGGER.info("[TestLog] dungeon-chest y=" + y + " rolls=8 rows="
                    + UNDERWORLD_CHEST.length + " [server]");
        }
    }
}
